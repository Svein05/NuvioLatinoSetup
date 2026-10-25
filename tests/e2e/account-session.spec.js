import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';
import { prepareAccount } from './support/account.js';

test('account login connects its form, clears the password and restores the session after reload', async ({ page }) => {
  await isolateExternalServices(page);
  await page.route('https://api.nuvio.tv/**', route => {
    const path = new URL(route.request().url()).pathname;
    const body = path.endsWith('/auth/v1/token')
      ? { access_token: 'synthetic-token', user: { id: 'synthetic-user' }, expires_in: 3600 }
      : path.endsWith('/sync_pull_profiles') ? [{ profile_index: 1, name: 'Synthetic profile' }] : [];
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('/account/');
  await page.locator('#accountEmail').fill('test@example.invalid');
  await page.locator('#accountPassword').fill('synthetic-private-password');
  await page.locator('#accountAuthForm button[type="submit"]').click();
  await expect(page.locator('#accountDashboardView')).toBeVisible();
  await expect(page.locator('#accountPassword')).toHaveValue('');
  const session = await page.evaluate(() => sessionStorage.getItem('nuvio_account_session_v1'));
  expect(session).toContain('synthetic-token');
  expect(session).not.toContain('synthetic-private-password');
  await page.reload();
  await expect(page.locator('#accountDashboardView')).toBeVisible();
  await page.locator('#modalProfileCardsGrid [data-profile-id="1"]').click();
  await page.locator('#btnAccountLogout').click();
  await expect(page.locator('#accountAuthView')).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('nuvio_account_session_v1'))).toBeNull();
});

test('failed settings reads show a local retry instead of editable defaults or writes', async ({ page }) => {
  const writes = [];
  await prepareAccount(page, 'rpc', { respond(url, payload) {
    if (url.pathname.endsWith('/sync_pull_profile_settings_blob')) return { status: 503, body: {} };
    if (url.pathname.endsWith('/sync_push_profile_settings_blob')) { writes.push(payload); return { body: {} }; }
  } });
  await page.locator('.account-nav-btn[data-section="settings"]').click();
  await expect(page.locator('#accountSettingsContainer')).toContainText('No se pudieron cargar');
  await expect(page.locator('#accountSettingsContainer button')).toHaveText('Reintentar');
  await expect(page.locator('#inputTmdbKey')).toHaveCount(0);
  expect(writes).toEqual([]);
});

test('profile creation and avatar picker open, preserve focus and close with Escape', async ({ page }) => {
  await prepareAccount(page, 'rpc');
  await page.locator('#btnAccountProfileTrigger').click();
  await page.locator('#btnPopoverAddProfile').click();
  await expect(page.locator('#modalCreateProfile')).toBeVisible();
  await page.locator('#btnPickCreateProfileAvatar').click();
  await expect(page.locator('#modalCreateProfileAvatarPicker')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#modalCreateProfileAvatarPicker')).toBeHidden();
  await expect(page.locator('#modalCreateProfile')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#modalCreateProfile')).toBeHidden();
  await page.locator('#btnAccountProfileTrigger').click();
  await expect(page.locator('#accountProfilePopover')).toBeVisible();
});

test('opening a profile dialog transfers focus before the next animation frame', async ({ page }) => {
  await prepareAccount(page, 'rpc');
  await page.locator('#btnAccountProfileTrigger').click();
  const focused = await page.locator('#btnPopoverAddProfile').evaluate(button => {
    button.click();
    return new Promise(resolve => queueMicrotask(() => {
      resolve(document.getElementById('modalCreateProfile').contains(document.activeElement));
    }));
  });
  expect(focused).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#modalCreateProfile')).toBeHidden();
});
