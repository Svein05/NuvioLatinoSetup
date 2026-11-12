import { selectedConnectionCatalogs, connectionProviders } from './providers.js';

export const CONNECTION_SECTION_ID = 'nuvio-optional-connections';

/** Stable identities keep user edits and ordering when another connection changes. */
export function synchronizeConnectionCollections(collections, connections, artwork) {
  const catalogs = selectedConnectionCatalogs(connections);
  const current = collections.find(section => section.id === CONNECTION_SECTION_ID);
  const wanted = new Map(catalogs.map(catalog => [`connection-${encodeURIComponent(`${catalog.type}:${catalog.id}`)}`, catalog]));
  const folders = (current?.folders || []).filter(folder => wanted.has(folder.id));
  const existing = new Set(folders.map(folder => folder.id));
  for (const [id, catalog] of wanted) {
    if (existing.has(id)) continue;
    const cover = artwork[catalog.source] || '';
    folders.push({ id, title: `${connectionProviders[catalog.source].name} · ${catalog.name}`, enabled: true,
      connectionProvider: catalog.source, tileShape: 'LANDSCAPE', coverImageUrl: cover, heroBackdropUrl: cover,
      sources: [{ addonId: 'aio-metadata', provider: 'addon', type: catalog.type, catalogId: catalog.id, title: catalog.name }] });
  }
  if (!folders.length) return collections.filter(section => section.id !== CONNECTION_SECTION_ID);
  const section = { ...current, id: CONNECTION_SECTION_ID, title: current?.title || 'Mis conexiones',
    enabled: current?.enabled ?? true, pinToTop: current?.pinToTop ?? true, folders };
  if (!current) return [...collections, section];
  return collections.map(item => item.id === CONNECTION_SECTION_ID ? section : item);
}
