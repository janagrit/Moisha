import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The demo is a different program, not a setting: its build never includes App.tsx.
const isDemo = process.env.VITE_APP_MODE === 'demo';
const outDir = isDemo ? 'dist-demo' : 'dist';
const rootApp = fileURLToPath(new URL(isDemo ? './DemoApp.tsx' : './App.tsx', import.meta.url));

/** Removes everything installable from the public demo and forbids it any network connection. */
function demoOutput(): Plugin {
  return {
    name: 'moisha-demo-output',
    transformIndexHtml: (html) =>
      html
        .replace(/\s*<link rel="manifest"[^>]*>/, '')
        .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, '')
        .replace(/\s*<link rel="icon"[^>]*>/, '')
        .replace('<title>Moisha</title>', '<title>Moisha demo</title>'),
    closeBundle() {
      const dist = fileURLToPath(new URL(`./${outDir}/`, import.meta.url));
      // No manifest, and no mascot images until the logo and usage rights are settled.
      for (const file of ['manifest.webmanifest', 'icon-192.png', 'icon-512.png']) {
        fs.rmSync(path.join(dist, file), { force: true });
      }
      const headersFile = path.join(dist, '_headers');
      fs.writeFileSync(headersFile, fs.readFileSync(headersFile, 'utf8').replace("connect-src 'self'", "connect-src 'none'"));
    },
  };
}

export default defineConfig({
  // Relative asset paths so the build works at a site root or under a subpath.
  base: './',
  build: { outDir, sourcemap: false },
  resolve: { alias: { '@moisha-root': rootApp } },
  plugins: [
    react(),
    isDemo
      ? demoOutput()
      : VitePWA({
          strategies: 'injectManifest',
          srcDir: '.',
          filename: 'sw.ts',
          injectRegister: false,
          manifest: false,
          injectManifest: {
            globPatterns: ['**/*.{js,css,html,png,woff2,webmanifest}'],
          },
        }),
  ],
  test: {
    environment: 'jsdom',
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', 'dist-demo/**'],
    restoreMocks: true,
  },
});
