const progressRow = {
  profile_id: 1, content_id: 'synthetic-movie', title: 'Synthetic continue watching',
  position: 120, duration: 3600, poster_url: '/assets/logo/logo.webp', content_type: 'movie',
};

function apiResponse(url, mode, payload) {
  const failed = mode === 'failed';
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
  if (pathname.endsWith('/sync_pull_watch_progress')) {
    if (!Number.isSafeInteger(payload?.p_since_last_watched)) {
      return { status: 400, body: { code: '22P02', message: 'invalid input syntax for type bigint' } };
    }
    if (mode === 'unsafe') return { body: [{ ...progressRow,
      title: '<img src=x onerror=alert(1)>', poster_url: 'javascript:alert(1)' }] };
    return { status: failed ? 503 : 200, body: mode === 'rpc' ? [progressRow] : [] };
  }
  if (pathname.endsWith('/watch_progress')) return { status: failed ? 503 : 200, body: [progressRow] };
  if (pathname.endsWith('/sync_pull_watched_items')) {
    return { body: [{ profile_id: 1, content_id: 'synthetic-watched', title: 'Synthetic watched item' }] };
  }
  return { body: [] };
}

export async function prepareAccount(page, mode, { respond, respondExternal, beforeNavigate } = {}) {
  await page.addInitScript(() => sessionStorage.setItem('nuvio_account_session_v1', JSON.stringify({
    accessToken: 'synthetic-test-only', userId: 'synthetic-user', email: 'test@example.invalid',
  })));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://127.0.0.1:4173') return route.continue();
    const external = respondExternal?.(url, route.request());
    if (external) return route.fulfill({ status: external.status ?? 200, contentType: 'application/json', body: JSON.stringify(external.body) });
    if (url.hostname === 'api.nuvio.tv') {
      const payload = route.request().method() === 'POST' ? route.request().postDataJSON() : null;
      const response = respond?.(url, payload) ?? apiResponse(url, mode, payload);
      return route.fulfill({ status: response.status ?? 200, contentType: 'application/json', body: JSON.stringify(response.body) });
    }
    if (route.request().resourceType() === 'image') {
      return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="112" height="32"/>' });
    }
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
  });
  await beforeNavigate?.();
  await page.goto('/account/');
  await page.locator('#modalProfileCardsGrid [data-profile-id="1"]').click();
}

