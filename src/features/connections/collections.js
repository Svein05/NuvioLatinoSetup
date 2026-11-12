import { selectedConnectionCatalogs, connectionProviders } from './providers.js';

export const CONNECTION_SECTION_ID = 'nuvio-optional-connections';
const recommendation = source => /^trakt\.recommendations\.(movies|shows)$/.test(source.catalogId || '');
const nativeSource = catalog => ({ addonId: 'aio-metadata', provider: 'addon', connectionProvider: catalog.source, type: catalog.type, catalogId: catalog.id, title: catalog.name });

function synchronizeRecommendations(collections, catalogs) {
  const sources = catalogs.filter(catalog => /^trakt\.recommendations\./.test(catalog.id)).map(nativeSource);
  return collections.map(section => ({ ...section, folders: (section.folders || []).map(folder => {
    const isRecommended = folder.id === 'folder-db247118';
    if (!isRecommended || section.id === CONNECTION_SECTION_ID) return folder;
    return { ...folder, sources: [...sources, ...(folder.sources || []).filter(source => !recommendation(source))],
      catalogSources: [...sources, ...(folder.catalogSources || []).filter(source => !recommendation(source))] };
  }) }));
}

/** One provider tile groups its selected catalogs, preserving user layout edits. */
export function synchronizeConnectionCollections(collections, connections, artwork) {
  const catalogs = selectedConnectionCatalogs(connections);
  const updated = synchronizeRecommendations(collections, catalogs);
  const current = updated.find(section => section.id === CONNECTION_SECTION_ID);
  const folders = Object.keys(connectionProviders).flatMap(provider => {
    const selected = catalogs.filter(catalog => catalog.source === provider);
    if (!selected.length) return [];
    const existing = current?.folders.find(folder => folder.connectionProvider === provider);
    const cover = artwork[provider];
    return [{ ...existing, id: `connection-${provider}`, title: existing?.title || connectionProviders[provider].name,
      enabled: existing?.enabled ?? true, connectionProvider: provider, tileShape: 'SQUARE',
      coverImageUrl: cover?.public || cover || '', heroBackdropUrl: cover?.public || cover || '',
      previewCoverImageUrl: cover?.local || '', sources: selected.map(nativeSource), catalogSources: selected.map(nativeSource) }];
  });
  if (!folders.length) return updated.filter(section => section.id !== CONNECTION_SECTION_ID);
  const order = new Map((current?.folders || []).map((folder, index) => [folder.id, index]));
  folders.sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
  const section = { ...current, id: CONNECTION_SECTION_ID, title: 'Conexiones',
    enabled: current?.enabled ?? true, pinToTop: current?.pinToTop ?? true, folders };
  return current ? updated.map(item => item.id === section.id ? section : item) : [...updated, section];
}
