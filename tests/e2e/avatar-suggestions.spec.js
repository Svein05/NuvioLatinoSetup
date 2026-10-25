import { expect, test } from '@playwright/test';
import { prepareAccount } from './support/account.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6NdYAAAAASUVORK5CYII=', 'base64');
async function openForm(page) {
  await page.locator('.account-nav-btn[data-section="avatars"]').click();
  await page.locator('#sectionPane-avatars .btn-open-avatar-suggestion').click();
  await expect(page.locator('#modalAvatarSuggestion')).toBeVisible();
}
async function fillNames(page) {
  await page.locator('#inputAvatarSuggestionCharName').fill('Synthetic Hero');
  await page.locator('#inputAvatarSuggestionSeriesName').fill('Synthetic Series');
}

for (const mode of ['url', 'file']) {
  test(`the ${mode} suggestion preserves preview and explicit confirmation and sends once through the Worker`, async ({ page }) => {
    await prepareAccount(page, 'rpc');
    const submissions = [];
    await page.route('**/api/avatars/suggestions', async route => {
      const request = route.request();
      const form = await new Request(request.url(), { method: 'POST', headers: request.headers(), body: request.postDataBuffer() }).formData();
      submissions.push({ form, authorization: request.headers().authorization });
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ status: 'sent' }) });
    });
    await openForm(page);
    await fillNames(page);
    if (mode === 'url') {
      await page.locator('#btnSuggestionModeUrl').click();
      await page.locator('#inputAvatarSuggestionUrl').fill('https://example.invalid/avatar.png');
    } else {
      await page.locator('#inputAvatarSuggestionFile').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: png });
      await expect(page.locator('#suggestionFileName')).toHaveText('avatar.png');
    }
    await page.locator('#btnProceedToConfirmSuggestion').click();
    await expect(page.locator('#avatarConfirmFinalChar')).toHaveText('Synthetic Hero');
    expect(submissions).toHaveLength(0);
    await page.locator('#btnConfirmAndSendToDiscord').click();
    await expect(page.locator('#avatarSuggestionSuccessView')).toBeVisible();
    expect(submissions).toHaveLength(1);
    expect(submissions[0].authorization).toBe('Bearer synthetic-test-only');
    expect(submissions[0].form.get('mode')).toBe(mode);
    expect(submissions[0].form.get('characterName')).toBe('Synthetic Hero');
    expect(submissions[0].form.get('requestId')).toMatch(/^[a-f0-9-]{36}$/);
    expect(submissions[0].form.has('webhookUrl')).toBe(false);
    expect(submissions[0].form.has('payload_json')).toBe(false);
    if (mode === 'file') expect(submissions[0].form.get('file').size).toBe(png.length);
    await page.locator('#btnCloseSuggestionSuccess').click();
    await expect(page.locator('#modalAvatarSuggestion')).toBeHidden();
  });
}

test('an unconfirmed send preserves the draft and cannot be sent again automatically', async ({ page }) => {
  await prepareAccount(page, 'rpc');
  let requests = 0;
  await page.route('**/api/avatars/suggestions', route => {
    requests++;
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
  });
  await openForm(page);
  await fillNames(page);
  await page.locator('#btnSuggestionModeUrl').click();
  await page.locator('#inputAvatarSuggestionUrl').fill('https://example.invalid/avatar.png');
  await page.locator('#btnProceedToConfirmSuggestion').click();
  await page.locator('#btnConfirmAndSendToDiscord').click();
  await expect(page.locator('#avatarSuggestionConfirmNoticeText')).toContainText('No se pudo confirmar');
  await expect(page.locator('#btnConfirmAndSendToDiscord')).toBeDisabled();
  await expect(page.locator('#avatarSuggestionSuccessView')).toBeHidden();
  await page.locator('#btnBackToSuggestionForm').click();
  await expect(page.locator('#inputAvatarSuggestionCharName')).toHaveValue('Synthetic Hero');
  await page.keyboard.press('Escape');
  await page.locator('#sectionPane-avatars .btn-open-avatar-suggestion').click();
  await expect(page.locator('#inputAvatarSuggestionUrl')).toHaveValue('https://example.invalid/avatar.png');
  expect(requests).toBe(1);
});

test('file dismissal releases preview resources and restores focus without duplicate listeners', async ({ page }) => {
  await page.addInitScript(() => {
    const revoke = URL.revokeObjectURL;
    window.revokedSuggestionPreviews = [];
    URL.revokeObjectURL = url => { window.revokedSuggestionPreviews.push(url); revoke.call(URL, url); };
  });
  await prepareAccount(page, 'rpc');
  await openForm(page);
  await page.locator('#inputAvatarSuggestionFile').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('#avatarSuggestionPreviewImg')).toHaveAttribute('src', /^blob:/);
  await page.locator('#btnCloseAvatarSuggestionModal').focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#btnProceedToConfirmSuggestion')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#modalAvatarSuggestion')).toBeHidden();
  await expect(page.locator('#sectionPane-avatars .btn-open-avatar-suggestion')).toBeFocused();
  expect(await page.evaluate(() => window.revokedSuggestionPreviews.length)).toBe(1);
  await page.locator('#sectionPane-avatars .btn-open-avatar-suggestion').click();
  await expect(page.locator('#suggestionFileSelectedWrap')).toBeHidden();
  await page.locator('#btnSuggestionModeUrl').click();
  await expect(page.locator('#suggestionUrlWrap')).toBeVisible();
});
