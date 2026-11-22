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

function moishaGeminiDevProxy(): Plugin {
  let apiKey = '';
  let preferredModel = 'gemini-2.5-flash';

  return {
    name: 'moisha-gemini-dev-proxy',
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
        const url = req.url?.split('?')[0] || '';
        if (url === '/api/gemini/status' && req.method === 'GET') {
          sendJson(res, 200, { available: Boolean(apiKey), model: preferredModel });
          return;
        }

        if (url === '/api/gemini/generate' && req.method === 'POST') {
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
  // Relative asset paths so the build works under a GitHub Pages subpath (/<repo>/).
  base: './',
  plugins: [react(), moishaGeminiDevProxy()],
  test: {
    environment: 'jsdom',
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**'],
    restoreMocks: true,
  },
});
