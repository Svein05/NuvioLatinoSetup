import { selectedAiProvider } from './search-provider.js';

/** Optional providers may warn, but only confirmed required credentials unlock the wizard. */
export function summarizeKeyValidation({ keys, aiEnabled }, providers) {
  const selected = selectedAiProvider(keys);
  const aiValid = Boolean(selected && providers[selected]?.valid === true);
  const valid = Boolean(keys.tmdb && keys.mdblist) && providers.tmdb?.valid === true && providers.mdblist?.valid === true
    && (!aiEnabled || aiValid);
  const warnings = ['rpdb', 'tvdb'].filter(key => keys[key] && providers[key]?.valid !== true);
  if (aiEnabled) warnings.push(...['gemini', 'openrouter'].filter(key => keys[key] && providers[key]?.valid !== true));
  const statusMap = Object.fromEntries(Object.entries(providers).map(([key, result]) => [key, result.valid === true]));
  return { valid, providers, statusMap, warnings };
}
