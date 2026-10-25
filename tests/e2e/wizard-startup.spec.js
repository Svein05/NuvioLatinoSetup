import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';

test('wizard becomes interactive only after templates and handlers are ready', async ({ page }) => {
  await isolateExternalServices(page);
  let release;
  let requested;
  const gate = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { requested = resolve; });
  await page.route('**/templates/NuvioCollections.json*', async route => {
    requested();
    await gate;
    await route.continue();
  });
  await page.goto('/configuration/');
  await started;
  const wizard = page.locator('#wizardView');
  await expect(wizard).toHaveAttribute('inert', '');
  await expect(wizard).toHaveAttribute('aria-busy', 'true');
  release();
  await expect(wizard).not.toHaveAttribute('inert', '');
  await expect(wizard).toHaveAttribute('aria-busy', 'false');
  await page.locator('#btnContinueWithoutAccount').click();
  await expect(page.locator('#step-3')).toBeVisible();
  await expect(page.locator('.section-container').first()).toBeVisible();
});
