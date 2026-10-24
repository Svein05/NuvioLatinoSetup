import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';

async function expectUnclippedBadges(page) {
  const violations = await page.locator('.badge-carousel-window').evaluateAll(rows => rows.flatMap(row => {
    const badge = row.querySelector('.catalog-badge').getBoundingClientRect();
    const clipped = [];
    for (let parent = row; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (!['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowY) && style.maskImage === 'none') continue;
      const bounds = parent.getBoundingClientRect();
      if (badge.top < bounds.top - .01 || badge.bottom > bounds.bottom + .01) clipped.push(parent.className);
    }
    return clipped;
  }));
  expect(violations).toEqual([]);
}

for (const density of [1, 1.25, 2, 3]) {
  test(`badge rows keep vertical paint clearance at DPR ${density} across zoom levels`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: density,
      reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      await isolateExternalServices(page);
      await page.goto('/');
      const card = page.locator('.scene-stream-card');
      for (const zoom of [.67, 1, 1.25, 2]) {
        await page.evaluate(scale => {
          document.documentElement.style.zoom = String(scale);
          const scene = document.querySelector('[data-scene="style"]');
          // Isolate the rasterized carousel from scroll-timeline reveal timing.
          scene.querySelector('.scene-stream-card').style.setProperty('opacity', '1', 'important');
          scene.querySelector('.scene-stream-card').style.setProperty('transform', 'none', 'important');
          scene.querySelectorAll('.badge-carousel-track').forEach(track => track.getAnimations().forEach(animation => {
            animation.pause(); animation.currentTime = 13723;
          }));
        }, zoom);
        await card.scrollIntoViewIfNeeded();
        await expect(card.locator('h4')).toBeVisible();
        const rows = page.locator('.badge-carousel-window');
        for (const row of await rows.all()) {
          await expect(row).toHaveCSS('overflow-y', 'visible');
          await expect(row).toHaveCSS('mask-image', 'none');
        }
        const clearance = await card.locator('.badge-carousel').evaluate(carousel => {
          const bounds = carousel.getBoundingClientRect();
          const badges = [...carousel.querySelectorAll('.catalog-badge')].map(badge => badge.getBoundingClientRect());
          return { top: Math.min(...badges.map(badge => badge.top)) - bounds.top,
            bottom: bounds.bottom - Math.max(...badges.map(badge => badge.bottom)) };
        });
        expect(clearance.top).toBeGreaterThan(0);
        expect(clearance.bottom).toBeGreaterThan(0);
        await expectUnclippedBadges(page);
        if (density === 1.25 || (density === 3 && zoom === 2)) {
          await page.screenshot({ path: testInfo.outputPath(`badges-zoom-${zoom}.png`), scale: 'css' });
        }
      }
    } finally { await context.close(); }
  });
}

test('style scene grows with its content instead of shrinking or clipping the badge card', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await isolateExternalServices(page);
  await page.goto('/');
  for (const size of [{ width: 390, height: 650 }, { width: 1024, height: 650 }, { width: 1440, height: 700 }]) {
    await page.setViewportSize(size);
    const stage = page.locator('[data-chapter="style"] .story-stage');
    const before = await stage.evaluate(element => element.getBoundingClientRect().height);
    await page.locator('.scene-style-options h4').evaluate(heading => {
      heading.textContent = 'Una biblioteca con todos tus detalles y preferencias '.repeat(15);
    });
    await expectUnclippedBadges(page);
    expect(await stage.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(before);
    await page.locator('.scene-style-options h4').evaluate(heading => { heading.textContent = 'El Origen'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
