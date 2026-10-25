import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';
import { openLanding, revealChapter } from './support/landing.js';

test('four scroll chapters explain seven steps and reverse without application writes', async ({ page }, testInfo) => {
  await openLanding(page);
  const writes = [];
  page.on('request', request => {
    if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url());
  });
  await expect(page.locator('.landing-story')).toHaveClass(/is-enhanced/);
  await expect(page.locator('.story-progress, [data-step]')).toHaveCount(0);
  for (const chapter of ['profile', 'library', 'style', 'assembly', 'library']) {
    await revealChapter(page, chapter);
    await expect(page.locator(`[data-scene="${chapter}"]`)).toHaveClass(/is-active/);
    await expect(page.locator(`[data-scene="${chapter}"]`)).toHaveCSS('opacity', '1');
  }
  await revealChapter(page, 'style');
  await expect(page.locator('[data-scene="style"]')).toHaveCSS('opacity', '1');
  const stage = page.locator('[data-chapter="style"] .story-stage');
  await expect(stage).toBeInViewport();
  expect((await stage.boundingBox()).y).toBeGreaterThanOrEqual(120);
  await page.screenshot({ path: testInfo.outputPath('desktop-style.png') });
  await page.locator('#explora-cuenta').evaluate(element => {
    const frame = element.querySelector('.account-showcase-frame');
    window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - 120 + (element.offsetHeight - frame.offsetHeight) * .85);
  });
  await expect(page.locator('.landing-account')).toHaveCSS('--avatar-change', '1.0000');
  await expect(page.locator('.landing-account-links a').first()).toHaveAttribute('href', './account/');
  await expect(page.locator('.story-scenes input, .story-scenes button, .account-showcase-scene button')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('desktop-account.png') });
  expect(writes).toEqual([]);
});

test('natural scrolling, mobile stacking and reduced motion retain every explanation', async ({ page }, testInfo) => {
  await openLanding(page);
  await page.goto('/#tu-biblioteca');
  await expect(page).toHaveURL(/#tu-biblioteca$/);
  await expect(page.locator('.landing-story')).toHaveAttribute('data-active-chapter', 'library');
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await expect(page.locator('.landing-story')).toHaveClass(/is-enhanced/);
  await page.setViewportSize({ width: 1440, height: 600 });
  await expect(page.locator('.landing-story')).not.toHaveClass(/is-enhanced/);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.landing-story')).not.toHaveClass(/is-enhanced/);
  for (const chapter of ['profile', 'library', 'style', 'assembly']) {
    const text = await page.locator(`[data-chapter="${chapter}"] .story-copy`).boundingBox();
    const scene = await page.locator(`[data-scene="${chapter}"]`).boundingBox();
    expect(scene.y).toBeGreaterThanOrEqual(text.y + text.height);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#tu-perfil').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('mobile-profile.png') });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('.landing-story')).not.toHaveClass(/is-enhanced/);
  await expect(page.locator('.landing-account')).not.toHaveClass(/is-enhanced/);
  await expect(page.locator('[data-scene]')).toHaveCount(4);
  await expect(page.locator('.preview-avatar-crossfade img').last()).toHaveCSS('opacity', '1');
  await expect(page.locator('.badge-carousel-track').first()).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.config-orbit')).toHaveCSS('animation-name', 'none');
});

test('finished landing copy uses genuine portrait artwork and catalog badges', async ({ page }, testInfo) => {
  await openLanding(page);
  await expect(page.locator('.landing-intro, .story-chapter-links, .landing-example-note')).toHaveCount(0);
  for (const section of await page.locator('.landing-story, .landing-account').all()) {
    await expect(section).not.toContainText(/preview|vista previa|de ejemplo|así se vería|así quedaría/i);
  }
  await revealChapter(page, 'style', .85);
  const enhanced = page.locator('.scene-poster-enhanced');
  await expect(enhanced).toHaveCSS('opacity', '1');
  await expect(enhanced).toHaveCSS('object-fit', 'contain');
  await expect.poll(() => enhanced.evaluate(image => image.naturalHeight / image.naturalWidth)).toBe(1.5);
  await expect(page.locator('.scene-stream-card .catalog-badge img')).toHaveCount(74);
  for (const row of await page.locator('.badge-carousel-window').all()) {
    await expect.poll(() => row.evaluate(element => {
      const window = element.getBoundingClientRect();
      return [...element.querySelectorAll('img')].some(image => {
        const box = image.getBoundingClientRect();
        return box.right > window.left && box.left < window.right && image.complete && image.naturalWidth > 0;
      });
    })).toBe(true);
  }
  await expect(page.locator('[data-scene="style"]')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: testInfo.outputPath('real-poster-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.scene-addon-stack, .preview-profile-tag')).toHaveCount(0);
  await expect(page.locator('.landing-account-links a')).toHaveCount(1);
  await page.locator('[data-scene="style"]').screenshot({ path: testInfo.outputPath('real-poster-mobile.png') });
});

test('presentation content and local assets remain usable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await isolateExternalServices(page);
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('[data-chapter]')).toHaveCount(4);
  for (const scene of await page.locator('[data-scene]').all()) await expect(scene).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explorar Cuenta', exact: true })).toHaveAttribute('href', './account/');
  for (const image of await page.locator('.landing-story img, .landing-account img').all()) {
    const response = await page.request.get(await image.getAttribute('src'));
    expect(response.ok()).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('.story-stage').first()).toHaveCSS('display', 'flex');
  for (const scene of await page.locator('[data-scene]').all()) await expect(scene).toBeVisible();
  await context.close();
});

test('text and scene stay pinned together, alternate sides and hold their finished state', async ({ page }, testInfo) => {
  await openLanding(page);
  for (const [index, name] of ['profile', 'library', 'style', 'assembly'].entries()) {
    const chapter = page.locator(`[data-chapter="${name}"]`);
    await revealChapter(page, name, .3);
    const initial = await chapter.locator('.story-copy').boundingBox();
    await expect(chapter.locator('[data-scene]')).toHaveCSS('--finish', '0.0000');
    await revealChapter(page, name, .85);
    await expect(chapter.locator('[data-scene]')).toHaveCSS('--finish', '1.0000');
    const final = await chapter.locator('.story-copy').boundingBox();
    const scene = await chapter.locator('.story-stage').boundingBox();
    expect(Math.abs(initial.y - final.y)).toBeLessThan(1);
    expect(final.y).toBeGreaterThanOrEqual(120);
    expect(final.y + final.height).toBeLessThanOrEqual(870);
    expect(scene.y + scene.height).toBeLessThanOrEqual(870);
    expect(index % 2 ? scene.x < final.x : scene.x > final.x).toBe(true);
    await revealChapter(page, name, .95);
    expect(Math.abs((await chapter.locator('.story-copy').boundingBox()).y - final.y)).toBeLessThan(1);
    await page.screenshot({ path: testInfo.outputPath(`finished-${name}.png`) });
  }
  await revealChapter(page, 'style', .3);
  await expect(page.locator('[data-scene="style"]')).toHaveCSS('--finish', '0.0000');
});

test('pinned compositions stay below navigation on short desktop screens', async ({ page }) => {
  await openLanding(page);
  for (const viewport of [{ width: 1024, height: 650 }, { width: 1440, height: 700 }]) {
    await page.setViewportSize(viewport);
    await revealChapter(page, 'style', .85);
    const copy = await page.locator('[data-chapter="style"] .story-copy').boundingBox();
    const stage = await page.locator('[data-chapter="style"] .story-stage').boundingBox();
    expect(copy.y).toBeGreaterThanOrEqual(120);
    expect(copy.y + copy.height).toBeLessThanOrEqual(viewport.height - 20);
    expect(stage.y + stage.height).toBeLessThanOrEqual(viewport.height - 20);
    const badges = await page.locator('.scene-stream-card').boundingBox();
    const posterOptions = await page.locator('.scene-style-options').boundingBox();
    expect(badges.y).toBeGreaterThanOrEqual(posterOptions.y + posterOptions.height);
    await page.locator('#explora-cuenta').evaluate(element => {
      const frame = element.querySelector('.account-showcase-frame');
      window.scrollTo(0, scrollY + element.getBoundingClientRect().top - 120 + (element.offsetHeight - frame.offsetHeight) * .85);
    });
    await expect(page.locator('.landing-account')).toHaveCSS('--avatar-change', '1.0000');
    for (const selector of ['.account-showcase-copy', '.account-showcase-scene', '.account-addon-scene']) {
      const rectangle = await page.locator(selector).boundingBox();
      expect(rectangle.y).toBeGreaterThanOrEqual(120);
      expect(rectangle.y + rectangle.height).toBeLessThanOrEqual(viewport.height - 20);
    }
  }
});

test('completed scenes remain pinned through additional native scroll travel', async ({ page }) => {
  await openLanding(page);
  await revealChapter(page, 'style', 1);
  const scene = page.locator('[data-scene="style"]');
  await expect(scene).toHaveCSS('--finish', '1.0000');
  const stage = page.locator('[data-chapter="style"] .story-stage');
  const before = await stage.boundingBox();
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'instant' }));
  await expect(scene).toHaveCSS('--finish', '1.0000');
  expect(Math.abs((await stage.boundingBox()).y - before.y)).toBeLessThan(1);
  await expect(scene).toBeInViewport();
});
