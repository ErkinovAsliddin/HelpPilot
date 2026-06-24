import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/frontend/**', 'src/demo/**', 'src/index.ts'],
      thresholds: {
        lines: 60,
      },
    },
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
