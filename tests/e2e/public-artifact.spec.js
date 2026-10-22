import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';

test('compiled glass styles preserve the standard backdrop filter', async ({ page }) => {
  await isolateExternalServices(page);
  await page.goto('/');
  const declarations = await page.evaluate(() => {
    const selectors = ['.lat-floating-pill', '.lat-mobile-dropdown', '.lat-card',
      '.lat-toast', '.account-content-card'];
    const result = {};
    function inspect(rules) {
      for (const rule of rules) {
        if (selectors.includes(rule.selectorText) && rule.style?.getPropertyValue('backdrop-filter')) {
          result[rule.selectorText] = rule.style.getPropertyValue('backdrop-filter');
        }
        if (rule.cssRules) inspect(rule.cssRules);
      }
    }
    for (const sheet of document.styleSheets) inspect(sheet.cssRules);
    return result;
  });
  for (const selector of ['.lat-floating-pill', '.lat-mobile-dropdown', '.lat-card',
    '.lat-toast', '.account-content-card']) {
    expect(declarations[selector], selector).toContain('blur(');
  }
});

test('serves public templates and assets without exposing repository files', async ({ request }) => {
  const manifest = await request.get('/templates/NuvioCollections.json');
  expect(manifest.status()).toBe(200);
  expect(Array.isArray(await manifest.json())).toBe(true);
  expect((await request.get('/assets/logo/logo.webp')).status()).toBe(200);
  for (const pathname of ['/.env', '/.local/notes.md',
    '/scripts/site-shell.js', '/config/vite.config.js', '/js/webhook-config.local.js',
    '/package.json', '/home/', '/worker/src/index.js']) {
    expect((await request.get(pathname)).status()).toBe(404);
  }
});
