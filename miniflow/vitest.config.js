import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Stop Vite from discovering the parent repo's postcss.config.mjs —
  // MiniFlow has no CSS pipeline.
  css: { postcss: {} },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
