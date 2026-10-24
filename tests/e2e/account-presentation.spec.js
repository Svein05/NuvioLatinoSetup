import { expect, test } from '@playwright/test';
import { prepareAccount } from './support/account.js';

test('addon logos load from manifests once without creating pending edits', async ({ page }) => {
  let reads = 0;
  const writes = [];
  await prepareAccount(page, 'rpc', {
    respond(url, payload) {
      if (url.pathname.endsWith('/sync_push_profiles')) writes.push(payload);
      if (url.pathname.endsWith('/addons')) return { body: [
        { id: 'one', name: 'Cinemeta', manifest_url: 'https://addon.example.invalid/manifest.json' },
      ] };
    },
    respondExternal(url, request) {
      if (url.hostname !== 'addon.example.invalid') return;
      expect(request.method()).toBe('GET');
      expect(request.headers().authorization).toBeUndefined();
      reads++;
      return { body: { name: 'Cinemeta', logo: 'https://images.example.invalid/cinemeta.webp' } };
    },
  });
  await page.locator('.account-nav-btn[data-section="addons"]').click();
  const logo = page.locator('#accountAddonsListContainer img');
  await expect(logo).toHaveAttribute('src', 'https://images.example.invalid/cinemeta.webp');
  await page.locator('.account-nav-btn[data-section="avatars"]').click();
  await page.locator('.account-nav-btn[data-section="addons"]').click();
  await expect(logo).toHaveAttribute('src', 'https://images.example.invalid/cinemeta.webp');
  expect(reads).toBe(1);
  expect(writes).toEqual([]);
  await page.locator('#btnAccountSave').click();
  await expect(page.getByText('No hay cambios pendientes por guardar.', { exact: true })).toBeVisible();
  expect(writes).toEqual([]);
});

test('account restores styled avatar groups, the profile name and addon count', async ({ page }, testInfo) => {
  const files = ['assets/profile_icons/NetflixStyle/Naruto/Naruto.webp',
    'assets/profile_icons/NetflixStyle/Naruto/Sasuke.webp',
    'assets/profile_icons/MangaStyle/One Piece/Luffy.webp'];
  await prepareAccount(page, 'rpc', {
    respond(url) {
      if (url.pathname.endsWith('/addons')) return { body: [
        { id: 'one', name: 'Cinemeta', manifest_url: 'https://example.invalid/manifest.json' },
        { id: 'two', name: 'Catalog', manifest_url: 'https://example.invalid/other/manifest.json' },
      ] };
    },
    respondExternal(url) {
      if (url.pathname.includes('/git/ref/')) return { body: { object: { sha: 'a'.repeat(40) } } };
      if (url.pathname.includes('/git/trees/')) return { body: { tree: files.map(path => ({ path, type: 'blob' })) } };
    },
  });
  await page.locator('.account-nav-btn[data-section="avatars"]').click();
  await expect(page.locator('#avatarCurrentProfileName')).toHaveText('Synthetic profile');
  const pill = page.locator('#avatarStyleFilterPills .avatar-filter-pill').first();
  await expect(pill).toHaveClass(/is-active/);
  await expect(pill).toHaveCSS('background-color', 'rgb(255, 212, 121)');
  await expect(page.locator('#avatarsCatalogContainer .btn-open-avatar-collection')).toHaveCount(2);
  await page.screenshot({ path: testInfo.outputPath('account-avatar-groups.png') });
  await page.locator('[data-open-franchise="Naruto"]').click();
  await expect(page.locator('#avatarsCatalogContainer .netflix-avatar-card')).toHaveCount(2);
  await page.screenshot({ path: testInfo.outputPath('account-avatar-franchise.png') });
  await page.locator('.account-nav-btn[data-section="addons"]').click();
  await expect(page.locator('#accountAddonsCountLabel')).toHaveText('2 addons instalados');
  await expect(page.getByText(/Error al cargar cuenta/)).toHaveCount(0);
  await expect(page.locator('#accountAddonsListContainer > [data-index]')).toHaveCount(2);
});
