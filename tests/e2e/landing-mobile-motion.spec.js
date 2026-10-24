import { expect, test } from '@playwright/test';
import { openLanding, revealChapter } from './support/landing.js';
import { isolateExternalServices } from './support/offline-services.js';

async function inspectActivity(page) {
  return page.locator('.preview-watch-poster').evaluateAll(posters => posters.map(poster => {
    const track = poster.querySelector('.preview-watch-progress');
    const bounds = poster.getBoundingClientRect();
    const bar = track.getBoundingClientRect();
    return { contained: bar.left > bounds.left && bar.right < bounds.right && bar.bottom < bounds.bottom,
      radius: parseFloat(getComputedStyle(poster).borderRadius),
      background: getComputedStyle(track).backgroundColor,
      fill: parseFloat(getComputedStyle(track, '::before').width) / bar.width };
  }));
}

test('activity posters have minimal rounding and inset finite progress tracks at desktop and mobile sizes', async ({ page }, testInfo) => {
  await openLanding(page);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.locator('.preview-activity').scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator('.preview-watch-poster img').evaluateAll(images =>
      images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
    const posters = await inspectActivity(page);
    expect(posters).toHaveLength(4);
    for (const poster of posters) {
      expect(poster.contained).toBe(true);
      expect(poster.radius).toBeLessThanOrEqual(3);
      expect(poster.background).not.toBe('rgba(0, 0, 0, 0)');
      expect(poster.fill).toBeGreaterThan(.3);
      expect(poster.fill).toBeLessThan(.85);
    }
    await page.locator('.preview-activity').screenshot({ path: testInfo.outputPath(`activity-${viewport.width}.png`) });
  }
});

test('fast wheel input is paced only inside the story and keyboard/reduced-motion remain native', async ({ page }) => {
  await openLanding(page);
  await page.mouse.move(700, 400);
  await page.mouse.wheel(0, 300);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(200);
  await revealChapter(page, 'profile', .1);
  const start = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 2400);
  await page.waitForTimeout(200);
  const paced = await page.evaluate(() => scrollY);
  expect(paced - start).toBeGreaterThan(0);
  expect(paced - start).toBeLessThan(100);
  await page.keyboard.press('End');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight - innerHeight - scrollY)).toBeLessThan(2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#tu-perfil').scrollIntoViewIfNeeded();
  const reduced = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 700);
  await expect.poll(() => page.evaluate(start => scrollY - start, reduced)).toBeGreaterThan(300);
});

test('mobile surfaces avoid live backdrop blur and do not rewrite static scene contents while scrolling', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3,
    isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await isolateExternalServices(page);
  await page.route('**/api/poster-feed', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({
    schemaVersion: 1, generatedAt: new Date().toISOString(), items: Array.from({ length: 20 }, (_, id) => ({
      id: id + 1, mediaType: 'movie', title: 'Fixture ' + id, posterPath: '/mobile_fixture_' + id + '.jpg',
    })),
  }) }));
  await page.route('https://image.tmdb.org/**', route => {
    const index = Number(route.request().url().match(/mobile_fixture_(\d+)/)?.[1] || 0);
    return route.fulfill({ path: 'assets/preview/landing/' + ['inception.jpg', 'matrix.jpg', 'interstellar.jpg', 'godfather.jpg'][index % 4] });
  });
  await page.goto('/');
  await expect(page.locator('[data-poster-wall]')).toHaveClass(/is-ready/);
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  await page.locator('[data-scene="profile"]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-scene="profile"]')).toHaveClass(/is-in-view/);
  await expect(page.locator('.story-stage').first()).toHaveCSS('backdrop-filter', 'none');
  await page.waitForTimeout(100);
  const mutations = await page.locator('[data-scene="profile"]').evaluate(async scene => {
    let count = 0;
    const observer = new MutationObserver(records => { count += records.length; });
    observer.observe(scene, { attributes: true, childList: true, characterData: true, subtree: true });
    const start = scrollY;
    for (let index = 1; index <= 8; index++) {
      window.scrollTo({ top: start + index * 2, behavior: 'instant' });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    observer.disconnect();
    return count;
  });
  expect(mutations).toBe(0);
  const session = await context.newCDPSession(page);
  const start = await page.evaluate(() => scrollY);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 650 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: 450 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: 150 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(150);
  const travel = await page.evaluate(() => scrollY);
  expect(travel - start).toBeGreaterThan(0);
  expect(travel - start).toBeLessThan(120);
  await page.locator('.preview-activity').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('mobile-dpr3.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});
