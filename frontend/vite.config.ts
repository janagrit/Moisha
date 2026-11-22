import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import {
  ingestAirbnbListingFromUrl,
  fetchSingleCompetitorFromUrl,
  checkLivePricesForProperty,
} from './server/airbnbExtractor';
import type { PropertyType } from './types';

const MAX_BODY_BYTES = 64 * 1024;
const UPSTREAM_TIMEOUT_MS = 15_000;

class PayloadTooLargeError extends Error {}

function readRequestBodyBounded(req: IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    req.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        req.destroy();
        reject(new PayloadTooLargeError('Request payload exceeds limit'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function isSameOriginDevRequest(req: IncomingMessage): boolean {
  const secFetchSite = req.headers['sec-fetch-site'];
  if (
    typeof secFetchSite === 'string' &&
    secFetchSite !== 'same-origin' &&
    secFetchSite !== 'none'
  ) {
    return false;
  }
  const origin = req.headers.origin;
  if (typeof origin === 'string') {
    try {
      const parsed = new URL(origin);
      return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    } catch {
      return false;
    }
  }
  return true;
}

function moishaDevMiddleware(): Plugin {
  let apiKey = '';
  let preferredModel = 'gemini-2.5-flash';

  return {
    name: 'moisha-dev-middleware',
    configResolved(config) {
      const rootDir = path.resolve(config.root, '..');
      const rootEnv = loadEnv(config.mode, rootDir, '');
      const localEnv = loadEnv(config.mode, config.root, '');
      apiKey = (
        localEnv.GEMINI_API_KEY ||
        rootEnv.GEMINI_API_KEY ||
        localEnv.API_KEY ||
        rootEnv.API_KEY ||
        ''
      ).trim();
      preferredModel = (
        localEnv.GEMINI_MODEL ||
        rootEnv.GEMINI_MODEL ||
        'gemini-2.5-flash'
      ).trim();
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url || '';
        const [pathname, queryStr] = rawUrl.split('?');

        // 1. One-Link Full Airbnb Listing + Neighborhood Competitor Auto-Ingestion
        if (pathname === '/api/airbnb/ingest' && req.method === 'GET') {
          if (!isSameOriginDevRequest(req)) {
            sendJson(res, 403, { ok: false, error: 'Forbidden' });
            return;
          }
          const params = new URLSearchParams(queryStr || '');
          const targetUrl = params.get('url') || '';
          try {
            const result = await ingestAirbnbListingFromUrl(targetUrl);
            sendJson(res, 200, result);
          } catch {
            sendJson(res, 200, {
              ok: false,
              code: 'UPSTREAM_UNAVAILABLE',
              error: 'Unable to reach Airbnb right now.',
            });
          }
          return;
        }

        // 2. One-Link Single Competitor Auto-Extraction
        if (pathname === '/api/airbnb/competitor' && req.method === 'GET') {
          if (!isSameOriginDevRequest(req)) {
            sendJson(res, 403, { ok: false, error: 'Forbidden' });
            return;
          }
          const params = new URLSearchParams(queryStr || '');
          const targetUrl = params.get('url') || '';
          try {
            const result = await fetchSingleCompetitorFromUrl(targetUrl);
            sendJson(res, 200, result);
          } catch {
            sendJson(res, 200, { ok: false, error: 'Unable to fetch listing details.' });
          }
          return;
        }

        // 3. Live Competitor Price Check Endpoint
        if (pathname === '/api/airbnb/check' && req.method === 'POST') {
          if (!isSameOriginDevRequest(req)) {
            sendJson(res, 403, { ok: false });
            return;
          }
          try {
            const bodyRaw = await readRequestBodyBounded(req, MAX_BODY_BYTES);
            const payload = JSON.parse(bodyRaw) as {
              latitude?: number | null;
              longitude?: number | null;
              city?: string;
              state?: string;
              propertyType?: PropertyType;
              bedrooms?: number;
              competitors?: Array<{ id: string; airbnbRoomId: string | null }>;
            };
            const observedById = await checkLivePricesForProperty({
              latitude: typeof payload.latitude === 'number' ? payload.latitude : null,
              longitude: typeof payload.longitude === 'number' ? payload.longitude : null,
              city: typeof payload.city === 'string' ? payload.city : '',
              state: typeof payload.state === 'string' ? payload.state : '',
              propertyType: payload.propertyType || 'entire_home',
              bedrooms: typeof payload.bedrooms === 'number' ? payload.bedrooms : 1,
              competitors: Array.isArray(payload.competitors) ? payload.competitors : [],
            });
            sendJson(res, 200, { ok: true, observedById });
          } catch {
            sendJson(res, 200, { ok: false, observedById: {} });
          }
          return;
        }

        // Legacy lightweight preview endpoint (kept for backwards compatibility)
        if (pathname === '/api/listing-preview' && req.method === 'GET') {
          if (!isSameOriginDevRequest(req)) {
            sendJson(res, 403, { extracted: false });
            return;
          }
          const params = new URLSearchParams(queryStr || '');
          const targetUrl = params.get('url') || '';
          let parsedTarget: URL;
          try {
            parsedTarget = new URL(targetUrl);
          } catch {
            sendJson(res, 400, { extracted: false });
            return;
          }
          const roomMatch = parsedTarget.pathname.match(/^\/rooms\/(\d+)/);
          if (
            parsedTarget.protocol !== 'https:' ||
            !/^([a-z0-9-]+\.)?airbnb\.[a-z.]{2,6}$/i.test(parsedTarget.hostname) ||
            !roomMatch
          ) {
            sendJson(res, 400, { extracted: false });
            return;
          }

          const single = await fetchSingleCompetitorFromUrl(targetUrl);
          if (!single.ok) {
            sendJson(res, 200, { extracted: false });
            return;
          }
          sendJson(res, 200, {
            extracted: true,
            name: single.competitor.name,
            photoUrl: single.competitor.photoUrl,
            bedrooms: single.competitor.bedrooms,
            bathrooms: single.competitor.bathrooms,
            guestCapacity: single.competitor.guestCapacity,
            nightlyPrice: single.competitor.nightlyPrice,
          });
          return;
        }

        if (pathname === '/api/gemini/status' && req.method === 'GET') {
          sendJson(res, 200, { available: Boolean(apiKey), model: preferredModel });
          return;
        }

        if (pathname === '/api/gemini/generate' && req.method === 'POST') {
          if (!isSameOriginDevRequest(req)) {
            sendJson(res, 403, { error: 'Cross-origin requests are not permitted' });
            return;
          }

          const contentType = req.headers['content-type'] || '';
          if (!contentType.toLowerCase().includes('application/json')) {
            sendJson(res, 415, { error: 'Content-Type must be application/json' });
            return;
          }

          if (!apiKey) {
            sendJson(res, 503, { error: 'GEMINI_API_KEY is not configured in .env' });
            return;
          }

          try {
            const rawBody = await readRequestBodyBounded(req, MAX_BODY_BYTES);
            let parsedPayload: unknown;
            try {
              parsedPayload = JSON.parse(rawBody);
            } catch {
              sendJson(res, 400, { error: 'Invalid JSON request body' });
              return;
            }
            if (
              !parsedPayload ||
              typeof parsedPayload !== 'object' ||
              !Array.isArray((parsedPayload as { contents?: unknown }).contents)
            ) {
              sendJson(res, 400, { error: 'Request body must include contents array' });
              return;
            }

            const serialized = JSON.stringify(parsedPayload);
            const modelsToTry = Array.from(
              new Set([preferredModel, 'gemini-2.5-flash', 'gemini-2.0-flash']),
            );
            let lastStatus = 502;
            let lastText = '';

            for (const model of modelsToTry) {
              const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
              const upstream = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: serialized,
                signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
              });
              lastStatus = upstream.status;
              lastText = await upstream.text();
              if (upstream.ok) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(lastText);
                return;
              }
              if (upstream.status !== 404) {
                break;
              }
            }

            sendJson(res, lastStatus, {
              error: 'Upstream Gemini request failed',
              details: lastText.slice(0, 300),
            });
          } catch (err) {
            if (err instanceof PayloadTooLargeError) {
              sendJson(res, 413, { error: 'Request payload too large' });
              return;
            }
            sendJson(res, 500, {
              error: err instanceof Error ? err.message : 'Unknown proxy error',
            });
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), moishaDevMiddleware()],
  test: {
    environment: 'jsdom',
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**'],
    restoreMocks: true,
  },
});
