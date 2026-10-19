import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';

test('mobile header opens once and closes with Escape without duplicate handlers', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await isolateExternalServices(page);
  await page.goto('/account/');
  const button = page.locator('#btnMobileHeaderMenu');
  const menu = page.locator('#mobileHeaderDropdown');
  await button.click();
  await expect(menu).toHaveClass(/is-open/);
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(menu).not.toHaveClass(/is-open/);
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await button.click();
  await expect(menu).toHaveClass(/is-open/);
});

test('desktop navigation restores the active page after hover and respects reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await isolateExternalServices(page);
  await page.goto('/');
  const nav = page.locator('header.lat-floating-nav nav');
  const wizard = nav.locator('a[href*="configuration"]');
  await wizard.hover();
  await expect(wizard).toHaveClass(/is-hovered/);
  await expect(nav.locator('.nav-pill-indicator')).toHaveCSS('transition-duration', '0s');
  await page.mouse.move(0, 500);
  await expect(nav.locator('a').first()).toHaveClass(/is-active/);
  await expect(nav.locator('.is-hovered')).toHaveCount(0);
});

for (const pathname of ['/configuration/', '/account/']) {
  test(`password controls at ${pathname} toggle once per click and announce their state`, async ({ page }) => {
    await isolateExternalServices(page);
    await page.goto(pathname);
    const button = page.locator('.btn-toggle-key:visible').first();
    const target = await button.getAttribute('data-target');
    const input = page.locator(`[id="${target}"]`);
    await expect(input).toHaveAttribute('type', 'password');
    await button.click();
    await expect(input).toHaveAttribute('type', 'text');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await button.click();
    await expect(input).toHaveAttribute('type', 'password');
    await expect(button).toHaveAttribute('aria-label', 'Mostrar contraseña');
  });
}
