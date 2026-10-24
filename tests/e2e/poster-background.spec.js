import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';

const feed = () => ({ schemaVersion: 1, generatedAt: new Date().toISOString(),
  items: Array.from({ length: 30 }, (_, index) => ({ id: index + 1, mediaType: index % 2 ? 'movie' : 'tv',
    title: 'Synthetic title ' + index, posterPath: '/synthetic_' + index + '.jpg' })) });

async function prepare(page, { offline = false } = {}) {
  await isolateExternalServices(page);
  let reads = 0;
  await page.route('**/api/poster-feed', route => {
    reads++;
    return route.fulfill({ status: offline ? 503 : 200, contentType: 'application/json', body: JSON.stringify(offline ? {} : feed()) });
  });
  await page.route('https://image.tmdb.org/**', route => {
    const index = Number(route.request().url().match(/synthetic_(\d+)/)?.[1] || 0);
    return route.fulfill({ path: 'assets/preview/landing/' + ['inception.jpg', 'matrix.jpg', 'interstellar.jpg', 'godfather.jpg'][index % 4] });
  });
  await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.scrollBehavior = 'auto'; }));
  return () => reads;
}

test('opposite moving rows share cached data across pages and never make upstream API calls', async ({ page }, testInfo) => {
  const reads = await prepare(page);
  const upstream = [];
  page.on('request', request => { if (request.url().includes('api.themoviedb.org')) upstream.push(request.url()); });
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const path of ['/', '/configuration/', '/account/']) {
    await page.goto(path);
    const wall = page.locator('[data-poster-wall]');
    await expect(wall).toHaveClass(/is-ready/);
    await expect(wall).toHaveCSS('z-index', '-1');
    if (path === '/configuration/') await expect(page.locator('#wizardView')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('.poster-wall-track')).toHaveCount(2);
    await expect(page.locator('.poster-wall-track').first()).toHaveCSS('animation-name', 'poster-wall-left');
    await expect(page.locator('.poster-wall-track').last()).toHaveCSS('animation-name', 'poster-wall-right');
    expect(await page.locator('.poster-wall-track img').count()).toBeLessThanOrEqual(20);
    if (path !== '/') {
      await expect(wall).toHaveAttribute('data-poster-theme', 'interior');
      await expect(wall).toHaveCSS('opacity', '0.22');
    }
    await page.screenshot({ path: testInfo.outputPath(path === '/' ? 'landing.png' : path.split('/')[1] + '.png') });
  }
  expect(reads()).toBe(1);
  expect(upstream).toEqual([]);
});

test('reduced motion, visibility and bfcache work without a floating pause button', async ({ page }) => {
  await prepare(page);
  await page.goto('/configuration/');
  await expect(page.locator('[data-poster-wall]')).toHaveClass(/is-ready/);
  await expect(page.locator('[data-poster-pause-control]')).toHaveCount(0);
  await page.goto('/account/');
  await expect(page.locator('.poster-wall-track').first()).toHaveCSS('animation-play-state', 'running');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('.poster-wall-track').first()).toHaveCSS('animation-play-state', 'paused');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await expect(page.locator('.poster-wall-track')).toHaveCount(2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.poster-wall-track').first()).toHaveCSS('animation-name', 'none');
});

test('mobile, blocked storage and offline/no-JS retain readable pages and a static fallback', async ({ page, browser }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('blocked', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('blocked', 'SecurityError'); };
  });
  await prepare(page);
  await page.goto('/configuration/');
  await expect(page.locator('[data-poster-wall]')).toHaveClass(/is-ready/);
  expect(await page.locator('.poster-wall-track img').count()).toBeLessThanOrEqual(12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile.png') });
  const context = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await context.newPage();
  await isolateExternalServices(staticPage);
  await staticPage.goto('http://127.0.0.1:4173/');
  await expect(staticPage.locator('.poster-wall-fallback')).toBeVisible();
  await expect(staticPage.locator('[data-poster-pause-control]')).toBeHidden();
  await context.close();
});

test('missing feed does not block wizard interaction', async ({ page }) => {
  await prepare(page, { offline: true });
  await page.goto('/configuration/');
  await expect(page.locator('[data-poster-wall]')).not.toHaveClass(/is-ready/);
  await expect(page.locator('.poster-wall-fallback')).toBeVisible();
  await expect(page.locator('[data-poster-pause-control]')).toBeHidden();
  await expect(page.locator('body')).not.toContainText('Poster feed unavailable');
});

test('navigation restores the same images and animation phase before deferred app startup', async ({ page }) => {
  const reads = await prepare(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('[data-poster-wall]')).toHaveClass(/is-ready/);
  await page.evaluate(() => {
    document.querySelectorAll('.poster-wall-track').forEach(track => {
      const animation = track.getAnimations()[0];
      animation.pause();
      animation.currentTime = Number(animation.effect.getTiming().duration) * .4;
    });
  });
  const before = await page.locator('.poster-wall-track img').evaluateAll(images => images.map(image => image.src));
  await page.route('**/*', route => {
    if (route.request().resourceType() === 'script') return route.abort();
    return route.fallback();
  });
  await page.goto('/account/');
  await expect(page.locator('[data-poster-wall]')).toHaveAttribute('data-poster-restored', 'true');
  await expect(page.locator('[data-poster-wall]')).toHaveClass(/is-ready/);
  expect(await page.locator('.poster-wall-track img').evaluateAll(images => images.map(image => image.src))).toEqual(before);
  const delay = await page.locator('.poster-wall-track').first().evaluate(track => parseFloat(track.style.animationDelay));
  expect(delay).toBeCloseTo(-.4 * 105 / 8, 1);
  expect(reads()).toBe(1);
  await expect(page.locator('.poster-wall-fallback')).toHaveCSS('opacity', '0');
});
