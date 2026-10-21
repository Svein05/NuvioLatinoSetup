import { registryFromPaths, isAvatarRegistry } from '../features/avatars/index.js';

function cachedCatalog(cache, now) {
  const snapshot = cache.read();
  if (!snapshot || !isAvatarRegistry(snapshot.registry) || !Number.isFinite(snapshot.timestamp)) return null;
  const age = now() - snapshot.timestamp;
  return { ...snapshot, fresh: age >= 0 && age < 1800000 };
}

async function loadSources({ client, cache, now, reportWarning }, forceRefresh, signal) {
  const cached = cachedCatalog(cache, now);
  let sha = null;
  try { sha = await client.latestCommit({ signal }); }
  catch { signal?.throwIfAborted(); reportWarning('No se pudo comprobar la revisión del catálogo de avatares.'); }
  signal?.throwIfAborted();
  if (!forceRefresh && cached?.fresh && (!sha || sha === cached.commitSha)) {
    return { registry: cached.registry, commitSha: cached.commitSha, source: 'cache' };
  }
  try {
    const paths = await client.tree(sha, { signal });
    return { registry: registryFromPaths(paths), commitSha: sha, source: 'github' };
  } catch { signal?.throwIfAborted(); reportWarning('No se pudo cargar el árbol completo de avatares de GitHub.'); }
  try {
    const registry = await client.manifest(sha, { signal });
    if (!isAvatarRegistry(registry)) throw new Error('Manifiesto inválido.');
    return { registry, commitSha: sha, source: 'manifest' };
  } catch { signal?.throwIfAborted(); reportWarning('No se pudo cargar el manifiesto remoto de avatares.'); }
  return cached ? { registry: cached.registry, commitSha: cached.commitSha, source: 'stale-cache', stale: true }
    : { source: 'unavailable', stale: true };
}

/** Never replace acknowledged publications with an older in-flight load or erase the last catalog on failure. */
export function createAvatarCatalogLoader({ client, cache, catalog, now = Date.now, reportWarning = console.warn }) {
  let pending;
  function load(forceRefresh = false, { signal } = {}) {
    signal?.throwIfAborted();
    if (!forceRefresh && catalog.loaded()) return Promise.resolve(catalog.avatars());
    if (!forceRefresh && pending) return pending;
    const revision = catalog.begin();
    const task = loadSources({ client, cache, now, reportWarning }, forceRefresh, signal).then(result => {
      signal?.throwIfAborted();
      if (revision !== catalog.revision()) return catalog.avatars();
      if (result.registry && (!result.stale || !catalog.loaded())) {
        catalog.accept(result.registry, result.commitSha);
        if (!result.stale) cache.write({ registry: result.registry, commitSha: result.commitSha, timestamp: now() });
      }
      if (result.stale) {
        reportWarning('Catálogo sin actualizar: se conserva el último disponible.');
        if (forceRefresh) throw new Error('No se pudo actualizar el catálogo; se conserva el último disponible.');
      }
      return catalog.avatars();
    }).finally(() => { if (pending === task) pending = null; });
    pending = task;
    return task;
  }
  return { load };
}
