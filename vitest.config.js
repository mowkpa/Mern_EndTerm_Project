import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['./tests/setup.js'],
    fileParallelism: false, // run test files sequentially to prevent DB port conflicts
  },
});
