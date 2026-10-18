import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/schedule.js',
        'src/standings.js',
        'src/leaders.js',
        'src/store.js',
        'src/awards.js',
        'src/news.js',
        'src/odds.js',
        'src/views/news.js',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
