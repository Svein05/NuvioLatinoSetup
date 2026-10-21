import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';

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
    await expect(page.locator('.app-version-badge').first()).toHaveText('v1.8.0');
    if (!blockedStorage) {
      await page.goto('/documentation/');
      await expect(page.locator('.github-stars-count').first()).toHaveText('7');
      await expect(page.locator('.github-stars-count').first()).toHaveAttribute('data-source', 'cache');
      expect(requests).toBe(1);
    }
    await expect(page.locator('footer a.app-version-badge')).toHaveAttribute('href', 'https://github.com/Svein05/NuvioLatinoSetup/releases');
  });
}
