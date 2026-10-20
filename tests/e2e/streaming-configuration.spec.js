import { expect, test } from '@playwright/test';
import { prepareAccount } from './support/account.js';

async function openDebridForm(page) {
  await page.locator('.account-nav-btn[data-section="addons"]').click();
  await page.locator('#btnAccountOpenAddAioStreams').click();
  await expect(page.locator('#modalAccountAioStreamsDebrids')).toBeVisible();
  await page.locator('#inputAccountDebridTorbox').fill('12345678-1234-1234-1234-123456789abc');
}

for (const failCreation of [false, true]) {
  test(`streaming creation ${failCreation ? 'retains the form after an ambiguous failure' : 'preserves template settings and safely renders the verified account'}`, async ({ page }) => {
    const user = '<img src=x onerror=alert(1)>Synthetic';
    const writes = [];
    await prepareAccount(page, 'rpc', {
      respondExternal(url, request) {
        if (url.hostname === 'api.torbox.app') return { body: { success: true, data: { email: user, plan: 0 } } };
        if (request.method() === 'POST' && url.pathname.endsWith('/api/v1/user')) {
          writes.push({ origin: url.origin, body: request.postDataJSON() });
          return failCreation ? { status: 503, body: {} }
            : { body: { success: true, data: { uuid: 'synthetic-streaming-id', encryptedPassword: 'synthetic-encrypted' } } };
        }
      },
    });
    await openDebridForm(page);
    await page.locator('#btnAccountValidateDebridKeys').click();
    await expect(page.locator('#statusAccountDebridTorbox')).toContainText(user);
    await expect(page.locator('#statusAccountDebridTorbox img')).toHaveCount(0);
    await expect(page.locator('#btnAccountInstallAioStreams')).toBeEnabled();
    await page.locator('#btnAccountInstallAioStreams').click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].origin).toBe('https://nuvio-proxy.elias-manriquez-2005.workers.dev');
    const compiled = writes[0].body.config;
    expect(compiled.services.find(service => service.id === 'torbox')).toMatchObject({ enabled: true,
      credentials: { apiKey: '12345678-1234-1234-1234-123456789abc' } });
    expect(compiled.requiredResolutions).toEqual(['2160p', '1440p', '1080p', '720p']);
    if (failCreation) {
      await expect(page.locator('#latToastContainer')).toContainText('No se pudo confirmar');
      await expect(page.locator('#modalAccountAioStreamsDebrids')).toBeVisible();
      await expect(page.locator('#inputAccountDebridTorbox')).toHaveValue('12345678-1234-1234-1234-123456789abc');
    } else {
      await expect(page.locator('#latToastContainer')).toContainText('compilado y agregado');
      await expect(page.locator('#modalAccountAioStreamsDebrids')).toBeHidden();
      await expect(page.locator('#btnAccountSave')).toBeEnabled();
    }
    expect(writes).toHaveLength(1);
  });
}

test('a plausible TorBox key remains unverified when its provider is unreachable', async ({ page }) => {
  await prepareAccount(page, 'rpc');
  await page.route('https://api.torbox.app/**', route => route.abort('failed'));
  await openDebridForm(page);
  await page.locator('#btnAccountValidateDebridKeys').click();
  await expect(page.locator('#statusAccountDebridTorbox')).toHaveText(/Sin verificar/);
  await expect(page.locator('#btnAccountInstallAioStreams')).toBeDisabled();
});
