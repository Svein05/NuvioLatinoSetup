import { requestJson } from '../../shared/http/request-json.js';

export function createPublicMetadataClient(baseUrl, { fetchImpl = fetch } = {}) {
  const root = new URL(baseUrl);
  if (root.protocol !== 'https:' || root.username || root.password || root.search || root.hash) throw new Error('Worker público inválido.');
  const read = (path, signal) => requestJson(root.href.replace(/\/$/, '') + path,
    { fetchImpl, signal, credentials: 'omit', redirect: 'error', timeoutMs: 6000 });
  return {
    async catalog({ signal } = {}) {
      const data = await read('/api/avatars/catalog', signal);
      if (!/^[a-f0-9]{40}$/.test(data.revision || '') || !Array.isArray(data.registry) || !data.registry.length
        || data.registry.some(group => typeof group.style !== 'string' || typeof group.franchise !== 'string'
          || !Array.isArray(group.files) || group.files.some(file => typeof file !== 'string'))) throw new Error('Catálogo público inválido.');
      return data;
    },
    async stars({ signal } = {}) {
      const data = await read('/api/repository/stars', signal);
      if (!Number.isSafeInteger(data.count) || data.count < 0) throw new Error('Conteo público inválido.');
      return data.count;
    },
  };
}
