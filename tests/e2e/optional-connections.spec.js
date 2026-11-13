import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';

async function enterConnections(page) {
  await isolateExternalServices(page);
  await page.goto('/configuration/');
  await page.locator('#modalStremioMigration [data-migration-action="skip"]').click();
  await page.locator('#btnContinueWithoutAccount').click();
  await page.locator('[data-migration-action="manual"]').click();
  await expect(page.locator('#connectionsStep')).toBeVisible();
}

for (const width of [1280, 390]) {
test(`connection cards manage lists, track and confirm removal at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await enterConnections(page);
  const trakt = page.locator('[data-connection-provider="trakt"]');
  await expect(trakt.locator('[data-trakt-tracking]')).toBeHidden();
  await trakt.locator('[data-connection-input]').fill('NUVIO-DEMO-OK');
  await trakt.locator('[data-connection-check]').click();
  await expect(trakt.locator('[data-connection-check]')).toContainText('Comprobando');
  await expect(trakt).toHaveAttribute('data-connected', 'true');
  await expect(trakt.locator('[data-connection-credentials]')).toBeHidden();
  await trakt.locator('[data-connection-manage]').click();
  const lists = page.locator('#connectionListsModal');
  await expect(lists).toBeVisible();
  await lists.locator('[data-list-index="0"]').check();
  await expect(lists.locator('[data-list-index="0"]')).toBeFocused();
  await lists.locator('input[type="search"]').fill('no matching list');
  await expect(lists.locator('[data-lists-empty]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(lists).toBeHidden();
  await trakt.locator('[data-connection-edit]').click();
  await expect(trakt.locator('[data-connection-input]')).toBeVisible();
  await trakt.locator('[data-connection-remove]').click();
  await page.locator('#btnCancelRemoveConnection').click();
  await expect(trakt).toHaveAttribute('data-connected', 'true');
  await trakt.locator('[data-connection-remove]').click();
  await page.locator('[data-confirm-removal]').click();
  await expect(trakt).toHaveAttribute('data-connected', 'false');
  await expect(trakt.locator('[data-trakt-tracking]')).toBeHidden();
  const simkl = page.locator('[data-connection-provider="simkl"]');
  await simkl.locator('[data-connection-input]').fill('NUVIO-DEMO-OK');
  await simkl.locator('[data-connection-check]').click();
  await expect(simkl).toHaveAttribute('data-connected', 'true');
  await expect(simkl.locator('[data-tracking-toggle]')).toBeChecked();
  await simkl.locator('.connection-tracking-row .lat-switch-track').click();
  await simkl.locator('[data-connection-check]').click();
  await expect(simkl.locator('[data-connection-check]')).toBeEnabled();
  await expect(simkl.locator('[data-tracking-toggle]')).not.toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});
}

test('demo keys and connections permit navigation but lock final installation and exports', async ({ page }) => {
  await enterConnections(page);
  await page.locator('#btnNext').click();
  await expect(page.locator('#step-3')).toBeVisible();
  await page.locator('#btnNext').click();
  await page.locator('#keyTmdb').fill('NUVIO-DEMO-OK');
  await page.locator('#keyMdblist').fill('NUVIO-DEMO-OK');
  await page.locator('#btnValidateApiKeys').click();
  await expect(page.locator('#btnNext')).toBeEnabled();
  await page.locator('#btnNext').click();
  await page.locator('#btnNext').click();
  await page.locator('#btnNext').click();
  await expect(page.locator('#step-7')).toBeVisible();
  await expect(page.locator('#btnExecutePipeline')).toBeDisabled();
  await expect(page.locator('#btnExecutePipeline .fa-lock')).toBeVisible();
  await page.locator('.wizard-config-files summary').click();
  await expect(page.locator('#btnDownloadAioConfig')).toBeDisabled();
  await expect(page.locator('#btnCopyCollectionsJson')).toBeDisabled();
});
