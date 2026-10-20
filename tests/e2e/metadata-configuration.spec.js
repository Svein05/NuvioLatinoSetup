import { expect, test } from '@playwright/test';
import { prepareAccount } from './support/account.js';

const instance = 'https://aiometadata.viren070.me';
const uuid = 'synthetic-config-id';
const manifestUrl = `${instance}/stremio/${uuid}/manifest.json`;

for (const failUpdate of [false, true]) {
  test(`metadata uses its installed owner and ${failUpdate ? 'retains changes on failure' : 'preserves other provider settings when saving'}`, async ({ page }) => {
    const config = {
      catalogs: [{ id: 'synthetic-catalog', custom: { keep: true } }],
      apiKeys: { tmdb: 'synthetic-key', unrelatedProvider: 'synthetic-preserved' },
      search: { enabled: true }, posterRatingProvider: 'none', unrelatedSetting: { keep: 7 },
    };
    const calls = [];
    let written;
    await prepareAccount(page, 'rpc', {
      respond(url) {
        if (url.pathname === '/rest/v1/addons') return { body: [{
          id: 'synthetic-addon', profile_id: 1, name: 'AIOMetadata', manifest_url: manifestUrl, sort_order: 1,
        }] };
      },
      respondExternal(url, request) {
        if (!url.pathname.startsWith('/api/config/')) return;
        calls.push({ origin: url.origin, path: url.pathname });
        if (url.origin !== instance) return { status: 401, body: {} };
        if (url.pathname.includes('/load/')) return { body: { success: true, userUUID: uuid, config } };
        if (url.pathname.includes('/update/')) {
          written = request.postDataJSON();
          return failUpdate ? { status: 503, body: {} } : { body: { success: true, userUUID: uuid } };
        }
      },
    });
    await page.locator('.account-nav-btn[data-section="aiometadata"]').click();
    await expect(page.locator('#cardPosterBetter')).toBeVisible();
    await page.locator('#cardPosterBetter').click();
    await expect(page.locator('#btnAccountSave')).toBeEnabled();
    await page.locator('#btnAccountSave').focus();
    await page.locator('#btnAccountSave').press('Enter');
    await expect.poll(() => calls.filter(call => call.path.includes('/update/')).length).toBe(1);
    expect(calls.every(call => call.origin === instance)).toBe(true);
    expect(written.config).toMatchObject({ catalogs: config.catalogs, apiKeys: config.apiKeys, search: config.search, unrelatedSetting: { keep: 7 } });
    expect(written.config.posterRatingProvider).toBe('custom');
    if (failUpdate) {
      await expect(page.locator('#latToastContainer')).toContainText('Error al guardar');
      await expect(page.locator('#btnAccountSave')).toBeEnabled();
    } else {
      await expect(page.locator('#latToastContainer')).toContainText('guardado');
    }
  });
}
