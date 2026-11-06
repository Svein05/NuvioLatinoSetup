import { defineConfig } from 'vitest/config';
import { optimizedImages } from '../scripts/optimized-images.js';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [optimizedImages(fileURLToPath(new URL('../', import.meta.url)))],
  test: {
    include: ['src/**/*.test.js', 'scripts/**/*.test.js', 'worker/**/*.test.js', 'tests/regression/**/*.test.js'],
    restoreMocks: true,
    clearMocks: true,
  },
});
