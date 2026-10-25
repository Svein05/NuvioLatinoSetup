const CACHE_DURATION_MS = 60 * 60 * 1000;

function validSnapshot(snapshot) {
  return snapshot && Number.isSafeInteger(snapshot.stars) && snapshot.stars >= 0
    && Number.isFinite(snapshot.timestamp) ? snapshot : null;
}

/** Preserve the previous cache format while distinguishing live, cached and estimated counts. */
export function createRepositoryStars({ readCount, store, now = Date.now }) {
  let cached = validSnapshot(store.read());
  const initial = () => ({ count: cached?.stars ?? 3, source: cached ? 'cache' : 'estimate' });
  async function refresh({ signal } = {}) {
    signal?.throwIfAborted();
    const age = cached ? now() - cached.timestamp : Infinity;
    if (age >= 0 && age < CACHE_DURATION_MS) return { count: cached.stars, source: 'cache' };
    try {
      const count = await readCount({ signal });
      signal?.throwIfAborted();
      cached = { stars: count, timestamp: now() };
      store.write(cached);
      return { count, source: 'network' };
    } catch {
      signal?.throwIfAborted();
      return {
        count: cached?.stars ?? 3, source: cached ? 'stale-cache' : 'estimate',
        warning: 'No se pudo actualizar el conteo de estrellas de GitHub.',
      };
    }
  }
  return { initial, refresh };
}
