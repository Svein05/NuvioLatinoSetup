import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';

test.beforeEach(async ({ page }) => {
  await isolateExternalServices(page);
  await page.goto('/configuration/');
  await page.locator('#btnContinueWithoutAccount').click();
  await expect(page.locator('.section-container').first()).toBeVisible();
});

test('collection toolbar disables, enables and restores the template', async ({ page }) => {
  await page.getByRole('button', { name: /Desactivar Todo$/ }).click();
  await expect(page.getByText('0/26 activas', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Activar Todo$/ }).click();
  await expect(page.getByText('26/26 activas', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Desactivar Todo$/ }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByTitle('Restaurar valores de plantilla', { exact: true }).click();
  await expect(page.getByText('26/26 activas', { exact: true })).toBeVisible();
});

test('catalog explorer preserves renamed items while reordering and removing them', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.getByTitle('Personalizar y editar filas de la sección', { exact: true }).first().click();
  await page.getByTitle('Ver y ordenar catálogos', { exact: true }).first().click();
  const rows = page.locator('#catalogExplorerBody .catalog-explorer-row');
  const originalCount = await rows.count();
  expect(originalCount).toBeGreaterThan(1);
  await rows.first().getByTitle('Renombrar este catálogo', { exact: true }).click();
  await page.locator('#renameCatalogInput').fill('Colección de prueba');
  await page.locator('#btnSaveCatalogRename').click();
  await expect(rows.first()).toContainText('Colección de prueba');
  await rows.first().getByTitle('Bajar catálogo una posición', { exact: true }).click();
  await expect(rows.nth(1)).toContainText('Colección de prueba');
  page.once('dialog', dialog => dialog.accept());
  await rows.nth(1).getByTitle('Quitar de esta colección', { exact: true }).click();
  await expect(rows).toHaveCount(originalCount - 1);
  await expect(page.locator('#catalogExplorerBody')).not.toContainText('Colección de prueba');
  expect(errors).toEqual([]);
});
