import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths so the build works under a GitHub Pages subpath (/<repo>/).
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**'],
    restoreMocks: true,
  },
});
