const tmdbFlags = [
  'tmdb_enabled', 'tmdb_modern_home_enabled', 'tmdb_enrich_continue_watching',
  'tmdb_use_artwork', 'tmdb_use_basic_info', 'tmdb_use_details', 'tmdb_use_release_dates',
  'tmdb_use_credits', 'tmdb_use_productions', 'tmdb_use_networks', 'tmdb_use_episodes',
  'tmdb_use_trailers', 'tmdb_use_more_like_this', 'tmdb_use_collections',
];
const ratingProviders = ['trakt', 'imdb', 'tmdb', 'letterboxd', 'tomatoes', 'audience', 'metacritic', 'mal'];

function flags(keys, value) {
  return Object.fromEntries(keys.map(key => [key, { type: 'boolean', value }]));
}

export function buildSettingsPayload(settings = {}, platform = 'tv') {
  const enrichment = Boolean(settings.enrichment_enabled);
  const ratings = Boolean(settings.ratings_enabled);
  const tmdb = {
    ...flags(tmdbFlags, enrichment),
    tmdb_language: { type: 'string', value: settings.language || settings.tmdb_language || 'es-MX' },
  };
  if (String(settings.tmdb_api_key || '').trim()) {
    tmdb.tmdb_api_key = { type: 'string', value: String(settings.tmdb_api_key).trim() };
  }
  const ratingFlags = ratingProviders.flatMap(provider => [`mdblist_show_${provider}`, `mdblist_use_${provider}`]);
  return {
    version: platform === 'tv' ? 1 : 4,
    features: {
      tmdb_settings: tmdb,
      mdblist_settings: {
        ...flags(ratingFlags, ratings),
        mdblist_enabled: { type: 'boolean', value: ratings },
        mdblist_api_key: { type: 'string', value: ratings ? String(settings.mdblist_api_key || '').trim() : '' },
      },
      ...(settings.stream_badge_settings ? { stream_badge_settings: settings.stream_badge_settings } : {}),
      ...(settings.features || {}),
    },
    language: settings.language || 'es-MX',
    tmdb_language: settings.tmdb_language || 'es-MX',
    enrichment_enabled: enrichment,
    ratings_enabled: ratings,
    auto_translate: true,
  };
}
