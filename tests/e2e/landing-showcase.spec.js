import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';

async function openLanding(page) {
  await isolateExternalServices(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
}

async function revealChapter(page, chapter, progress = .4) {
  await page.locator(`[data-chapter="${chapter}"]`).evaluate((element, value) => {
    const rectangle = element.getBoundingClientRect();
    window.scrollTo(0, window.scrollY + rectangle.top + rectangle.height * value - innerHeight * .45);
  }, progress);
  await expect(page.locator('.landing-story')).toHaveAttribute('data-active-chapter', chapter);
}

test('four scroll chapters explain seven steps and reverse without application writes', async ({ page }, testInfo) => {
  await openLanding(page);
  const writes = [];
  page.on('request', request => {
    if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url());
  });
  await expect(page.locator('.landing-story')).toHaveClass(/is-enhanced/);
  await expect(page.locator('[data-step]')).toHaveCount(7);
  for (const chapter of ['profile', 'library', 'style', 'assembly', 'library']) {
    await revealChapter(page, chapter);
    await expect(page.locator(`[data-scene="${chapter}"]`)).toHaveClass(/is-active/);
    await expect(page.locator(`[data-scene="${chapter}"]`)).toHaveCSS('opacity', '1');
    await expect(page.locator(`[data-chapter-link="${chapter}"]`)).toHaveAttribute('aria-current', 'step');
  }
  await revealChapter(page, 'style');
  await expect(page.locator('[data-scene="style"]')).toHaveCSS('opacity', '1');
  const stage = page.locator('.story-stage');
  await expect(stage).toBeInViewport();
  expect((await stage.boundingBox()).y).toBeGreaterThanOrEqual(120);
  await page.screenshot({ path: testInfo.outputPath('desktop-style.png') });
  await page.locator('#explora-cuenta').evaluate(element => {
    window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - 120);
  });
  await expect(page.locator('.landing-account')).toHaveCSS('--avatar-change', '1.0000');
  await expect(page.locator('.landing-account-links a').first()).toHaveAttribute('href', './account/');
  await expect(page.locator('.story-scenes input, .story-scenes button, .account-showcase-scene button')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('desktop-account.png') });
  expect(writes).toEqual([]);
});

test('chapter anchors, mobile stacking and reduced motion retain every explanation', async ({ page }, testInfo) => {
  await openLanding(page);
  await page.locator('[data-chapter-link="library"]').click();
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
    const text = await page.locator(`[data-chapter="${chapter}"]`).boundingBox();
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
  await expect(page.locator('.story-stage')).toHaveCSS('display', 'contents');
  for (const scene of await page.locator('[data-scene]').all()) await expect(scene).toBeVisible();
  await context.close();
});
