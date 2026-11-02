import { json, WorkerError } from '../middleware/http.js';
import { refreshPublicData } from '../services/public-github.js';

// Only public refresh tasks are shared; never retain request credentials or user data.
const tasks = new WeakMap();
const generations = new WeakMap();
const prefix = 'public-metadata:v1:';

export async function invalidatePublicCatalog(env) {
  const kv = env.POSTER_FEED_KV;
  if (kv) {
    generations.set(kv, (generations.get(kv) || 0) + 1);
    tasks.get(kv)?.delete('catalog');
    await kv.delete(prefix + 'catalog');
  }
}

export async function publicMetadataRoute(request, env, { kind, fetchImpl, now, context }) {
  if (request.method !== 'GET') return json({ error: 'Método no permitido.' }, 405);
  const kv = env.POSTER_FEED_KV;
  if (!kv) throw new WorkerError('Caché pública no configurada.', 503);
  const key = prefix + kind;
  const ttl = kind === 'catalog' ? 300000 : 21600000;
  let previous;
  try { previous = await kv.get(key, 'json'); } catch { /* A cold read can still refresh from the origin. */ }
  const valid = previous && Number.isFinite(previous.updatedAt)
    && (kind === 'catalog' ? Array.isArray(previous.registry) && previous.registry.length && /^[a-f0-9]{40}$/.test(previous.revision)
      : Number.isSafeInteger(previous.count) && previous.count >= 0);
  const age = valid ? now() - previous.updatedAt : Infinity;
  const refresh = () => {
    if (!tasks.has(kv)) tasks.set(kv, new Map());
    const pending = tasks.get(kv);
    if (!pending.has(kind)) {
      const generation = generations.get(kv) || 0;
      const task = refreshPublicData(kind, valid ? previous : null, env, fetchImpl, now).then(async data => {
        if (kind !== 'catalog' || generation === (generations.get(kv) || 0)) await kv.put(key, JSON.stringify(data));
        return data;
      }).catch(async error => {
        if (valid && (kind !== 'catalog' || generation === (generations.get(kv) || 0))) {
          try { await kv.put(key, JSON.stringify({ ...previous, retryAfter: now() + 60000 })); }
          catch { /* Preserve the available response when cache storage is unavailable. */ }
        }
        throw error;
      }).finally(() => { if (pending.get(kind) === task) pending.delete(kind); });
      pending.set(kind, task);
    }
    return pending.get(kind);
  };
  let data = valid ? previous : null;
  let stale = age < 0 || age >= ttl;
  if (stale && data?.retryAfter > now()) {
    // Bound upstream retries while serving the previous confirmed public snapshot.
  } else if (stale && data && context?.waitUntil) {
    context.waitUntil(refresh().catch(() => console.warn('Public metadata refresh failed; cached snapshot retained.')));
  } else if (stale) {
    try { data = await refresh(); stale = false; }
    catch { if (!data) throw new WorkerError('Información pública no disponible.', 503); }
  }
  const response = json({ ...data, stale });
  response.headers.set('Cache-Control', stale ? 'public, max-age=30' : `public, max-age=${kind === 'catalog' ? 60 : 300}`);
  return response;
}
