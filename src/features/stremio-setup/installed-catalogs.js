export const METADATA_BLOCK = 'setup:aiometadata';

/** Stremio groups home catalogs by addon; required extras need a default option. */
export function installedCatalogBlocks(state) {
  return state.profileAddons.map(addon => {
    const url = addon.manifest_url || addon.url;
    const descriptor = state.stremio.originalAddons.find(item => item.transportUrl === url);
    const catalogs = (descriptor?.manifest.catalogs || []).filter(catalog => {
      if (catalog.extraRequired?.length) return false;
      return !(catalog.extra || []).some(extra => extra.isRequired && !extra.options?.length);
    });
    return { key: url, title: addon.name || descriptor?.manifest.name || 'Addon', catalogs };
  }).filter(block => block.key && block.catalogs.length);
}

export function orderedCatalogBlocks(state) {
  const blocks = [{ key: METADATA_BLOCK, title: 'AIOMetadata', catalogs: [] }, ...installedCatalogBlocks(state)];
  const available = new Map(blocks.map(block => [block.key, block]));
  const order = [...new Set([...(state.stremio.addonOrder || []), ...available.keys()])];
  return order.map(key => available.get(key)).filter(Boolean);
}

export function orderStremioDescriptors(addons, state) {
  const order = orderedCatalogBlocks(state).map(block => block.key);
  const metadata = addons[0];
  const rank = addon => order.indexOf(addon === metadata ? METADATA_BLOCK : addon.transportUrl);
  return [...addons].sort((a, b) => (rank(a) < 0 ? Infinity : rank(a)) - (rank(b) < 0 ? Infinity : rank(b)));
}
