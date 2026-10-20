import { HttpError, requestJson } from '../../shared/http/request-json.js';

export function createAvatarSuggestionsClient(baseUrl, { fetchImpl = fetch } = {}) {
  const url = new URL(baseUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Worker de sugerencias inválido.');
  return {
    async send(suggestion, { accessToken, requestId, signal } = {}) {
      signal?.throwIfAborted();
      if (!accessToken) throw new HttpError('Inicia sesión en Nuvio para enviar una sugerencia.', { status: 401 });
      const body = new FormData();
      for (const field of ['mode', 'characterName', 'seriesName']) body.set(field, suggestion[field]);
      body.set('requestId', requestId);
      if (suggestion.mode === 'file') body.set('file', suggestion.file);
      else body.set('url', suggestion.url);
      let result;
      try {
        result = await requestJson(`${url.href.replace(/\/+$/, '')}/api/avatars/suggestions`, { fetchImpl, signal,
          method: 'POST', body, headers: { Authorization: `Bearer ${accessToken}` },
          redirect: 'error', credentials: 'omit', timeoutMs: 25000 });
      } catch (error) {
        throw new HttpError('No se pudo confirmar el envío de la sugerencia.', { status: error.status,
          outcome: error.outcome === 'unknown' || error.status >= 500 || error.status === 408 ? 'unknown' : 'failed' });
      }
      if (result?.status !== 'sent') throw new HttpError('La respuesta no confirma el envío.', { outcome: 'unknown' });
      return result;
    },
  };
}
