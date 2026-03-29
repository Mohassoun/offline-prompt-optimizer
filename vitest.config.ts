import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/testing/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
