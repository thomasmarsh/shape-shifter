import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
  // Test files share a worker's modules (no isolation): each file still builds
  // its own World, but three.js and the engine are imported once per worker.
  test: { pool: 'forks', isolate: false },
});
