import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';

for (const width of [390, 1440]) {
  test(`landing ships two decoded strip resources and opposite loops at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await isolateExternalServices(page);
    const calls = [];
    page.on('request', request => {
      if (/api\/poster-feed|image\.tmdb\.org/.test(request.url())) calls.push(request.url());
    });
    await page.goto('/');
    const tracks = page.locator('.hero-strip-track');
    await expect(tracks).toHaveCount(2);
    await expect.poll(() => tracks.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth))).toBe(true);
    const sources = await tracks.locator('img').evaluateAll(images => images.map(image => image.currentSrc));
    expect(new Set(sources).size).toBe(2);
    expect(sources.every(source => source.includes(width < 640 ? '-mobile.webp' : '-desktop.webp'))).toBe(true);
    const directions = await tracks.evaluateAll(nodes => nodes.map(node => getComputedStyle(node).animationDirection));
    expect(directions).toEqual(['normal', 'reverse']);
    const geometry = await tracks.first().evaluate(track => ({
      cycle: track.getBoundingClientRect().width / 2,
      viewport: innerWidth,
      posters: Number(getComputedStyle(track.closest('.hero-strip-wall')).getPropertyValue('--poster-count')),
    }));
    expect(geometry.cycle - geometry.cycle / geometry.posters).toBeGreaterThanOrEqual(geometry.viewport - 1);
    expect(calls).toEqual([]);
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, 1800); });
    await expect(page.locator('.hero-strip-wall')).toHaveClass(width < 640 ? /is-paused/ : /hero-strip-wall/);
    if (width < 640) {
      await expect(tracks.first()).toHaveCSS('animation-play-state', 'paused');
      await page.evaluate(() => scrollTo(0, 0));
      await expect(tracks.first()).toHaveCSS('animation-play-state', 'running');
    }
  });
}

test('mobile account and assistant use static artwork without live poster requests', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await isolateExternalServices(page);
  const calls = [];
  page.on('request', request => {
    if (/api\/poster-feed|image\.tmdb\.org/.test(request.url())) calls.push(request.url());
  });
  for (const path of ['/account/', '/configuration/']) {
    await page.goto(path);
    await expect(page.locator('.poster-wall-track')).toHaveCount(0);
    await expect(page.locator('.poster-wall-fallback')).toBeVisible();
  }
  expect(calls).toEqual([]);
});

test('landing strips remain visible without JavaScript and stop with reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await isolateExternalServices(page);
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('.hero-strip-track').first()).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.hero-strip-track img').first()).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await context.close();
});

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

test('reduced motion, visibility and bfcache work without a floating pause button', async ({ page }) => {
  await prepare(page);
  await page.goto('/configuration/');
  await expect(page.locator('[data-poster-wall]')).toHaveClass(/is-ready/);
  await expect(page.locator('[data-poster-pause-control]')).toHaveCount(0);
  await page.goto('/account/');
  await expect.poll(() => page.locator('.poster-wall-track').first().evaluate(t => t.getAnimations()[0]?.playState)).toBe('running');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => page.locator('.poster-wall-track').first().evaluate(t => t.getAnimations()[0]?.playState)).toBe('paused');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await expect(page.locator('.poster-wall-track')).toHaveCount(2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.locator('.poster-wall-track').first().evaluate(t => t.getAnimations()[0]?.playState)).toBe('paused');
});

test('missing feed does not block wizard interaction', async ({ page }) => {
  await prepare(page, { offline: true });
  await page.goto('/configuration/');
  await expect(page.locator('[data-poster-wall]')).not.toHaveClass(/is-ready/);
  await expect(page.locator('.poster-wall-fallback')).toBeVisible();
  await expect(page.locator('[data-poster-pause-control]')).toBeHidden();
  await expect(page.locator('body')).not.toContainText('Poster feed unavailable');
});

const feed = () => ({ schemaVersion: 1, generatedAt: new Date().toISOString(),
  items: Array.from({ length: 30 }, (_, index) => ({ id: index + 1, mediaType: index % 2 ? 'movie' : 'tv',
    title: 'Synthetic title ' + index, posterPath: '/synthetic_' + index + '.jpg' })) });
