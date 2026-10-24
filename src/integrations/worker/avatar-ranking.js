import { HttpError, requestJson } from '../../shared/http/request-json.js';

async function readSummary(root, fetchImpl, { limit, signal }) {
  signal?.throwIfAborted();
  if (!Number.isInteger(limit) || limit < 1 || limit > 32) throw new Error('Límite de ranking inválido.');
  const data = await requestJson(`${root}/api/avatars/ranking?limit=${limit}`, { fetchImpl, signal,
    credentials: 'omit', redirect: 'error', timeoutMs: 2500 });
  if (!Array.isArray(data?.items) || data.items.some(item => typeof item?.key !== 'string'
    || !Number.isSafeInteger(item.score) || item.score < 0)) throw new HttpError('Ranking inválido.');
  const totalUsage = data.totalUsage ?? null;
  if (totalUsage !== null && (!Number.isSafeInteger(totalUsage) || totalUsage < 0
    || totalUsage < data.items.reduce((sum, item) => sum + item.score, 0))) throw new HttpError('Total de ranking inválido.');
  return { items: data.items, totalUsage };
}

export function createAvatarRankingClient(baseUrl, { fetchImpl = fetch } = {}) {
  const base = new URL(baseUrl);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) throw new Error('Worker de ranking inválido.');
  const root = base.href.replace(/\/+$/, '');
  return {
    async top(limit, { signal } = {}) {
      return (await readSummary(root, fetchImpl, { limit, signal })).items;
    },
    summary: (limit = 32, { signal } = {}) => readSummary(root, fetchImpl, { limit, signal }),
    async record(key, { accessToken, signal } = {}) {
      signal?.throwIfAborted();
      if (!accessToken) throw new HttpError('Se requiere sesión de Nuvio.', { status: 401 });
      let data;
      try {
        data = await requestJson(`${root}/api/avatars/usage`, { fetchImpl, signal, timeoutMs: 12000,
          method: 'POST', credentials: 'omit', redirect: 'error',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) });
      } catch (error) {
        throw new HttpError('No se pudo confirmar el voto.', { status: error.status,
          outcome: error.outcome === 'unknown' || error.status >= 500 || error.status === 408 ? 'unknown' : 'failed' });
      }
      if (!['recorded', 'duplicate'].includes(data?.status) || !Number.isSafeInteger(data.score) || data.score < 0) {
        throw new HttpError('No se pudo confirmar el voto.', { outcome: 'unknown' });
      }
      return data;
    },
  };
}
