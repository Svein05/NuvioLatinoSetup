import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';

async function openKeys(page) {
  await isolateExternalServices(page);
  await page.goto('/configuration/');
  await page.locator('#btnContinueWithoutAccount').click();
  await page.locator('#btnNext').click();
}

for (const width of [1440, 390]) {
  test(`one lazy tutorial player switches providers, seeks and cleans up at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const media = [];
    page.on('request', request => { if (/\/assets\/videos\//.test(request.url())) media.push(request.url()); });
    await openKeys(page);
    expect(media).toHaveLength(0);
    await page.locator('[data-api-tutorial="mdblist"]').click();
    const dialog = page.locator('#apiKeyTutorial');
    const video = dialog.locator('video');
    await expect(dialog.locator('h2')).toContainText('MDBList');
    await expect(dialog.locator('.tutorial-index button')).toHaveCount(8);
    await expect(dialog.locator('.tutorial-index button').nth(6)).toBeEnabled();
    await expect.poll(() => video.evaluate(node => node.duration)).toBeGreaterThan(48);
    await dialog.locator('.tutorial-index button').nth(6).click();
    await expect.poll(() => video.evaluate(node => node.currentTime)).toBe(36.5);
    await dialog.locator('[data-tutorial-speed]').selectOption('1.5');
    await expect(video).toHaveJSProperty('playbackRate', 1.5);
    await dialog.locator('[data-tutorial-play]').click();
    await expect.poll(() => video.evaluate(node => node.currentTime)).toBeGreaterThan(36.6);
    await dialog.locator('[data-tutorial-close]').click();
    await expect(video).toHaveJSProperty('paused', true);
    await expect(page.locator('[data-api-tutorial="mdblist"]')).toBeFocused();
    await page.locator('[data-api-tutorial="tmdb"]').click();
    await expect(dialog.locator('h2')).toContainText('TMDB');
    await expect(dialog.locator('.tutorial-index button')).toHaveCount(10);
    await expect.poll(() => video.evaluate(node => node.duration)).toBeGreaterThan(60);
    await expect(video).toHaveJSProperty('playbackRate', 1);
    await page.keyboard.press('Escape');
    await page.locator('[data-api-tutorial="mdblist"]').click();
    await expect(dialog.locator('.tutorial-index button')).toHaveCount(8);
    expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  });
}

test('tutorial videos support byte ranges for seeking in the served artifact', async ({ request }) => {
  const response = await request.get('/assets/videos/tutorial/tutorial-mdblist-apikey.mp4', { headers: { Range: 'bytes=0-63' } });
  expect(response.status()).toBe(206);
  expect(response.headers()['content-range']).toMatch(/^bytes 0-63\/\d+$/);
  expect((await response.body()).byteLength).toBe(64);
});

test('player fullscreen excludes the index and returns without closing the dialog', async ({ page }) => {
  await openKeys(page);
  await page.locator('[data-api-tutorial="tmdb"]').click();
  const player = page.locator('[data-tutorial-player]');
  await page.locator('[data-tutorial-fullscreen]').click();
  await expect.poll(() => player.evaluate(node => document.fullscreenElement === node)).toBe(true);
  expect(await player.locator('.tutorial-index').count()).toBe(0);
  await page.locator('[data-tutorial-fullscreen]').click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await expect(page.locator('#apiKeyTutorial')).toBeVisible();
});
