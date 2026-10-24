import { expect } from '@playwright/test';
import { isolateExternalServices } from './offline-services.js';

export async function openLanding(page) {
  await isolateExternalServices(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
}

export async function revealChapter(page, chapter, progress = .4) {
  await page.locator(`[data-chapter="${chapter}"]`).evaluate((element, value) => {
    const rectangle = element.getBoundingClientRect();
    const frame = element.querySelector('.story-frame');
    window.scrollTo(0, window.scrollY + rectangle.top - 120 + (rectangle.height - frame.offsetHeight) * value);
  }, progress);
  await expect(page.locator('.landing-story')).toHaveAttribute('data-active-chapter', chapter);
}
