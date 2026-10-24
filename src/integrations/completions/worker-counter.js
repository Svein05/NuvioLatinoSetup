import { HttpError, requestJson } from '../../shared/http/request-json.js';

export function createWorkerCounter(baseUrl, { fetchImpl = fetch, clientId } = {}) {
  const endpoint = new URL('/api/completions', baseUrl);
  if (endpoint.protocol !== 'https:') throw new Error('Worker del contador inválido.');
  const request = async (increment, signal) => {
    let data;
    try {
      data = await requestJson(endpoint.href, { fetchImpl, signal, credentials: 'omit', redirect: 'error', timeoutMs: 8000,
        ...(increment ? { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: clientId() }) } : {}) });
    } catch (error) {
      if (increment) throw new HttpError('No se pudo confirmar la finalización.', { status: error.status,
        outcome: error.status >= 400 && error.status < 500 && error.status !== 408 ? 'failed' : 'unknown' });
      throw error;
    }
    if (!Number.isSafeInteger(data?.value) || data.value < 0
      || (increment && !['recorded', 'duplicate'].includes(data.status))) {
      throw new HttpError('Contador inválido.', { outcome: increment ? 'unknown' : 'failed' });
    }
    return data.value;
  };
  return { read: (_endpoint, { signal } = {}) => request(false, signal), increment: () => request(true) };
}
