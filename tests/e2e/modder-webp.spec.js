import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { isolateExternalServices } from './support/offline-services.js';
import { publicCatalog } from './support/public-catalog.js';
import { validateAvatarBatch } from '../../worker/src/services/avatar-batch.js';

async function prepare(page, mode) {
  await isolateExternalServices(page);
  await page.addInitScript(mode => {
    sessionStorage.setItem('nuvio_modder_session', JSON.stringify({ token: 'synthetic', email: 'test@example.invalid' }));
    window.webpMode = mode;
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      if (type !== 'image/webp' || window.webpMode === 'native') return original.call(this, callback, type, quality);
      if (window.webpMode === 'null') { callback(null); return; }
      return original.call(this, blob => callback(window.webpMode === 'mislabeled' ? new Blob([blob], { type: 'image/webp' }) : blob), 'image/png');
    };
  }, mode);
  await page.route('**/api/avatars/catalog', route => route.fulfill({ json: publicCatalog(['NetflixStyle/Naruto/Hero.webp']) }));
  await page.goto('/modder/');
  await page.locator('#selectStyle').selectOption('NetflixStyle');
  await page.locator('#selectFranchise').selectOption('Naruto');
}

async function upload(page, name = 'New.png') {
  const buffer = await sharp({ create: { width: 8, height: 6, channels: 4, background: { r: 200, g: 100, b: 50, alpha: .25 } } }).png().toBuffer();
  await page.locator('#fileInput').setInputFiles({ name, mimeType: 'image/png', buffer });
  return { name, mimeType: 'image/png', buffer };
}

for (const mode of ['native', 'png', 'mislabeled', 'null']) {
test(`modder publishes real WebP for additions and replacements with ${mode} canvas output`, async ({ page }) => {
  const wasm = []; page.on('request', request => { if (/\.wasm(?:\?|$)/.test(request.url())) wasm.push(request.url()); });
  await prepare(page, mode);
  const file = await upload(page);
  await expect(page.locator('.input-character-name')).toHaveCount(1);
  await page.locator('#btnSubmitBatch').click();
  await page.locator('#tabBtnManage').click();
  await page.locator('#collectionsGrid [data-collection-id="Naruto"]').click();
  await page.locator('#catalogGrid [data-avatar-id]').first().click();
  await page.locator('#modalFileInput').setInputFiles(file);
  await expect(page.locator('#modalEditStatus')).toContainText('Nueva imagen lista');
  await page.locator('#btnModalSave').click();
  let payload;
  await page.route('**/api/save-staged-changes', async route => {
    payload = route.request().postDataJSON();
    await route.fulfill({ json: { success: true, commit: 'synthetic' } });
  });
  await page.locator('#btnSaveAllChanges').click(); await page.locator('#btnConfirmPublish').click();
  await expect(page.locator('#publishResultContent')).toContainText('Cambios Publicados');
  expect(() => validateAvatarBatch(payload)).not.toThrow();
  expect(payload.addedFiles).toHaveLength(1); expect(payload.replacedFiles).toHaveLength(1);
  for (const item of [...payload.addedFiles, ...payload.replacedFiles]) {
    const decoded = await sharp(Buffer.from(item.base64, 'base64')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(decoded.info).toMatchObject({ width: 8, height: 6, channels: 4 });
    expect(decoded.data[3]).toBeGreaterThanOrEqual(60); expect(decoded.data[3]).toBeLessThanOrEqual(67);
  }
  if (mode === 'native') expect(wasm).toHaveLength(0);
  else expect(wasm.length).toBeGreaterThan(0);
});
}

test('failed fallback keeps the existing queue and allows the same file to be retried', async ({ page }) => {
  await prepare(page, 'native'); await upload(page, 'Healthy.png');
  await expect(page.locator('.input-character-name')).toHaveCount(1);
  await page.evaluate(() => { window.webpMode = 'png'; });
  const pattern = /\.wasm(?:\?|$)/;
  await page.route(pattern, route => route.abort());
  await upload(page, 'Retry.png');
  await expect(page.locator('#modderToastContainer')).toContainText('Tus cambios anteriores se conservan');
  await expect(page.locator('.input-character-name')).toHaveCount(1);
  await page.unroute(pattern); await upload(page, 'Retry.png');
  await expect(page.locator('.input-character-name')).toHaveCount(2);
});
