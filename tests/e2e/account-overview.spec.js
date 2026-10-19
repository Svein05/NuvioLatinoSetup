import { expect, test } from '@playwright/test';

const progressRow = {
  profile_id: 1, content_id: 'synthetic-movie', title: 'Synthetic continue watching',
  position: 120, duration: 3600, poster_url: '/assets/logo/logo.webp', content_type: 'movie',
};

function apiResponse(url, failed) {
  const pathname = url.pathname;
  if (pathname.endsWith('/sync_pull_profiles')) {
    return { body: [{ profile_index: 1, name: 'Synthetic profile', avatar_url: '/assets/logo/logo.webp' }] };
  }
  if (pathname.endsWith('/sync_pull_profile_settings_blob')) {
    return { body: { features: { tmdb_settings: { tmdb_enabled: { value: true } } } } };
  }
  if (pathname.endsWith('/sync_pull_provider_credentials')) {
    return { body: [{ provider: 'tmdb', credential_json: { api_key: 'synthetic-key' } }] };
  }
  if (pathname.endsWith('/sync_pull_watch_progress')) return { status: failed ? 503 : 200, body: [] };
  if (pathname.endsWith('/watch_progress')) return { status: failed ? 503 : 200, body: [progressRow] };
  if (pathname.endsWith('/sync_pull_watched_items')) {
    return { body: [{ profile_id: 1, content_id: 'synthetic-watched', title: 'Synthetic watched item' }] };
  }
  return { body: [] };
}

async function prepareAccount(page, failed) {
  await page.addInitScript(() => sessionStorage.setItem('nuvio_account_session_v1', JSON.stringify({
    accessToken: 'synthetic-test-only', userId: 'synthetic-user', email: 'test@example.invalid',
  })));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://127.0.0.1:4173') return route.continue();
    if (url.hostname === 'api.nuvio.tv') {
      const response = apiResponse(url, failed);
      return route.fulfill({ status: response.status ?? 200, contentType: 'application/json', body: JSON.stringify(response.body) });
    }
    if (route.request().resourceType() === 'image') {
      return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="112" height="32"/>' });
    }
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/account/');
  await page.locator('#modalProfileCardsGrid [data-profile-id="1"]').click();
}

test('authenticated overview recovers continue-watching cards from the scoped table', async ({ page }) => {
  const progressRequests = [];
  page.on('request', request => {
    if (request.url().includes('/watch_progress?')) progressRequests.push(request.url());
  });
  await prepareAccount(page, false);
  await expect(page.locator('#rowCurrentlyWatchingCards')).toContainText('Synthetic continue watching');
  await expect(page.locator('#metricProgressCount')).toHaveText('1');
  await expect(page.locator('#rowRecentlyWatchedCards')).toContainText('Synthetic watched item');
  expect(progressRequests.length).toBeGreaterThan(0);
  expect(progressRequests.every(url => url.startsWith('https://api.nuvio.tv/') && url.includes('profile_id=eq.1'))).toBe(true);
});

test('authenticated overview reports a progress outage without clearing the watched section', async ({ page }) => {
  await prepareAccount(page, true);
  await expect(page.locator('#rowCurrentlyWatchingCards')).toContainText('No se pudo cargar el progreso');
  await expect(page.locator('#rowCurrentlyWatchingCards')).not.toContainText('Sin reproducciones');
  await expect(page.locator('#metricProgressCount')).toHaveText('—');
  await expect(page.locator('#rowRecentlyWatchedCards')).toContainText('Synthetic watched item');
});
