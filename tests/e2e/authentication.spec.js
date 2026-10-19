import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';

test('wizard login preserves profile navigation without persisting account or addon passwords', async ({ page }) => {
  await isolateExternalServices(page);
  await page.route('https://api.nuvio.tv/**', route => {
    const url = new URL(route.request().url());
    const body = url.pathname.endsWith('/auth/v1/token')
      ? { access_token: 'synthetic-token', user: { id: 'synthetic-user' }, expires_in: 3600 }
      : url.pathname.endsWith('/sync_pull_profiles') ? [{ profile_index: 1, name: 'Synthetic profile' }] : [];
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('/configuration/');
  await page.locator('#nuvioEmail').fill('test@example.invalid');
  await page.locator('#nuvioPassword').fill('synthetic-private-password');
  await page.locator('#btnNuvioConnect').click();
  await expect(page.locator('#step-2')).toBeVisible();
  const snapshot = await page.evaluate(() => JSON.parse(sessionStorage.getItem('nuvio_wizard_auth')));
  expect(snapshot.auth.accessToken).toBe('synthetic-token');
  expect(snapshot.auth).not.toHaveProperty('password');
  expect(snapshot).not.toHaveProperty('aioPassword');
  expect(JSON.stringify(snapshot)).not.toContain('synthetic-private-password');
  await page.reload();
  await expect(page.locator('#step-2')).toBeVisible();
  await expect(page.locator('#step-2')).toContainText('Synthetic profile');
});
