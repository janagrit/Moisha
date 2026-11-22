import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

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
  if (typeof secFetchSite === 'string' && secFetchSite !== 'same-origin' && secFetchSite !== 'none') {
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

function extractMetaContent(html: string, prop: string): string | null {
  const re1 = new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i');
  const match = html.match(re1) || html.match(re2);
  if (!match?.[1]) return null;
  return match[1]
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .trim();
}

function parseAirbnbOgSummary(text: string): {
  bedrooms: number | null;
  bathrooms: number | null;
  guestCapacity: number | null;
} {
  const bedMatch = text.match(/(\d+)\s*bedroom/i);
  const bathMatch = text.match(/(\d+(?:\.\d+)?)\s*bath/i);
  const guestMatch = text.match(/(\d+)\s*guest/i);
  return {
    bedrooms: bedMatch ? Number(bedMatch[1]) : null,
    bathrooms: bathMatch ? Number(bathMatch[1]) : null,
    guestCapacity: guestMatch ? Number(guestMatch[1]) : null,
  };
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

          // Strict SSRF allowlist: only public https://www.airbnb.com/rooms/<digits>
          const roomMatch = parsedTarget.pathname.match(/^\/rooms\/(\d+)/);
          if (
            parsedTarget.protocol !== 'https:' ||
            (parsedTarget.hostname !== 'www.airbnb.com' && parsedTarget.hostname !== 'airbnb.com') ||
            !roomMatch
          ) {
            sendJson(res, 400, { extracted: false });
            return;
          }

          try {
            const upstream = await fetch(`https://www.airbnb.com/rooms/${roomMatch[1]}`, {
              method: 'GET',
              redirect: 'follow',
              headers: {
                Accept: 'text/html',
                'Accept-Language': 'en-US,en;q=0.9',
              },
              signal: AbortSignal.timeout(3_500),
            });
            if (!upstream.ok) {
              sendJson(res, 200, { extracted: false });
              return;
            }
            const html = (await upstream.text()).slice(0, 200_000);
            const ogTitle = extractMetaContent(html, 'og:title');
            const ogDesc = extractMetaContent(html, 'og:description') || '';
            const ogImage = extractMetaContent(html, 'og:image');
            const details = parseAirbnbOgSummary(`${ogTitle || ''} ${ogDesc}`);
            const cleanName = ogTitle ? ogTitle.split('·')[0].replace(/\s*-\s*Airbnb.*$/i, '').trim() : null;

            sendJson(res, 200, {
              extracted: Boolean(cleanName || ogImage),
              name: cleanName || null,
              photoUrl: ogImage && /^https:\/\//i.test(ogImage) ? ogImage : null,
              ...details,
            });
          } catch {
            sendJson(res, 200, { extracted: false });
          }
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
