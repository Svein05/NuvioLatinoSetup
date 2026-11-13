export const catalogKey = catalog => `${catalog.type}:${catalog.id}`;

const DEFAULT_IDS = new Set([
  'mdblist.6506', 'mdblist.31380', 'mdblist.201247', 'mdblist.170874',
  'tmdb.trending', 'mdblist.201111', 'mdblist.201113',
  'mdblist.86752', 'mdblist.86751', 'mdblist.89647', 'mdblist.89649',
  'mdblist.86759', 'mdblist.86758', 'mdblist.86755', 'mdblist.86753',
  'mdblist.86762', 'mdblist.86761', 'mdblist.86757', 'mdblist.86756',
  'mdblist.177575', 'mdblist.177578', 'mdblist.47642', 'mdblist.2472',
  'mdblist.2483', 'mdblist.88469', 'mdblist.88468', 'mdblist.13210',
]);

function sourceDescriptions(sections) {
  const map = new Map();
  for (const section of sections || []) {
    for (const folder of section.folders || []) {
      (folder.sources || []).forEach(source => {
        const key = `${source.type}:${source.catalogId}`;
        if (!map.has(key)) map.set(key, { title: source.title, group: section.title, folder: folder.title });
        map.set(`${source.type}:${source.title}`, { title: source.title, group: section.title, folder: folder.title });
      });
    }
  }
  return map;
}

/** Catalogs remain flat for Stremio; folders only label the selection interface. */
export function availableStremioCatalogs(rawTemplate, sections, connections = []) {
  const descriptions = sourceDescriptions(sections);
  const config = rawTemplate?.config || rawTemplate || {};
  const seen = new Set();
  return [...connections, ...(config.catalogs || []), ...(rawTemplate?.catalogs || [])].filter(catalog => {
    const key = catalogKey(catalog);
    if (!catalog.id || seen.has(key)) return false;
    seen.add(key);
    return !catalog.id.startsWith('trakt.') || connections.some(item => catalogKey(item) === key);
  }).map(catalog => ({ ...catalog, ...(descriptions.get(catalogKey(catalog)) || descriptions.get(`${catalog.type}:${catalog.name}`) || {}),
    title: descriptions.get(catalogKey(catalog))?.title || catalog.name || catalog.id,
    group: connections.some(item => catalogKey(item) === catalogKey(catalog)) ? 'Conexiones' : (descriptions.get(catalogKey(catalog)) || descriptions.get(`${catalog.type}:${catalog.name}`))?.group || 'Otros',
  }));
}

export function defaultStremioSelection(catalogs) {
  return catalogs.filter(catalog => DEFAULT_IDS.has(catalog.id)).map(catalogKey);
}

export function reconcileStremioSelection(selected, catalogs, connections) {
  const available = new Set(catalogs.map(catalogKey));
  const recommended = connections.filter(catalog => catalog.id.startsWith('trakt.recommendations.')).map(catalogKey);
  const connected = connections.map(catalogKey);
  return [...new Set([...recommended, ...selected.filter(key => available.has(key)), ...connected])];
}

export function selectedStremioCatalogs(catalogs, selected) {
  const map = new Map(catalogs.map(catalog => [catalogKey(catalog), catalog]));
  return selected.map(key => map.get(key)).filter(Boolean);
}
