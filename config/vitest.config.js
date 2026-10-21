import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.js', 'scripts/**/*.test.js', 'worker/**/*.test.js', 'tests/regression/**/*.test.js'],
    restoreMocks: true,
    clearMocks: true,
  },
});
