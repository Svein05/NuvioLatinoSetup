function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

export function stremioAddonSnapshot(addons) {
  return JSON.stringify(canonical(addons));
}

/** Servers may add default manifest fields; compare installed identity, order and requested catalogs. */
export function matchesStremioInstallation(actual, expected) {
  if (actual.length !== expected.length) return false;
  return expected.every((addon, index) => {
    const saved = actual[index];
    if (saved.transportUrl !== addon.transportUrl || saved.manifest.id !== addon.manifest.id) return false;
    if (Boolean(saved.flags?.protected) !== Boolean(addon.flags?.protected)) return false;
    const catalogs = value => (value.manifest.catalogs || []).map(item => `${item.type}:${item.id}`);
    return JSON.stringify(catalogs(saved)) === JSON.stringify(catalogs(addon));
  });
}
