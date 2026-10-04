import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
  // Test files share a worker's modules (no isolation): each file still builds
  // its own World, but three.js and the engine are imported once per worker.
  // Some physics sweeps take 7s when the whole suite runs in parallel, so the
  // 5s default flakes on busy machines and CI runners.
  test: { pool: 'forks', isolate: false, testTimeout: 30_000 },
});
