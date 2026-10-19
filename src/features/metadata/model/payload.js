function selectedCatalogs(template, config, activeIds, customPosters) {
  const seen = new Set();
  return [config.catalogs, template.catalogs].filter(Array.isArray).flat().filter(catalog => {
    if (!catalog?.id) return false;
    const key = `${catalog.id}:::${catalog.type || 'movie'}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return activeIds.has(catalog.id);
  }).map(catalog => ({ ...catalog, showInHome: false, enableRatingPosters: customPosters }));
}

function credentials(apiKeys) {
  const result = {};
  for (const key of ['tmdb', 'tvdb', 'mdblist', 'topPoster', 'publicmetadb', 'gemini', 'openrouter']) {
    result[key] = (apiKeys[key] || '').trim();
  }
  return { ...result, rpdb: (apiKeys.rpdb || 't0-free-rpdb').trim(), traktTokenId: '' };
}

function searchConfiguration(search, apiKeys, enabled) {
  const result = { ...search, ai_enabled: Boolean(enabled) };
  if (enabled) {
    result.engineEnabled = { ...result.engineEnabled, 'gemini.search': true };
    if (apiKeys.openrouter) result.ai_provider = 'openrouter';
    else if (apiKeys.gemini) result.ai_provider = 'gemini';
  } else if (result.engineEnabled) result.engineEnabled = { ...result.engineEnabled, 'gemini.search': false };
  return result;
}

/** Preserve unrelated provider settings while preparing a detached export/injection snapshot. */
export function compileMetadataPayload({ rawTemplate, activeCatalogIds, customPosters, posterConfiguration, apiKeys, searchAiEnabled, password }) {
  if (!rawTemplate) throw new Error('Plantilla MetadataLatino no cargada.');
  const template = structuredClone(rawTemplate);
  const config = template.config || template;
  config.catalogs = selectedCatalogs(template, config, activeCatalogIds, customPosters);
  config.apiKeys = { ...config.apiKeys, ...credentials(apiKeys) };
  if (posterConfiguration) {
    Object.assign(config, posterConfiguration);
    if (template.customPosterUrlPattern !== undefined) template.customPosterUrlPattern = config.customPosterUrlPattern;
  }
  config.search = searchConfiguration(config.search, apiKeys, searchAiEnabled);
  return { password, config };
}
