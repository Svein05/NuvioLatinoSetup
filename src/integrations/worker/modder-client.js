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
    throw new Error(`Respuesta no válida del servidor (${status}): ${rawText.slice(0, 150)}`);
  }
}

export function createModderClient({ baseUrl = '', fetchImpl = globalThis.fetch } = {}) {
  const root = cleanBaseUrl(baseUrl);

  return {
    async verifyPassword(password, email = '') {
      const endpoint = `${root}/api/verify-auth`;
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Credenciales de Modder no válidas.');
      }
      return await res.json();
    },

    async saveStagedChanges(payload) {
      const endpoint = `${root}/api/save-staged-changes`;
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const rawText = await res.text();
      const data = parseWorkerResponse(rawText, res.status);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Error desconocido al guardar los cambios en GitHub.');
      }

      return data;
    },
  };
}
