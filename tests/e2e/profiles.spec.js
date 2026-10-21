import { expect, test } from '@playwright/test';
import { prepareAccount } from './support/account.js';

for (const failed of [false, true]) {
  test(`account profile rename ${failed ? 'keeps the edit pending on error' : 'confirms the name and preserves other settings'}`, async ({ page }) => {
    let profiles = [{ profile_index: 1, name: 'Synthetic profile', avatar_url: '/assets/logo/logo.webp',
      avatar_color_hex: '#ABCDEF', uses_primary_addons: true, uses_primary_plugins: true }];
    const writes = [];
    await prepareAccount(page, 'rpc', { respond(url, payload) {
      if (url.pathname.endsWith('/sync_pull_profiles')) return { body: profiles };
      if (url.pathname.endsWith('/sync_push_profiles')) {
        writes.push(payload);
        if (failed) return { status: 503, body: {} };
        profiles = payload.p_profiles;
        return { body: { success: true } };
      }
    } });
    await page.locator('#btnAccountProfileTrigger').click();
    await page.locator('.btn-popover-edit[data-id="1"]').click();
    await page.locator('#inputEditProfileName').fill('Renamed profile');
    await page.locator('#btnSaveEditProfile').click();
    if (failed) {
      await expect(page.locator('#modalEditProfile')).toBeVisible();
      await expect(page.locator('#latToastContainer')).toContainText('Error');
      expect(profiles[0].name).toBe('Synthetic profile');
    } else {
      await expect(page.locator('#modalEditProfile')).toBeHidden();
      await expect(page.locator('#sidebarActiveName')).toHaveText('Renamed profile');
      expect(profiles[0]).toMatchObject({ avatar_color_hex: '#ABCDEF', uses_primary_addons: true, uses_primary_plugins: true });
    }
    expect(writes).toHaveLength(1);
  });
}
