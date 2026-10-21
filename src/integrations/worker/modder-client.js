import { HttpError } from '../../shared/http/request-json.js';

function cleanBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

function parseWorkerResponse(rawText, status) {
  try {
    return JSON.parse(rawText);
  } catch {
    if (rawText.includes('Nuvio Worker activo')) {
      const err = new Error('El Cloudflare Worker respondió "Nuvio Worker activo" en vez de procesar el guardado. Falta actualizar el código del Worker en el panel de Cloudflare para habilitar el endpoint /api/save-staged-changes.');
      err.code = 'WORKER_OUTDATED';
      throw err;
    }
    throw new HttpError(`Respuesta no válida del servidor (${status}).`, { outcome: 'unknown' });
  }
}

export function createModderClient({ baseUrl = '', fetchImpl = globalThis.fetch } = {}) {
  const root = cleanBaseUrl(baseUrl);

  return {
    async verifyPassword(password, email = '') {
      const endpoint = `${root}/api/verify-auth`;
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new HttpError(data?.error || 'Credenciales de Modder no válidas.', { status: res.status });
      }
      return await res.json();
    },

    async saveStagedChanges(payload) {
      const endpoint = `${root}/api/save-staged-changes`;
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        signal: AbortSignal.timeout(30000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(cause => { throw new HttpError('No se pudo confirmar la publicación.', { cause, outcome: 'unknown' }); });

      const rawText = await res.text();
      const data = parseWorkerResponse(rawText, res.status);

      if (!res.ok || !data?.success) {
        throw new HttpError(data?.error || 'Error desconocido al guardar los cambios en GitHub.', {
          status: res.status, outcome: res.status >= 500 ? 'unknown' : 'failed',
        });
      }

      return data;
    },
  };
}
