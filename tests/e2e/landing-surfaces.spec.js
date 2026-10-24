import { expect, test } from '@playwright/test';
import { openLanding, revealChapter } from './support/landing.js';
import { readFileSync } from 'node:fs';

test('landing refreshes its avatar strip from the shared public GitHub catalog', async ({ page }) => {
  await openLanding(page);
  const sha = 'b'.repeat(40);
  await page.route('https://api.github.com/**', route => {
    const body = route.request().url().includes('/git/ref/') ? { object: { sha } }
      : { tree: [{ type: 'blob', path: 'assets/profile_icons/NetflixStyle/Naruto/Naruto.webp' }] };
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.reload();
  await expect(page.locator('[data-avatar-carousel] img')).toHaveCount(14);
  await expect(page.locator('[data-avatar-carousel] img').first()).toHaveAttribute('src', new RegExp(`Naruto.webp\\?v=${sha}$`));
});

test('translucent scenes avoid opaque panels and keep profile and library centered', async ({ page }) => {
  await openLanding(page);
  await expect(page.locator('.story-progress, .account-scene-tabs')).toHaveCount(0);
  for (const name of ['profile', 'library', 'style', 'assembly']) {
    await revealChapter(page, name, .85);
    await expect(page.locator(`[data-chapter="${name}"] .story-stage`)).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.035)');
  }
  for (const [name, selector, progress] of [
    ['profile', '.profile-picker', .05],
    ['profile', '.profile-create-modal', .4],
    ['library', '.collection-browser', .2],
    ['library', '.api-complete-card', .85],
  ]) {
    await revealChapter(page, name, progress);
    const scene = await page.locator(`[data-scene="${name}"]`).boundingBox();
    const component = await page.locator(selector).boundingBox();
    expect(Math.abs(component.y + component.height / 2 - scene.y - scene.height / 2)).toBeLessThan(2);
  }
});

test('avatar strip cycles a ranked pool with bounded images and addons reorder before configuration', async ({ page }, testInfo) => {
  await openLanding(page);
  const manifest = JSON.parse(readFileSync('assets/profile_icons/manifest.json', 'utf8'));
  const count = manifest.styles.flatMap(style => style.franchises.flatMap(franchise => franchise.files)).length;
  const strip = page.locator('[data-avatar-carousel]');
  await expect(strip.locator('img')).toHaveCount(14);
  const visited = await strip.evaluate((element, count) => {
    const sources = new Set();
    for (let index = 0; index < count; index++) {
      sources.add(element.firstElementChild.getAttribute('src'));
      element.dispatchEvent(new AnimationEvent('animationiteration', { animationName: 'avatar-catalog-travel' }));
    }
    return sources.size;
  }, count);
  expect(visited).toBeGreaterThan(0);
  expect(visited).toBeLessThanOrEqual(32);
  await page.locator('#explora-cuenta').evaluate(element => {
    const frame = element.querySelector('.account-showcase-frame');
    window.scrollTo(0, scrollY + element.getBoundingClientRect().top - 120 + (element.offsetHeight - frame.offsetHeight) * .05);
  });
  await expect(page.locator('.landing-account')).toHaveCSS('--addon-order', '0.0000');
  expect((await page.locator('.addon-metadata').boundingBox()).y).toBeGreaterThan((await page.locator('.addon-streams').boundingBox()).y);
  await expect(page.locator('.account-addon-settings')).toHaveCSS('opacity', '0');
  await page.locator('#explora-cuenta').evaluate(element => {
    const frame = element.querySelector('.account-showcase-frame');
    window.scrollTo(0, scrollY + element.getBoundingClientRect().top - 120 + (element.offsetHeight - frame.offsetHeight) * .85);
  });
  await expect(page.locator('.landing-account')).toHaveCSS('--addon-order', '1.0000');
  await expect(page.locator('.account-addon-settings')).toHaveCSS('opacity', '1');
  expect((await page.locator('.addon-metadata').boundingBox()).y).toBeLessThan((await page.locator('.addon-streams').boundingBox()).y);
  await expect(page.locator('.avatar-showcase-track')).toHaveCSS('animation-play-state', 'running');
  const cards = await page.locator('.preview-activity-grid > div').all();
  const first = await cards[0].boundingBox();
  const second = await cards[1].boundingBox();
  expect(second.x - first.x - first.width).toBeLessThanOrEqual(17);
  const account = await page.locator('.account-showcase-scene').boundingBox();
  const addons = await page.locator('.account-addon-scene').boundingBox();
  expect(addons.x).toBeGreaterThan(account.x + account.width);
  await page.screenshot({ path: testInfo.outputPath('account-wide.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.account-addon-scene').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('account-mobile.png') });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(strip).toHaveCSS('animation-name', 'none');
});


test('landing carousel uses most-used avatars without recording usage', async ({ page }) => {
  await openLanding(page);
  await page.route('https://api.github.com/**', route => {
    const body = route.request().url().includes('/git/ref/') ? { object: { sha: 'a'.repeat(40) } }
      : { tree: ['A', 'B', 'C'].map(name => ({ type: 'blob', path: 'assets/profile_icons/NetflixStyle/Show/' + name + '.webp' })) };
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.route('**/api/avatars/ranking**', route => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ items: [
      { key: 'NetflixStyle/Show/B.webp', score: 20 }, { key: 'NetflixStyle/Show/A.webp', score: 10 },
    ] }),
  }));
  const writes = [];
  page.on('request', request => { if (request.method() === 'POST') writes.push(request.url()); });
  await page.reload();
  const images = page.locator('[data-avatar-carousel] img');
  await expect(images.first()).toHaveAttribute('src', /B.webp/);
  await expect(images.nth(1)).toHaveAttribute('src', /A.webp/);
  expect(await images.evaluateAll(nodes => nodes.every(image => !image.src.includes('/C.webp')))).toBe(true);
  await expect(page.locator('#account-showcase-title')).toHaveText('Tu espacio sigue evolucionando contigo.');
  expect(writes).toEqual([]);
});
