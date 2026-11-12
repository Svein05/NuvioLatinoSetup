import { requestJson } from '../../shared/http/request-json.js';
import { metadataInstance } from './contracts.js';

async function readTraktLists(request, instance, account, signal) {
  const lists = [];
  for (let page = 1; page <= 5; page++) {
    const rows = await request(instance, '/api/trakt/proxy', { tokenId: account.tokenId,
      endpoint: `/users/${encodeURIComponent(account.username)}/lists?limit=100&page=${page}`, method: 'GET' }, signal);
    if (!Array.isArray(rows)) throw new Error('No se pudo leer la lista completa de catálogos.');
    lists.push(...rows);
    if (rows.length < 100) return { lists };
  }
  throw new Error('Tu cuenta supera el límite de listas de esta vista.');
}

/** Only allowlisted instances may receive a private connection identifier. */
export function createConnectionsClient(instances, options = {}) {
  const allowed = new Set(instances.map(metadataInstance));
  const request = (instance, path, body, signal) => {
    const root = metadataInstance(instance);
    if (!allowed.has(root)) throw new Error('Instancia de AIOMetadata no permitida.');
    return requestJson(`${root}${path}`, { ...options, signal, credentials: 'omit', redirect: 'error', cache: 'no-store',
      method: body ? 'POST' : 'GET', ...(body && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  };
  return {
    capabilities: (instance, signal) => request(instance, '/api/config', null, signal),
    async verify(instance, provider, tokenId, signal) {
      if (!tokenId || tokenId.length > 512 || /\s/.test(tokenId)) throw new Error('Pega el identificador de conexión completo, sin espacios.');
      const info = await request(instance, '/api/oauth/token/info', { tokenId }, signal);
      if (info?.provider !== provider || !info.username || info.status === 'invalid') {
        throw new Error('El identificador no corresponde a este servicio o necesita volver a conectarse.');
      }
      return { username: String(info.username).slice(0, 150), authVersion: info.authVersion };
    },
    async lists(instance, provider, account, signal) {
      const { tokenId } = account;
      if (provider === 'mal') return { lists: [] };
      if (provider === 'trakt') {
        return readTraktLists(request, instance, account, signal);
      }
      const result = await request(instance, `/api/${provider}/lists`, { tokenId }, signal);
      if (result?.error) return { lists: [], limitation: result.error };
      if (!Array.isArray(result?.lists) || result.lists.length > 500) throw new Error('AIOMetadata no devolvió una lista compatible.');
      return { lists: result.lists };
    },
  };
}
