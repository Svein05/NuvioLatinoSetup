import { expect, test } from '@playwright/test';
import { prepareAccount } from './support/account.js';

const sha = 'a'.repeat(40);
const files = ['assets/profile_icons/NetflixStyle/Naruto Shippuden/Naruto1.webp',
  'assets/profile_icons/NetflixStyle/Naruto Shippuden/Naruto2.webp',
  'assets/profile_icons/NetflixStyle/Naruto Shippuden/Sasuke.webp',
  'assets/profile_icons/MangaStyle/One Piece/Luffy.webp'];

test('most-used avatars remain style-filtered, preserve scores and fill unranked styles without recording usage', async ({ page }) => {
  const votes = [];
  const ranked = [
    { key: 'NetflixStyle/Naruto Shippuden/Naruto2.webp', score: 9 },
    { key: 'MangaStyle/One Piece/Luffy.webp', score: 8 },
    { key: 'NetflixStyle/Naruto Shippuden/Naruto1.webp', score: 7 },
  ];
  await prepareAccount(page, 'rpc', { respondExternal(url, request) {
    if (url.pathname.includes('/git/ref/')) return { body: { object: { sha } } };
    if (url.pathname.includes('/git/trees/')) return { body: { tree: [...files,
      'assets/profile_icons/IconsStyle/Robot.webp'].map(path => ({ path, type: 'blob' })) } };
    if (url.pathname === '/api/avatars/ranking') {
      expect(url.searchParams.get('limit')).toBe('32');
      return { body: { environment: 'testing', items: ranked, totalUsage: 24 } };
    }
    if (url.pathname === '/api/avatars/usage') votes.push(request.postDataJSON());
  } });
  await page.locator('.account-nav-btn[data-section="avatars"]').click();
  const top = page.locator('#blockMostUsedAvatars');
  for (const [style, count, score] of [['NetflixStyle', 3, '9'], ['MangaStyle', 1, '8'], ['IconsStyle', 1, '0']]) {
    await page.locator(`[data-style-id="${style}"]`).click();
    await expect(top).toBeVisible();
    await expect(top.locator('[data-avatar-path]')).toHaveCount(count);
    await expect(top.locator('[data-avatar-path]').first()).toHaveAttribute('data-avatar-path', new RegExp(style));
    await expect(top.locator('.avatar-user-count-badge').first()).toHaveText(score);
  }
  await page.locator('[data-style-id="all"]').click();
  await expect(top.locator('[data-avatar-path]')).toHaveCount(5);
  await page.locator('#inputAvatarSearch').fill('naruto');
  await expect(top).toHaveCount(0);
  await page.locator('#inputAvatarSearch').fill('');
  await expect(top).toBeVisible();
  expect(votes).toEqual([]);
});

for (const blockedCache of [false, true]) {
  test(`avatar filters preserve character priority and failed refresh keeps the catalog${blockedCache ? ' with blocked cache' : ''}`, async ({ page }) => {
    let offline = false;
    if (blockedCache) await page.addInitScript(() => {
      const get = Storage.prototype.getItem;
      const set = Storage.prototype.setItem;
      Storage.prototype.getItem = function (key) {
        if (key === 'nuvio_avatars_tree_cache') throw new DOMException('synthetic blocked cache', 'SecurityError');
        return get.call(this, key);
      };
      Storage.prototype.setItem = function (key, value) {
        if (key === 'nuvio_avatars_tree_cache') throw new DOMException('synthetic blocked cache', 'SecurityError');
        return set.call(this, key, value);
      };
    });
    await prepareAccount(page, 'rpc', {
      respondExternal(url) {
        if (offline) return;
        if (url.pathname.includes('/git/ref/')) return { body: { object: { sha } } };
        if (url.pathname.includes('/git/trees/')) return { body: { tree: files.map(path => ({ path, type: 'blob' })) } };
      },
    });
    await page.locator('.account-nav-btn[data-section="avatars"]').click();
    const cards = page.locator('#avatarsCatalogContainer .netflix-avatar-card');
    await page.locator('#inputAvatarSearch').fill('naruto');
    await expect(cards).toHaveCount(2);
    await expect(cards.first().locator('img')).toHaveAttribute('src', new RegExp(`Naruto1.webp\\?v=${sha}$`));
    await page.locator('#inputAvatarSearch').fill('ob: naruto');
    await expect(cards).toHaveCount(3);
    offline = true;
    await page.locator('#btnRefreshAvatarsCatalog').click();
    await expect(page.locator('#latToastContainer')).toContainText('No se pudo actualizar el catálogo');
    await expect(cards).toHaveCount(3);
    await page.locator('#inputAvatarSearch').fill('pj: luffy');
    await expect(cards).toHaveCount(1);
    await expect(cards).toHaveAttribute('data-avatar-name', 'Luffy');
  });
}

test('an incomplete GitHub tree uses the pinned manifest without displaying a partial catalog', async ({ page }) => {
  const manifestCalls = [];
  await prepareAccount(page, 'rpc', {
    respondExternal(url) {
      if (url.pathname.includes('/git/ref/')) return { body: { object: { sha } } };
      if (url.pathname.includes('/git/trees/')) return { body: { truncated: true, tree: [{ type: 'blob', path: files[0] }] } };
      if (url.pathname.endsWith('/assets/profile_icons/manifest.json')) {
        manifestCalls.push(url.pathname);
        return { body: { styles: [{ style: 'NetflixStyle', franchises: [{ franchise: 'Naruto Shippuden', files: ['Naruto1.webp', 'Naruto2.webp', 'Sasuke.webp'] }] }] } };
      }
    },
  });
  await page.locator('.account-nav-btn[data-section="avatars"]').click();
  await page.locator('#inputAvatarSearch').fill('ob: naruto');
  await expect(page.locator('#avatarsCatalogContainer .netflix-avatar-card')).toHaveCount(3);
  expect(manifestCalls).toHaveLength(1);
  expect(manifestCalls[0]).toContain(`/${sha}/assets/`);
});
