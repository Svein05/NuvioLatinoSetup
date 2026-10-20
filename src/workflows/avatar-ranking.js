import { normalizeAvatarStorageKey, completeAvatarRanking } from '../features/avatars/index.js';

async function readTop({ client, store, reportWarning }, limit, options) {
  try {
    const items = await client.top(limit, options);
    options.signal?.throwIfAborted();
    const result = completeAvatarRanking(items, limit);
    store.save(result);
    return result;
  } catch {
    options.signal?.throwIfAborted();
    reportWarning('No se pudo consultar el ranking remoto; se usa caché o la selección de respaldo.');
    return completeAvatarRanking(store.read(), limit);
  }
}

async function recordUsage({ client, store, reportWarning }, key, options) {
  if (store.hasVoted(key)) return { status: 'duplicate' };
  if (!options.accessToken) return { status: 'unavailable' };
  try {
    const result = await client.record(key, options);
    store.confirm(key);
    return result;
  } catch (error) {
    reportWarning('No se pudo confirmar el registro de uso del avatar.');
    return { status: error.outcome === 'unknown' ? 'unknown' : 'failed' };
  }
}

export function createAvatarRanking({ client, store, reportWarning = console.warn }) {
  const context = { client, store, reportWarning };
  const pending = new Map();
  return {
    top: (limit = 8, options = {}) => readTop(context, limit, options),
    record(rawPath, options = {}) {
      const key = normalizeAvatarStorageKey(rawPath);
      if (!key) return Promise.resolve({ status: 'skipped' });
      if (!pending.has(key)) {
        const task = recordUsage(context, key, options).finally(() => pending.delete(key));
        pending.set(key, task);
      }
      return pending.get(key);
    },
  };
}
