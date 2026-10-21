import { WorkerError } from '../middleware/http.js';

/** Redis credentials exist only in the Worker; never retry a command automatically. */
export function avatarRedis(env, fetchImpl) {
  let url;
  try { url = new URL(env.AVATAR_REDIS_URL); } catch { throw new WorkerError('Ranking no configurado.', 503); }
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.upstash.io') || url.username || url.password
    || url.pathname !== '/' || url.search || url.hash || !env.AVATAR_REDIS_TOKEN) throw new WorkerError('Ranking no configurado.', 503);
  return async (command, { write = false } = {}) => {
    let response;
    let body;
    try {
      response = await fetchImpl(url.href, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
        headers: { Authorization: `Bearer ${env.AVATAR_REDIS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(command) });
      body = await response.json();
    } catch { throw new WorkerError('No se pudo confirmar la respuesta del ranking.', 502, write ? 'unknown' : 'failed'); }
    if (!response.ok || !body || body.error || !Object.hasOwn(body, 'result')) {
      throw new WorkerError('El ranking no pudo completar la operación.', 502, write ? 'unknown' : 'failed');
    }
    return body.result;
  };
}
