import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';

async function openKeys(page) {
  await page.goto('/configuration/');
  await page.locator('#btnContinueWithoutAccount').click();
  await expect(page.locator('#step-3')).toBeVisible();
  await page.locator('#btnNext').click();
  await expect(page.locator('#step-4')).toBeVisible();
  await page.locator('#keyTmdb').fill('0123456789abcdef0123456789abcdef');
  await page.locator('#keyMdblist').fill('synthetic-mdblist-key');
}

test('key status uses stable card outlines without visible labels or hidden help links', async ({ page }) => {
  await isolateExternalServices(page);
  let rejected = false;
  await page.route('https://api.themoviedb.org/3/authentication?**', route => route.fulfill({
    status: rejected ? 401 : 200, contentType: 'application/json', body: JSON.stringify({ success: !rejected }),
  }));
  await page.route('https://api.mdblist.com/user?**', route => route.fulfill({
    status: rejected ? 401 : 200, contentType: 'application/json', body: '{"user_id":1,"username":"synthetic"}',
  }));
  await openKeys(page);
  await page.evaluate(() => document.fonts.ready);
  const card = page.locator('[data-api-key-card="tmdb"]');
  const original = await card.boundingBox();
  await page.locator('#keyTmdb').fill('');
  await page.locator('#keyMdblist').fill('');
  await page.locator('#btnValidateApiKeys').click();
  await expect(card).toHaveAttribute('data-key-status', 'invalid');
  await expect(page.locator('#keyTmdb')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#badge-tmdb')).toHaveClass('sr-only');
  await page.locator('#keyTmdb').fill('0123456789abcdef0123456789abcdef');
  await page.locator('#keyMdblist').fill('synthetic-mdblist-key');
  await expect(card).not.toHaveAttribute('data-key-status');
  await page.locator('#btnValidateApiKeys').click();
  await expect(card).toHaveAttribute('data-key-status', 'valid');
  await expect(page.locator('[data-api-key-card="mdblist"]')).toHaveAttribute('data-key-status', 'valid');
  await expect(page.locator('#btn-get-tmdb')).toBeVisible();
  expect((await card.boundingBox()).height).toBe(original.height);
  rejected = true;
  await page.locator('#keyTmdb').fill('1123456789abcdef0123456789abcdef');
  await page.locator('#btnValidateApiKeys').click();
  await expect(card).toHaveAttribute('data-key-status', 'invalid');
  expect((await card.boundingBox()).height).toBe(original.height);
});

test('offline provider reads never unlock the wizard using key format alone', async ({ page }) => {
  await isolateExternalServices(page);
  await openKeys(page);
  await page.locator('#btnValidateApiKeys').click();
  await expect(page.locator('[data-api-key-card="tmdb"]')).toHaveAttribute('data-key-status', 'unavailable');
  await expect(page.locator('[data-api-key-card="mdblist"]')).toHaveAttribute('data-key-status', 'unavailable');
  await expect(page.locator('#apiKeyOverallBadge')).toBeHidden();
  await expect(page.locator('#btnNext')).toBeDisabled();
});

test('a late verification result cannot validate a key edited while the request was pending', async ({ page }) => {
  await isolateExternalServices(page);
  let release;
  let started;
  const gate = new Promise(resolve => { release = resolve; });
  const requested = new Promise(resolve => { started = resolve; });
  await page.route('https://api.themoviedb.org/3/authentication?**', async route => {
    started();
    await gate;
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
  await page.route('https://api.mdblist.com/user?**', route => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ user_id: 1, username: 'synthetic' }),
  }));
  await openKeys(page);
  await page.locator('#btnValidateApiKeys').click();
  await requested;
  await page.locator('#keyTmdb').fill('edited-after-verification-started');
  release();
  await expect(page.locator('#btnValidateApiKeys')).toBeEnabled();
  await expect(page.locator('#apiKeyOverallBadge')).toBeHidden();
  await expect(page.locator('#badge-tmdb')).toHaveText('');
  await expect(page.locator('[data-api-key-card="tmdb"]')).not.toHaveAttribute('data-key-status');
  await expect(page.locator('#btnNext')).toBeDisabled();
});

test('required keys unlock preferences without exposing removed provider fields', async ({ page }) => {
  await isolateExternalServices(page);
  await page.route('https://api.themoviedb.org/3/authentication?**', route => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ success: true }),
  }));
  await page.route('https://api.mdblist.com/user?**', route => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ user_id: 1, username: 'synthetic' }),
  }));
  await openKeys(page);
  await page.locator('#btnValidateApiKeys').click();
  await expect(page.locator('#keyTvdb, #keyRpdb, #keyGemini, #keyOpenrouter, #toggleSearchAi')).toHaveCount(0);
  await expect(page.locator('#btnNext')).toBeEnabled();
  await page.locator('#btnNext').click();
  await expect(page.locator('#step-5')).toBeVisible();
  const edit = page.locator('#btnEditBadgePack');
  const toggle = page.locator('#toggleBadgesCustomization');
  const gallery = page.locator('#badgesGalleryContainer');
  await expect(edit).toBeHidden();
  await page.locator('label.lat-switch').filter({ has: toggle }).click();
  await expect(edit).toBeVisible();
  await expect(edit).toHaveAttribute('aria-expanded', 'true');
  const switchBox = await toggle.locator('..').boundingBox();
  const editBox = await edit.boundingBox();
  expect(editBox.x).toBeGreaterThanOrEqual(switchBox.x + switchBox.width);
  await page.locator('[data-wizard-action="selectBadgePack"]').nth(1).click();
  await expect(edit).toHaveAttribute('aria-expanded', 'false');
  await expect(gallery).toHaveAttribute('inert', '');
  await expect(toggle).toBeChecked();
  await expect(edit).toBeFocused();
  await edit.press('Enter');
  await expect(edit).toHaveAttribute('aria-expanded', 'true');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await edit.press('Enter');
  await expect(edit).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('label.lat-switch').filter({ has: toggle }).click();
  await expect(edit).toBeHidden();
});
