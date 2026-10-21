function folderCatalogIds(folder) {
  const ids = [];
  const sources = [...(Array.isArray(folder.catalogSources) ? folder.catalogSources : []),
    ...(Array.isArray(folder.sources) ? folder.sources : [])];
  for (const source of sources) {
    if (!source?.catalogId) continue;
    ids.push(source.catalogId);
    if (source.catalogId.startsWith('tmdb.trending')) ids.push('tmdb.trending');
    if (source.catalogId.startsWith('tmdb.top')) ids.push('tmdb.top');
  }
  return ids;
}

/** Include generic TMDB identifiers required by typed trending/top sources. */
export function collectActiveCatalogIds(collections) {
  const activeFolders = collections.filter(section => section.enabled !== false)
    .flatMap(section => section.folders || []).filter(folder => folder.enabled !== false);
  return new Set(activeFolders.flatMap(folderCatalogIds));
}

export function selectedCollections(collections) {
  return collections.filter(section => section.enabled !== false && (section.folders || []).some(folder => folder.enabled !== false))
    .map(section => ({ ...structuredClone(section), pinToTop: section.pinToTop ?? true,
      folders: structuredClone(section.folders.filter(folder => folder.enabled !== false)) }));
}

export function flattenedCollections(collections, { profileId, addonId }) {
  let order = 1;
  return collections.filter(section => section.enabled !== false).flatMap(section =>
    (section.folders || []).filter(folder => folder.enabled !== false).map(folder => {
      const source = folder.catalogSources?.[0] || folder.sources?.[0] || {};
      return { profile_id: profileId, name: folder.title, catalog_id: source.catalogId || folder.id,
        catalog_type: source.type || 'movie', addon_id: addonId,
        backdrop_url: folder.heroBackdropUrl || folder.coverImageUrl || '', sort_order: order++, is_active: true };
    }));
}
