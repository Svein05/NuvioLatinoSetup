import { expect, test } from '@playwright/test';
import { openLanding, revealChapter } from './support/landing.js';
import { readFileSync } from 'node:fs';

test('floating scenes have no enclosing panels and keep profile and library centered', async ({ page }) => {
  await openLanding(page);
  await expect(page.locator('.story-progress, .account-scene-tabs')).toHaveCount(0);
  for (const name of ['profile', 'library', 'style', 'assembly']) {
    await revealChapter(page, name, .85);
    await expect(page.locator(`[data-chapter="${name}"] .story-stage`)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
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

test('avatar strip cycles the complete catalog with bounded images and addons reorder before configuration', async ({ page }, testInfo) => {
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
  expect(visited).toBe(count);
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
