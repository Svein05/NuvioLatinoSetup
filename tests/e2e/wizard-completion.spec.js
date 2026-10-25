import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';

async function verifyCelebration(page, scenario) {
  if (scenario === 'resize') {
    await page.setViewportSize({ width: 1100, height: 800 });
  } else if (scenario === 'desktop') {
    await expect(page.locator('#completionsCounterPill')).toHaveClass(/is-celebrating/);
  } else if (scenario === 'mobile') {
    await expect(page.locator('#mobileHeaderDropdown')).toHaveClass(/is-open/);
    await expect(page.locator('#btnMobileHeaderMenu')).toHaveClass(/is-celebration-target/);
    await expect(page.locator('#mobileHeaderDropdown .completions-counter-pill')).toHaveClass(/is-celebrating/);
    await page.locator('#btnMobileHeaderMenu').click();
    await expect(page.locator('#mobileHeaderDropdown')).not.toHaveClass(/is-open/);
  }
}

for (const scenario of ['desktop', 'mobile', 'reduced', 'resize']) {
test('manual exports register once and celebrate safely: ' + scenario, async ({ page }) => {
  if (scenario === 'mobile') await page.setViewportSize({ width: 390, height: 844 });
  if (scenario === 'reduced') await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await isolateExternalServices(page);
  await page.route('https://api.themoviedb.org/3/authentication?**', route => route.fulfill({ json: { success: true } }));
  await page.route('https://api.mdblist.com/user?**', route => route.fulfill({ json: { user_id: 1, username: 'synthetic' } }));
  const writes = [];
  await page.route('**/api/completions', route => {
    if (route.request().method() === 'POST') writes.push(route.request().postDataJSON());
    return route.fulfill({ json: { environment: 'testing', value: writes.length, ...(writes.length ? { status: 'recorded' } : {}) } });
  });
  await page.goto('/configuration/');
  await page.locator('#btnContinueWithoutAccount').click();
  await page.locator('#btnNext').click();
  await page.locator('#keyTmdb').fill('0123456789abcdef0123456789abcdef');
  await page.locator('#keyMdblist').fill('synthetic-mdblist-key');
  await page.locator('#btnValidateApiKeys').click();
  await expect(page.locator('#btnNext')).toBeEnabled();
  await page.locator('#btnNext').click();
  await expect(page.locator('#step-5')).toBeVisible();
  await page.locator('#cardPosterBetter').click();
  await page.locator('#btnNext').click();
  await expect(page.locator('#step-6')).toBeVisible();
  await page.locator('#btnOpenIndex').click();
  await expect(page.locator('#indexDrawer')).toHaveClass(/open/);
  await page.locator('#btnCloseIndex').click();
  await page.locator('#btnNext').click();
  await expect(page.locator('#step-7')).toBeVisible();
  await page.locator('#aioPassword').fill('synthetic-config-password');
  await expect(page.locator('#btnCopyAioConfig')).toBeEnabled();
  await expect(page.locator('#btnDownloadCollections')).toBeHidden();
  await page.locator('.wizard-config-files summary').click();
  await expect(page.locator('.wizard-config-files')).toHaveAttribute('data-disclosure-open', 'true');
  await expect(page.locator('#wizardConfigFilesPanel')).not.toHaveAttribute('data-animating');
  await expect(page.locator('#wizardConfigFilesPanel')).toHaveCSS('height', /[1-9]/);
  const collections = page.waitForEvent('download');
  await page.locator('#btnDownloadCollections').click();
  expect((await collections).suggestedFilename()).toBe('NuvioCollections_Latino.json');
  const metadata = page.waitForEvent('download');
  await page.locator('#btnDownloadAioConfig').click();
  expect((await metadata).suggestedFilename()).toBe('AIOMetadata_Latino.json');
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].completionId).toMatch(/^[a-f0-9-]{36}$/);
  await expect(page.locator('#completionModal')).toHaveCount(0);
  await verifyCelebration(page, scenario);
  await expect.poll(() => page.locator('#completionsCounterPill').getAttribute('data-status')).toBe('recorded');
  await expect(page.locator('.completion-star')).toHaveCount(0);
  const repeated = page.waitForEvent('download');
  await page.locator('#btnDownloadAioConfig').click();
  await repeated;
  expect(writes).toHaveLength(1);
  expect(errors).toEqual([]);
});

}
