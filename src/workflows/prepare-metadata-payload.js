import { collectActiveCatalogIds } from '../features/collections/index.js';
import { posterProviderSettings } from '../features/posters/index.js';
import { compileMetadataPayload } from '../features/metadata/index.js';

export function prepareMetadataPayload({ rawTemplate, collections, preferences, apiKeys, searchAiEnabled, password }) {
  const engine = preferences?.posterEngine || 'default';
  return compileMetadataPayload({
    rawTemplate, activeCatalogIds: collectActiveCatalogIds(collections), apiKeys, searchAiEnabled, password,
    customPosters: engine !== 'default',
    posterConfiguration: posterProviderSettings({ engine, customPosterUrl: preferences?.customPosterUrl,
      tmdb: apiKeys.tmdb, mdblist: apiKeys.mdblist }),
  });
}
