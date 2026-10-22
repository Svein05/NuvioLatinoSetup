import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';

test('header glass remains blurred through counter hover and expansion', async ({ page }, testInfo) => {
  await isolateExternalServices(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const counter = page.locator('#completionsCounterPill');
  const blur = 'blur(28px) saturate(1.8)';
  await expect(counter).toHaveCSS('backdrop-filter', blur);
  await page.screenshot({ path: testInfo.outputPath('header-rest.png') });
  await counter.hover();
  await expect(counter.locator('.completions-expanded-wrap')).toHaveCSS('opacity', '1');
  await expect(counter).toHaveCSS('backdrop-filter', blur);
  await page.screenshot({ path: testInfo.outputPath('header-hover.png') });
  await page.mouse.move(10, 850);
  await expect(counter.locator('.completions-expanded-wrap')).toHaveCSS('opacity', '0');
  await expect(counter).toHaveCSS('backdrop-filter', blur);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.lat-mobile-dropdown')).toHaveCSS('backdrop-filter', 'blur(36px) saturate(1.9)');
});
