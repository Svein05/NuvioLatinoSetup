import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { isolateExternalServices } from './support/offline-services.js';

const { version } = JSON.parse(readFileSync(new URL('../../version.json', import.meta.url), 'utf8'));

test('homepage ships the exact public Search Console tag in its initial HTML', async ({ request }) => {
  const response = await request.get('/');
  const html = await response.text();
  expect(html.match(/name="google-site-verification"/g)).toHaveLength(1);
  expect(html).toContain('content="fWeoB53RvEt4p2Yg2nM2U31YYjZO5EpNGqQr-yWIcq4"');
});

for (const blockedStorage of [false, true]) {
  test(`repository stars and version remain visible ${blockedStorage ? 'with blocked storage' : 'across pages using their cache'}`, async ({ page }) => {
    await isolateExternalServices(page);
    if (blockedStorage) await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('synthetic blocked storage', 'SecurityError'); } });
    });
    let requests = 0;
    await page.route('https://api.github.com/repos/Svein05/NuvioLatinoSetup', route => {
      requests++;
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ stargazers_count: 7 }) });
    });
    await page.goto('/');
    await expect(page.locator('.github-stars-count').first()).toHaveText('7');
    await expect(page.locator('.github-stars-count').first()).toHaveAttribute('data-source', 'network');
    await expect(page.locator('.app-version-badge').first()).toHaveText(`v${version}`);
    if (!blockedStorage) {
      await page.goto('/documentation/');
      await expect(page.locator('.github-stars-count').first()).toHaveText('7');
      await expect(page.locator('.github-stars-count').first()).toHaveAttribute('data-source', 'cache');
      expect(requests).toBe(1);
    }
    await expect(page.locator('footer a.app-version-badge')).toHaveAttribute('href', 'https://github.com/Svein05/NuvioLatinoSetup/releases');
  });
}
