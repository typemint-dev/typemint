import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.spec.ts', '**/*.spec.ts'],
    coverage: {
      enabled: true,
      provider: 'v8',
      reportsDirectory: './coverage/packages',
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        '**/index.ts',
        '**/*.index.ts',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/node_modules/**',
      ],
      reporter: ['text-summary', 'text', 'html', 'lcov'],
      thresholds: {
        'packages/core/src/**': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
        'packages/result/src/**': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
        'packages/data/src/**': {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
        'packages/scalars/src/**': {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
      },
    },
  },
});
