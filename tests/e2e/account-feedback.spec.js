import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';
import { prepareAccount } from './support/account.js';

for (const [status, body, message] of [[400, { error_code: 'invalid_credentials' }, 'Correo o contraseña incorrectos.'],
  [503, {}, 'No se pudo conectar con Nuvio.']]) {
  test('login shows pending state and inline error for HTTP ' + status, async ({ page }) => {
    await isolateExternalServices(page);
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    let writes = 0;
    await page.route('https://api.nuvio.tv/auth/v1/token?**', async route => {
      writes++; await gate; await route.fulfill({ status, json: body });
    });
    await page.goto('/account/');
    await page.locator('#accountEmail').fill('synthetic@example.invalid');
    await page.locator('#accountPassword').fill('synthetic-password');
    const button = page.locator('#accountAuthForm button[type=submit]');
    await button.click();
    await expect(button).toBeDisabled();
    await expect(button).toContainText('Iniciando sesión');
    await expect(button.locator('.fa-spin')).toHaveCount(1);
    release();
    await expect(page.locator('#accountAuthError')).toContainText(message);
    await expect(button).toBeEnabled();
    expect(writes).toBe(1);
    await expect(page.locator('#latToastContainer').filter({ hasText: 'Error de acceso' })).toHaveCount(0);
    await page.locator('#accountEmail').fill('edited@example.invalid');
    await expect(page.locator('#accountAuthError')).toBeHidden();
  });
}

test('overview skeletons start with profile reads and settle without false empty data', async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await prepareAccount(page, 'rpc', { beforeNavigate: () => page.route('**/sync_pull_watch_progress', async route => {
    await gate;
    await route.fulfill({ json: [{ profile_id: 1, content_id: 'synthetic', title: 'Confirmed activity', position: 10, duration: 100 }] });
  }) });
  await expect(page.locator('#sectionPane-overview')).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('#rowCurrentlyWatchingCards .account-skeleton')).toHaveCount(6);
  await expect(page.locator('#metricProgressCount')).toHaveClass(/account-metric-pending/);
  await expect(page.locator('#accountProfilesStatus .account-skeleton')).toHaveCount(0);
  release();
  await expect(page.locator('#metricProgressCount')).toHaveText('1');
  await expect(page.locator('#rowCurrentlyWatchingCards')).toContainText('Confirmed activity');
  await expect(page.locator('#rowCurrentlyWatchingCards .account-skeleton')).toHaveCount(0);
});
