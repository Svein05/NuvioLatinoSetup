function parseJsonSafe(val) {
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

function extractCredKey(cred) {
  if (!cred) return '';
  const json = parseJsonSafe(cred.credential_json || cred.credentials || cred);
  if (typeof json === 'object' && json !== null) {
    return json.api_key || json.apiKey || json.key || json.value || '';
  }
  return typeof cred.api_key === 'string' ? cred.api_key : '';
}

function parseFeaturesBlob(blob) {
  const raw = parseJsonSafe(blob);
  const pSettings = parseJsonSafe(raw?.p_settings_json || raw?.settings_json || raw?.p_settings || raw?.settings);
  const features = parseJsonSafe(pSettings?.features || raw?.features || pSettings || raw || {});
  return typeof features === 'object' && features !== null ? features : {};
}

export function extractProfileSettings({ blob, credentials = [], aioConfig, currentSettings = {}, fallbackKeys = {} }) {
  const features = parseFeaturesBlob(blob);
  const tmdb = features.tmdb_settings || features.tmdb || {};
  const mdblist = features.mdblist_settings || features.mdblist || {};
  const streamBadges = features.stream_badge_settings || features.stream_badges || features.badges || null;

  const tmdbCred = credentials.find(c => String(c.provider || '').toLowerCase() === 'tmdb');
  const mdblistCred = credentials.find(c => String(c.provider || '').toLowerCase() === 'mdblist');

  const aioKeys = aioConfig?.apiKeys || aioConfig?.config?.apiKeys || {};
  const blobTmdb = tmdb.tmdb_api_key?.value || (typeof tmdb.tmdb_api_key === 'string' ? tmdb.tmdb_api_key : '');
  const blobMdb = mdblist.mdblist_api_key?.value || (typeof mdblist.mdblist_api_key === 'string' ? mdblist.mdblist_api_key : '');

  const resolvedTmdb = (extractCredKey(tmdbCred) || blobTmdb || aioKeys.tmdb || currentSettings.tmdb_api_key || fallbackKeys.tmdb || '').trim();
  const resolvedMdb = (extractCredKey(mdblistCred) || blobMdb || aioKeys.mdblist || currentSettings.mdblist_api_key || fallbackKeys.mdblist || '').trim();

  return {
    streamBadges,
    settings: {
      enrichment_enabled: tmdb.tmdb_enabled?.value !== false,
      ratings_enabled: mdblist.mdblist_enabled?.value !== false,
      tmdb_language: tmdb.tmdb_language?.value || 'es-MX',
      tmdb_api_key: resolvedTmdb,
      mdblist_api_key: resolvedMdb,
    },
  };
}
