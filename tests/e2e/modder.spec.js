import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';

const files = ['NetflixStyle/Naruto/Hero.webp', 'IconsStyle/One Piece/Luffy.webp'];
const sha = 'b'.repeat(40);

async function prepareModder(page) {
  await isolateExternalServices(page);
  await page.addInitScript(() => sessionStorage.setItem('nuvio_modder_session', JSON.stringify({ token: 'synthetic', email: 'test@example.invalid' })));
  await page.route('https://api.github.com/**', route => {
    const pathname = new URL(route.request().url()).pathname;
    return route.fulfill({ json: pathname.includes('/git/ref/') ? { object: { sha } }
      : { tree: files.map(path => ({ type: 'blob', path: `assets/profile_icons/${path}` })) } });
  });
  await page.goto('/modder/');
}

test('modder catalog applies both search and style filters', async ({ page }) => {
  await prepareModder(page);
  await page.locator('#tabBtnManage').click();
  const cards = page.locator('#collectionsGrid [data-collection-id]');
  await expect(cards).toHaveCount(2);
  await page.locator('#manageSearchInput').fill('luffy');
  await expect(cards).toHaveCount(1);
  await expect(page.locator('#collectionsGrid')).toContainText('One Piece');
  await page.locator('#manageSearchInput').fill('');
  await page.locator('#manageStyleSelect').selectOption('NetflixStyle');
  await expect(cards).toHaveCount(1);
  await expect(page.locator('#collectionsGrid')).toContainText('Naruto');
});

async function stageBatch(page) {
  await page.locator('#selectStyle').selectOption('NetflixStyle');
  await page.locator('#selectFranchise').selectOption('Naruto');
  await page.locator('#fileInput').setInputFiles({ name: 'Original.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') });
  await page.locator('.input-character-name').fill('Renombrado');
  await page.locator('#btnSubmitBatch').click();
}

test('modder stages the edited filename and can undo the batch without publishing', async ({ page }) => {
  let writes = 0;
  await prepareModder(page);
  await page.route('**/api/save-staged-changes', route => { writes++; return route.fulfill({ status: 503, json: {} }); });
  await stageBatch(page);
  await page.locator('#btnSaveAllChanges').click();
  await expect(page.locator('#publishStagedModal')).toContainText('Renombrado.webp');
  await page.locator('#btnCancelPublish').click();
  await page.locator('#btnUndoChange').click();
  await expect(page.locator('#btnSaveAllChanges')).toBeDisabled();
  expect(writes).toBe(0);
});

for (const failure of [false, true]) {
  test(`modder publication ${failure ? 'preserves uncertain changes without retrying' : 'clears only confirmed changes'}`, async ({ page }) => {
    let writes = 0;
    await prepareModder(page);
    await page.route('**/api/save-staged-changes', async route => {
      writes++;
      await route.fulfill({ status: failure ? 503 : 200,
        json: failure ? {} : { success: true, commit: 'https://github.com/example/project/commit/synthetic' } });
    });
    await stageBatch(page);
    await page.locator('#btnSaveAllChanges').click();
    await page.locator('#btnConfirmPublish').click();
    if (failure) {
      await expect(page.locator('#publishResultContent')).toContainText('No se pudo confirmar');
      await expect(page.locator('#btnRetryPublish')).toBeHidden();
      await expect(page.locator('#btnSaveAllChanges')).toBeEnabled();
      await page.locator('#btnConfirmPublish').dispatchEvent('click');
    } else {
      await expect(page.locator('#publishResultContent')).toContainText('Cambios Publicados');
      await expect(page.locator('#btnSaveAllChanges')).toBeDisabled();
    }
    expect(writes).toBe(1);
  });
}


test('modder rejects path names and stages valid catalog edits', async ({ page }) => {
  await prepareModder(page);
  await page.locator('#tabBtnManage').click();
  await page.locator('#collectionsGrid [data-collection-id="Naruto"]').click();
  await page.locator('#catalogGrid [data-avatar-id]').first().click();
  await page.locator('#modalCharacterInput').fill('../invalid');
  await expect(page.locator('#btnModalSave')).toBeDisabled();
  await page.locator('#modalCharacterInput').fill('Edited hero');
  await page.locator('#btnModalSave').click();
  await expect(page.locator('#editAvatarModal')).toBeHidden();
  await page.locator('#btnSaveAllChanges').click();
  await expect(page.locator('#publishStagedItemsList')).toContainText('Edited hero.webp');
});
