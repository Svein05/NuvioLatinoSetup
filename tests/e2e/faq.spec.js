import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';

async function openFaq(page) {
  await isolateExternalServices(page);
  await page.goto('/');
  await page.locator('[data-faq]').scrollIntoViewIfNeeded();
  return page.locator('.faq-details');
}

test('FAQ opens and closes with a measured panel, fading edge and coordinated exclusive state', async ({ page }, testInfo) => {
  const items = await openFaq(page);
  await expect(page.locator('.faq-details[open]')).toHaveCount(0);
  const first = items.nth(0);
  await expect(first.locator('.faq-icon')).toHaveCSS('transition-duration', '0.35s');
  await first.locator('summary').click();
  const midway = await first.locator('.faq-panel').evaluate(panel => {
    panel.getAnimations({ subtree: true }).forEach(animation => { animation.pause(); animation.currentTime = 175; });
    return { height: panel.getBoundingClientRect().height, full: panel.firstElementChild.getBoundingClientRect().height,
      mask: getComputedStyle(panel).maskImage, blur: getComputedStyle(panel.firstElementChild).filter };
  });
  expect(midway.height).toBeGreaterThan(0);
  expect(midway.height).toBeLessThan(midway.full);
  expect(midway.mask).toContain('linear-gradient');
  expect(midway.blur).not.toBe('none');
  await page.screenshot({ path: testInfo.outputPath('faq-mid-opening.png') });
  await items.nth(1).locator('summary').click();
  await expect(first).toHaveAttribute('data-faq-open', 'false');
  await expect(items.nth(1)).toHaveAttribute('data-faq-open', 'true');
  await expect(first).not.toHaveAttribute('open', '');
  await expect(page.locator('.faq-details[open]')).toHaveCount(1);
  await expect(items.nth(1).locator('.faq-panel')).not.toHaveAttribute('data-animating', '');
  expect(await items.nth(1).locator('.faq-panel').evaluate(panel => ({ height: panel.style.height,
    mask: getComputedStyle(panel).maskImage, filter: getComputedStyle(panel.firstElementChild).filter })))
    .toEqual({ height: '', mask: 'none', filter: 'none' });
});

test('rapid reversals retain current height and keyboard activation keeps focus on the summary', async ({ page }) => {
  const items = await openFaq(page);
  const first = items.first();
  await first.locator('summary').focus();
  await page.keyboard.press('Enter');
  const heights = await first.evaluate(details => {
    const panel = details.querySelector('.faq-panel');
    panel.getAnimations({ subtree: true }).forEach(animation => { animation.pause(); animation.currentTime = 140; });
    const before = panel.getBoundingClientRect().height;
    details.querySelector('summary').click();
    const closing = panel.getBoundingClientRect().height;
    details.querySelector('summary').click();
    return [before, closing, panel.getBoundingClientRect().height];
  });
  expect(heights[0]).toBeGreaterThan(0);
  expect(Math.abs(heights[1] - heights[0])).toBeLessThan(.5);
  expect(Math.abs(heights[2] - heights[1])).toBeLessThan(.5);
  await expect(first.locator('.faq-panel')).not.toHaveAttribute('data-animating', '');
  await expect(first.locator('summary')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(first).not.toHaveAttribute('open', '');
  await expect(first.locator('.faq-panel')).toHaveAttribute('inert', '');
  await page.keyboard.press('Tab');
  await expect(items.nth(1).locator('summary')).toBeFocused();
});

test('resizing and content changes during opening settle at natural height on mobile and zoom', async ({ page }, testInfo) => {
  const items = await openFaq(page);
  await items.first().locator('summary').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await items.first().locator('.faq-panel-content p').evaluate(answer => { answer.textContent += ' Texto adicional para comprobar altura dinámica.'.repeat(10); });
  await expect(items.first().locator('.faq-panel')).not.toHaveAttribute('data-animating', '');
  await page.evaluate(() => { document.documentElement.style.zoom = '1.25'; });
  const dimensions = await items.first().locator('.faq-panel').evaluate(panel => ({
    panel: panel.getBoundingClientRect().height, content: panel.firstElementChild.getBoundingClientRect().height,
    inline: panel.style.height, overflow: getComputedStyle(panel).overflow,
  }));
  expect(dimensions.panel).toBeCloseTo(dimensions.content, 1);
  expect(dimensions.inline).toBe('');
  expect(dimensions.overflow).toBe('visible');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await items.first().locator('summary').evaluate(summary => {
    scrollTo({ top: scrollY + summary.getBoundingClientRect().top - 110, behavior: 'instant' });
  });
  await page.screenshot({ path: testInfo.outputPath('faq-mobile.png') });
});

test('reduced motion skips height travel, and bfcache cleanup preserves exclusive state without duplicate handlers', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const items = await openFaq(page);
  await expect(items.first().locator('.faq-icon')).toHaveCSS('transition-duration', '0s');
  await items.first().locator('summary').click();
  const properties = await items.first().locator('.faq-panel').evaluate(panel => panel.getAnimations({ subtree: true })
    .flatMap(animation => animation.effect.getKeyframes()).flatMap(frame => Object.keys(frame)));
  expect(properties).not.toContain('height');
  expect(properties).toContain('opacity');
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await expect(items.first()).toHaveAttribute('data-faq-open', 'true');
  await items.first().locator('summary').click();
  await expect(items.first()).not.toHaveAttribute('open', '');
  await items.nth(2).evaluate(details => { details.open = true; });
  await expect(items.nth(2).locator('summary')).toHaveAttribute('aria-expanded', 'true');
  await items.nth(3).evaluate(details => { details.open = true; });
  await expect(page.locator('.faq-details[open]')).toHaveCount(1);
});

for (const mode of ['no JavaScript', 'no animation API']) {
  test(`native FAQ remains usable and exclusive with ${mode}`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: mode !== 'no JavaScript' });
    const page = await context.newPage();
    try {
      if (mode === 'no animation API') await page.addInitScript(() => { Element.prototype.animate = undefined; });
      const items = await openFaq(page);
      await items.first().locator('summary').click();
      await expect(items.first()).toHaveAttribute('open', '');
      await items.nth(1).locator('summary').click();
      await expect(items.first()).not.toHaveAttribute('open', '');
      await expect(items.nth(1)).toHaveAttribute('open', '');
    } finally { await context.close(); }
  });
}
