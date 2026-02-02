import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', '.next'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 10000,
    // Run test files sequentially to avoid DB conflicts in integration tests
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['server/**/*.ts', 'db/**/*.ts'],
      exclude: ['**/*.test.ts', '**/node_modules/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/server': path.resolve(__dirname, './server'),
      '@/db': path.resolve(__dirname, './db'),
    },
  },
});
