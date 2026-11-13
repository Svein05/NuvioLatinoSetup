import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';

async function enterCatalogs(page) {
  await isolateExternalServices(page);
  await page.route('https://api.strem.io/api/login', route => route.fulfill({ json: { result: { authKey: 'synthetic-only' } } }));
  await page.route('https://api.strem.io/api/addonCollectionGet', route => route.fulfill({ json: { result: { addons: [
    { transportUrl: 'https://catalog.example/manifest.json', manifest: { id: 'catalog', name: 'Catalog addon', catalogs: [{ id: 'home', type: 'movie', name: 'Home' }] } },
    { transportUrl: 'https://subtitles.example/manifest.json', manifest: { id: 'subtitles', name: 'Subtitle addon', catalogs: [] } },
  ] } } }));
  await page.goto('/configuration/');
  await expect(page.locator('#platformChoice')).toBeVisible();
  await expect(page.locator('#step-1')).toBeHidden();
  await expect(page.locator('#wizardStepToolbar')).toBeHidden();
  await page.locator('[data-setup-platform="stremio"]').click();
  await page.locator('#stremioSetupEmail').fill('synthetic@example.com');
  await page.locator('#stremioSetupPassword').fill('synthetic-password');
  await page.locator('#stremioSetupLogin [type=submit]').click();
  await expect(page.locator('#connectionsStep')).toBeVisible();
  await page.locator('#btnNext').click();
  await expect(page.locator('#stremioCatalogStep')).toBeVisible();
}

for (const width of [1280, 390]) {
test(`Stremio catalogs are collapsible, reorderable and add-only at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await enterCatalogs(page);
  const blocks = page.locator('[data-block-key]');
  await expect(blocks).toHaveCount(2);
  await expect(blocks.first()).toHaveAttribute('data-expanded', 'false');
  await expect(page.getByText('Subtitle addon', { exact: true })).toHaveCount(0);
  const metadata = page.locator('[data-block-key="setup:aiometadata"]');
  await expect.poll(() => metadata.locator('img').evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
  await metadata.locator('[data-block-toggle]').click();
  await expect(metadata.locator('[data-row-key]')).toHaveCount(28);
  const original = await metadata.locator('[data-row-key]').first().getAttribute('data-row-key');
  await metadata.locator('[data-row-move="0"][data-direction="1"]').click();
  await expect(metadata.locator('[data-row-key]').nth(1)).toHaveAttribute('data-row-key', original);
  await metadata.locator('[data-row-edit]').first().click();
  await page.locator('#stremioCatalogName').fill('Mi catálogo');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(metadata.locator('[data-row-key]').first()).toContainText('Mi catálogo');
  await metadata.locator('[data-row-remove]').first().click();
  await expect(metadata.locator('[data-row-key]')).toHaveCount(27);
  await page.locator('[data-stremio-manage]').click();
  const manager = page.locator('#stremioCatalogManager');
  await expect(manager.locator('[type=checkbox]')).toHaveCount(0);
  await manager.locator('[data-catalog-add]').first().click();
  await expect(metadata.locator('[data-row-key]')).toHaveCount(28);
  await manager.getByRole('button', { name: 'Listo', exact: true }).click();
  await metadata.locator('[data-block-move="0"][data-direction="1"]').click();
  await expect(blocks.last()).toHaveAttribute('data-block-key', 'setup:aiometadata');
  if (width === 1280) {
    await metadata.locator('[data-drag-block]').dragTo(blocks.first().locator('[data-drag-block]'));
    await expect(blocks.first()).toHaveAttribute('data-block-key', 'setup:aiometadata');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
}

test('switching platforms preserves Nuvio isolation and demos never install', async ({ page }) => {
  await isolateExternalServices(page);
  const writes = []; page.on('request', request => { if (request.url().includes('addonCollectionSet')) writes.push(request.url()); });
  await page.goto('/configuration/');
  await page.locator('[data-setup-platform="stremio"]').click();
  await page.locator('#stremioSetupEmail').fill('demo@example.com');
  await page.locator('#stremioSetupPassword').fill('NUVIO-DEMO-OK');
  await page.locator('#stremioSetupLogin [type=submit]').click();
  await expect(page.locator('#connectionsStep')).toBeVisible();
  await page.locator('#btnBack').click();
  await page.locator('#stremioLoginStep [data-setup-change]').click();
  await page.locator('[data-setup-platform="nuvio"]').click();
  await expect(page.locator('#step-1')).toBeVisible();
  await page.locator('#step-1 [data-setup-change]').click();
  await expect(page.locator('#platformChoice')).toBeVisible();
  expect(writes).toEqual([]);
});
