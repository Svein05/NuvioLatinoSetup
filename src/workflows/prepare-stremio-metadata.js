import { availableStremioCatalogs, selectedStremioCatalogs } from '../features/stremio-setup/index.js';
import { selectedConnectionCatalogs } from '../features/connections/index.js';
import { compileMetadataPayload } from '../features/metadata/index.js';
import { posterProviderSettings } from '../features/posters/index.js';
import { withConnectionCatalogs, applyConnectionCredentials } from './prepare-connected-metadata.js';

export function prepareStremioMetadata(state) {
  const catalogs = availableStremioCatalogs(state.rawMetadataTemplate, state.originalCollectionsTemplate, selectedConnectionCatalogs(state.connections));
  const chosen = selectedStremioCatalogs(catalogs, state.stremio.selected);
  const engine = state.preferences.posterEngine;
  const payload = compileMetadataPayload({
    rawTemplate: withConnectionCatalogs(state.rawMetadataTemplate, state.connections),
    activeCatalogIds: new Set(chosen.map(item => item.id)), apiKeys: state.apiKeys,
    customPosters: engine !== 'default', searchAiEnabled: state.searchAiEnabled,
    password: state.aiometadata.password,
    posterConfiguration: posterProviderSettings({ engine, customPosterUrl: state.preferences.customPosterUrl,
      tmdb: state.apiKeys.tmdb, mdblist: state.apiKeys.mdblist }),
  });
  const compiled = new Map(payload.config.catalogs.map(item => [`${item.type}:${item.id}`, item]));
  payload.config.catalogs = chosen.map(item => {
    const catalog = compiled.get(`${item.type}:${item.id}`);
    if (!catalog) throw new Error('Uno de los catálogos seleccionados ya no está disponible.');
    const name = state.stremio.names?.[`${item.type}:${item.id}`];
    return { ...catalog, ...(name ? { name } : {}), showInHome: true };
  });
  return applyConnectionCredentials(payload, state.connections);
}
