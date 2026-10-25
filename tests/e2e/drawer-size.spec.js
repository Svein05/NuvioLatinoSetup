import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';

for (const width of [1440, 390]) {
  test('index fits its host and restores natural height at ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await isolateExternalServices(page);
    await page.goto('/configuration/');
    await page.locator('#btnContinueWithoutAccount').click();
    await page.locator('#btnNext').click();
    const card = page.locator('#wizardView');
    const height = await card.evaluate(node => node.getBoundingClientRect().height);
    await page.locator('#btnOpenIndex').click();
    await expect.poll(() => card.evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(height);
    await expect.poll(() => page.evaluate(() => {
      const host = document.querySelector('#wizardView').getBoundingClientRect();
      const footer = document.querySelector('#indexDrawer').lastElementChild.getBoundingClientRect();
      const last = document.querySelector('#drawer-step-7').getBoundingClientRect();
      return last.bottom <= footer.top + 1 && footer.bottom <= host.bottom + 1;
    })).toBe(true);
    await expect(page.locator('#drawerStepList')).toHaveCSS('overflow-y', 'visible');
    await page.locator('#btnCloseIndex').click();
    await expect.poll(() => card.evaluate((node, original) => Math.abs(node.getBoundingClientRect().height - original), height), { timeout: 5000 }).toBeLessThan(1);
    await page.locator('#btnOpenIndex').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#indexDrawer')).not.toHaveClass(/open/);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('#btnOpenIndex').click();
    await expect(page.locator('#indexDrawer')).toHaveCSS('transition-duration', '0s');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('landing support action loads its local official logo and preserves documentation navigation', async ({ page }) => {
  await isolateExternalServices(page); await page.goto('/');
  const link = page.getByRole('link', { name: 'Apoyar en Ko-fi' });
  await expect(link).toHaveAttribute('href', 'https://ko-fi.com/xsvein');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect.poll(() => link.locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(page.locator('nav').getByRole('link', { name: 'Documentación', exact: true })).toBeVisible();
});
