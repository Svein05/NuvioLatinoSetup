import { defineConfig } from '@playwright/test';
import production from './playwright.config.js';

export default defineConfig({
  ...production,
  testIgnore: '**/public-artifact.spec.js',
  webServer: {
    ...production.webServer,
    command: 'npm run dev -- --port 4173 --strictPort',
    reuseExistingServer: false,
  },
});
