function buildPostersPlusPattern(tmdbKey, mdblistKey) {
  const tmdbEnc = encodeURIComponent(tmdbKey);
  const mdbEnc = encodeURIComponent(mdblistKey);
  return `https://postersplus.stremio.ru/poster?tmdb_id={tmdb_id?}&imdb_id={imdb_id?}&stremio_id={id}&type={type}&primary_client=stremio_tv_nuvio&tmdb_key=${tmdbEnc}&mdblist_key=${mdbEnc}&top_gradient=medium&fallback_to_imdb=true&rating_display_mode=3&minimalist_append_mode=3&minimalist_mode_font_size_ratio=0.056&minimalist_mode_font_x_offset=0.065&minimalist_score_out_of_10=true&movie_weights=letterboxd%3A0.99%2Ctrakt%3A0.01&tv_weights=trakt%3A0.80%2Ctomatoes%3A0.20&logo_language=es-mx&logo_priority=native%2Cenglish%2Coriginal%2Cneutral%2Ctext&fallback_bg_style=photoreal&logo_bottom_ratio=0.23&sash_length_ratio=1.20&sash_height_ratio=0.135&badge_display_mode=0`;
}

export function applyAioPosterConfig(cfg, { engine, customPosterUrl, tmdbKey = '', mdblistKey = '' }) {
  if (engine === 'betterposter') {
    cfg.posterRatingProvider = 'custom';
    const isBtttr = customPosterUrl && customPosterUrl.includes('btttr.cc');
    cfg.customPosterUrlPattern = isBtttr
      ? customPosterUrl.trim()
      : 'https://btttr.cc/poster/imdb/poster-default/{imdb_id}.jpg?lang=es-MX&rs=IM';
    cfg.enableRatingPostersForLibrary = true;
    cfg.usePosterProxy = true;
  } else if (engine === 'postersplus') {
    cfg.posterRatingProvider = 'custom';
    const isPlus = customPosterUrl && customPosterUrl.includes('postersplus.stremio.ru');
    cfg.customPosterUrlPattern = isPlus ? customPosterUrl.trim() : buildPostersPlusPattern(tmdbKey, mdblistKey);
    cfg.enableRatingPostersForLibrary = true;
    cfg.usePosterProxy = true;
  } else if (engine === 'custom_external') {
    cfg.posterRatingProvider = 'custom';
    cfg.customPosterUrlPattern = (customPosterUrl || '').trim();
    cfg.enableRatingPostersForLibrary = true;
    cfg.usePosterProxy = true;
  } else {
    cfg.posterRatingProvider = 'none';
    cfg.customPosterUrlPattern = '';
    cfg.enableRatingPostersForLibrary = false;
    cfg.usePosterProxy = false;
  }
}

export async function saveAccountAioMetadata({ state, updateMetadataConfiguration, resolveOwnerInstanceUrl, ui = {} }) {
  if (!state.dirty?.aiometadata || !state.aioUuid || !state.aioConfig) return;

  const tmdbKeyToSave = (state.settings?.tmdb_api_key || state.originalSettings?.tmdb_api_key || '').trim();
  const mdblistKeyToSave = (state.settings?.mdblist_api_key || state.originalSettings?.mdblist_api_key || '').trim();

  const cfg = state.aioConfig.config || state.aioConfig;
  if (!cfg.apiKeys) cfg.apiKeys = {};
  if (tmdbKeyToSave) cfg.apiKeys.tmdb = tmdbKeyToSave;
  if (mdblistKeyToSave) cfg.apiKeys.mdblist = mdblistKeyToSave;

  const engine = state.posterEngine || 'default';
  applyAioPosterConfig(cfg, {
    engine,
    customPosterUrl: state.customPosterUrl,
    tmdbKey: tmdbKeyToSave,
    mdblistKey: mdblistKeyToSave,
  });

  const addonUrl = state.aioAddon?.manifest_url || state.aioAddon?.url;
  const instanceUrl = resolveOwnerInstanceUrl ? resolveOwnerInstanceUrl(addonUrl) : addonUrl;

  await updateMetadataConfiguration(instanceUrl, state.aioUuid, {
    password: state.aioPassword,
    config: state.aioConfig,
  });

  state.originalAioConfig = JSON.parse(JSON.stringify(state.aioConfig));
  state.originalPosterEngine = state.posterEngine;
  state.originalCustomPosterUrl = cfg.customPosterUrlPattern || '';
  state.customPosterUrl = cfg.customPosterUrlPattern || '';
  state.dirty.aiometadata = false;

  ui.renderAioSection?.();
}
