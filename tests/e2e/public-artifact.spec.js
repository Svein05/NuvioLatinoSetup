import { expect, test } from '@playwright/test';

test('serves public templates and assets without exposing repository files', async ({ request }) => {
  const manifest = await request.get('/templates/NuvioCollections.json');
  expect(manifest.status()).toBe(200);
  expect(Array.isArray(await manifest.json())).toBe(true);
  expect((await request.get('/assets/logo/logo.webp')).status()).toBe(200);
  for (const pathname of ['/.env', '/AGENTS.md', '/GEMINI.md', '/docs/development/context.md',
    '/scripts/site-shell.js', '/config/vite.config.js', '/js/webhook-config.local.js',
    '/package.json', '/home/', '/worker/src/index.js']) {
    expect((await request.get(pathname)).status()).toBe(404);
  }
});
