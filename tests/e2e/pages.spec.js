import { expect, test } from '@playwright/test';

import { isolateExternalServices } from './support/offline-services.js';

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test.describe(`public pages at ${viewport.width}px`, () => {
    test.use({ viewport });

    for (const pathname of ['/', '/configuration/', '/account/', '/documentation/']) {
      test(`${pathname} loads its bundled scripts and local resources`, async ({ page }) => {
        await isolateExternalServices(page);
        const errors = [];
        const missing = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('response', response => {
          if (response.url().startsWith('http://127.0.0.1:4173/') && response.status() >= 400) {
            missing.push(response.url());
          }
        });
        const response = await page.goto(pathname);
        expect(response.status()).toBe(200);
        await expect(page.locator('header.lat-floating-nav')).toBeVisible();
        const activeTab = page.locator('header nav a[aria-current="page"]');
        await expect(activeTab).toHaveCount(1);
        expect(await activeTab.evaluate(link => new URL(link.href).pathname)).toBe(pathname);
        const footerPaths = await page.locator('footer a').evaluateAll(links => links
          .map(link => new URL(link.href))
          .filter(url => url.origin === location.origin)
          .map(url => url.pathname));
        expect(footerPaths).toEqual(['/configuration/', '/documentation/', '/account/']);
        await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(8, 9, 12)');
        await expect(page.locator('.app-version-badge').first()).toHaveText('v1.8.0');
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({
          path: `test-results/pages/${viewport.width}-${pathname.replaceAll('/', '') || 'index'}.png`,
          animations: 'disabled',
        });
        expect(missing).toEqual([]);
        expect(errors).toEqual([]);
      });
    }
  });
}

test('manual configuration loads collections without authentication or remote services', async ({ page }) => {
  await isolateExternalServices(page);
  await page.goto('/configuration/');
  await page.locator('#btnContinueWithoutAccount').click();
  await expect(page.locator('#step-3')).toBeVisible();
  await expect(page.locator('.section-container').first()).toBeVisible();
  await expect(page.locator('#stepCounter')).toContainText('3');
});

test('modder page remains available at its public route', async ({ page }) => {
  await isolateExternalServices(page);
  await page.addInitScript(() => sessionStorage.setItem('nuvio_modder_session', JSON.stringify({
    token: 'synthetic-test-only', email: 'test@example.invalid', timestamp: Date.now(),
  })));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto('/modder/');
  expect(response.status()).toBe(200);
  await expect(page.locator('#tabBtnUpload')).toBeVisible();
  expect(errors).toEqual([]);
});
