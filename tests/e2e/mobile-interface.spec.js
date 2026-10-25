import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';
import { prepareAccount } from './support/account.js';

test('header clusters fit intrinsically through resizing and longer runtime labels', async ({ page }) => {
  await isolateExternalServices(page);
  await page.goto('/');
  const header = page.locator('header.lat-floating-nav');
  for (const width of [1440, 1137, 1081, 931, 761, 641, 390, 320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => header.evaluate(h => {
      const items = [...h.children].filter(e => getComputedStyle(e).display !== 'none').map(e => e.getBoundingClientRect());
      return items.every((box, i) => box.right <= h.getBoundingClientRect().right && (!i || items[i - 1].right <= box.left));
    })).toBe(true);
    const shadow = await page.locator('.hero-title-shadow').evaluate(e => ({
      title: getComputedStyle(e).textShadow, accent: getComputedStyle(e.querySelector('span')).textShadow,
    }));
    expect(shadow.title).not.toBe('none');
    expect(shadow.accent).toBe(shadow.title);
  }
  await header.locator('.lat-brand-text').evaluate(e => { e.textContent = 'A considerably longer community project title'; });
  await expect(header).not.toHaveAttribute('data-nav-layout', 'wide');
  expect(await page.locator('[data-nav-measure]').count()).toBe(0);
});

test('account addon configuration, semantic image fallback and wrapping preserve profile data', async ({ page }) => {
  const writes = [];
  page.on('request', r => { if (r.method() === 'POST' && /sync_push|\/api\/avatars\/usage/.test(r.url())) writes.push(r.url()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareAccount(page, 'rpc', {
    respond(url) {
      if (url.pathname.endsWith('/sync_pull_profiles')) return { body: [{ profile_index: 1, name: 'Native profile', avatar_url: null, avatar_id: 'native-7' }] };
      if (url.pathname.endsWith('/addons')) return { body: [
        { name: 'AIOMetadata', manifest_url: 'https://addon.invalid/first/manifest.json', logo: '/broken-addon-regression.png' },
        { name: 'Declared provider', manifest_url: 'https://addon.invalid/second/manifest.json' },
        { name: 'LAT-ADD', manifest_url: 'https://addon.invalid/third/manifest.json' },
      ] };
    },
    respondExternal(url) {
      if (url.hostname === 'addon.invalid') return { body: { behaviorHints: { configurationRequired: url.pathname.includes('second') } } };
    },
  });
  await page.locator('.account-nav-btn[data-section="addons"]').click();
  const rows = page.locator('.account-addon-card');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0).locator('[data-addon-configure]')).toHaveAttribute('href', 'https://addon.invalid/first/configure');
  await expect(rows.nth(1).locator('[data-addon-configure]')).toHaveAttribute('href', 'https://addon.invalid/second/configure');
  await expect(rows.nth(2).locator('[data-addon-configure]')).toBeHidden();
  await expect(rows.first().locator('img')).toHaveAttribute('src', '/assets/icons/addon-placeholder.svg');
  await expect(page.locator('#sidebarActiveAvatar')).toHaveAttribute('src', '/assets/icons/avatar-placeholder.svg');
  await page.setViewportSize({ width: 320, height: 844 });
  for (const row of await rows.all()) {
    expect(await row.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
    expect((await row.locator('.account-addon-logo').boundingBox()).width).toBe(44);
    await expect(row.locator('h5')).toBeVisible();
  }
  expect(writes).toEqual([]);
});

test('avatar previews complete actual rows after resize without dropping focus or recording usage', async ({ page }) => {
  const writes = [];
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareAccount(page, 'rpc', { respondExternal(url, request) {
    if (request.method() === 'POST' && /sync_push|\/api\/avatars\/usage/.test(url.href)) writes.push(url.href);
    if (url.pathname.includes('/git/ref/')) return { body: { object: { sha: 'a'.repeat(40) } } };
    if (url.pathname.includes('/git/trees/')) return { body: { tree: Array.from({ length: 17 }, (_, i) => ({ type: 'blob', path: `assets/profile_icons/NetflixStyle/Naruto/Hero${i}.webp` })) } };
    if (url.pathname === '/api/avatars/ranking') return { body: { environment: 'testing', items: [], totalUsage: 0 } };
  } });
  await page.locator('.account-nav-btn[data-section="avatars"]').click();
  const grid = page.locator('[data-avatar-grid]').first();
  await expect(grid.locator('[data-avatar-path]')).toHaveCount(9);
  await grid.locator('button').nth(8).focus();
  await page.setViewportSize({ width: 900, height: 900 });
  await expect(grid.locator('button')).toHaveCount(12);
  await expect(grid.locator('button').nth(8)).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(grid.locator('button')).toHaveCount(8);
  await expect(grid.locator('button').last()).toBeFocused();
  expect(writes).toEqual([]);
});
