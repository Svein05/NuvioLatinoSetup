import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';

test('entry requires a path and manual confirmation has no Stremio branding', async ({ page }) => {
  await isolateExternalServices(page);
  await page.goto('/configuration/');
  const modal = page.locator('#modalStremioMigration');
  await expect(modal).toBeHidden();
  await expect(page.locator('#platformChoice')).toBeVisible();
  await expect(page.locator('#wizardStepToolbar')).toBeHidden();
  await page.locator('[data-setup-platform="nuvio"]').click();
  await page.locator('#btnContinueWithoutAccount').click();
  await expect(modal.locator('.migration-brand')).toBeHidden();
  await expect(modal).toContainText('importarlos manualmente');
  await modal.locator('[data-migration-action="connect"]').click();
  await expect(modal).toBeHidden();
  await expect(page.locator('#step-1')).toBeVisible();
  await page.locator('#btnContinueWithoutAccount').click();
  await modal.locator('[data-migration-action="manual"]').click();
  await page.locator('#btnNext').click();
  await expect(page.locator('#step-3')).toBeVisible();
});

test('mobile Stremio connection can return to the ordinary setup', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await isolateExternalServices(page);
  await page.goto('/configuration/');
  await page.locator('[data-setup-platform="nuvio"]').click();
  await page.locator('#btnStartStremioMigration').click();
  await expect(page.locator('#migration-connect')).toBeVisible();
  await page.locator('#migrationPassword').fill('synthetic-password');
  await page.locator('#btnToggleMigrationPassword').click();
  await expect(page.locator('#migrationPassword')).toHaveAttribute('type', 'text');
  await page.locator('#migration-connect [data-migration-action="skip"]').click();
  await expect(page.locator('#migration-connect')).toBeHidden();
  await expect(page.locator('#step-1')).toBeVisible();
  await expect(page.locator('#migrationPassword')).toHaveValue('');
  await expect(page.locator('#migrationPassword')).toHaveAttribute('type', 'password');
});
