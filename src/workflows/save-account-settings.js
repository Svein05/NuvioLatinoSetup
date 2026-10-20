export function buildProfileSettingsPayload(state) {
  const tmdbKeyToSave = (state.settings?.tmdb_api_key || state.originalSettings?.tmdb_api_key || '').trim();
  const mdblistKeyToSave = (state.settings?.mdblist_api_key || state.originalSettings?.mdblist_api_key || '').trim();

  const payload = {
    language: 'es-MX',
    tmdb_language: 'es-MX',
    enrichment_enabled: Boolean(state.settings?.enrichment_enabled),
    ratings_enabled: Boolean(state.settings?.ratings_enabled),
    tmdb_api_key: tmdbKeyToSave,
    mdblist_api_key: mdblistKeyToSave,
  };

  if (state._rawStreamBadgeSettings) {
    payload.stream_badge_settings = state._rawStreamBadgeSettings;
  }

  return { payload, tmdbKeyToSave, mdblistKeyToSave };
}

export async function saveAccountSettings({ state, config, client }) {
  if (!state.dirty?.settings) return;

  const profId = state.selectedProfileId;
  const { payload, tmdbKeyToSave, mdblistKeyToSave } = buildProfileSettingsPayload(state);

  for (const platform of ['tv', 'mobile', 'desktop']) {
    await client.pushProfileSettings({
      apiUrl: config?.NUVIO_API_URL,
      apikey: config?.NUVIO_PUBLIC_ANON_KEY,
      accessToken: state.session?.accessToken,
      profileId: profId,
      platform,
      settings: payload,
    });
  }

  const creds = [];
  if (tmdbKeyToSave) creds.push({ provider: 'tmdb', credential_json: { api_key: tmdbKeyToSave } });
  if (mdblistKeyToSave) creds.push({ provider: 'mdblist', credential_json: { api_key: mdblistKeyToSave } });

  if (creds.length > 0) {
    await client.pushProviderCredentials({
      apiUrl: config?.NUVIO_API_URL,
      apikey: config?.NUVIO_PUBLIC_ANON_KEY,
      accessToken: state.session?.accessToken,
      profileId: profId,
      credentials: creds,
    });
  }

  state.originalSettings = JSON.parse(JSON.stringify(state.settings));
  state.dirty.settings = false;
}
