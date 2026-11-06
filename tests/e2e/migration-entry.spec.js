import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';

test('entry requires a path and manual confirmation has no Stremio branding', async ({ page }) => {
  await isolateExternalServices(page);
  await page.goto('/configuration/');
  const modal = page.locator('#modalStremioMigration');
  await expect(modal).toBeVisible();
  await expect(page.locator('#migrationTitle')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(modal).toBeVisible();
  await expect(modal.locator('.fa-xmark')).toHaveCount(0);
  await page.keyboard.press('Tab');
  await expect(modal.locator('[data-migration-action="login"]')).toBeFocused();
  await modal.locator('[data-migration-action="skip"]').click();
  await page.locator('#btnContinueWithoutAccount').click();
  await expect(modal.locator('.migration-brand')).toBeHidden();
  await expect(modal).toContainText('importarlos manualmente');
  await modal.locator('[data-migration-action="connect"]').click();
  await expect(modal).toBeHidden();
  await expect(page.locator('#step-1')).toBeVisible();
  await page.locator('#btnContinueWithoutAccount').click();
  await modal.locator('[data-migration-action="manual"]').click();
  await expect(page.locator('#step-3')).toBeVisible();
});

test('mobile Stremio connection can return to the ordinary seven-step setup', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await isolateExternalServices(page);
  await page.goto('/configuration/');
  await page.locator('[data-migration-action="login"]').click();
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
