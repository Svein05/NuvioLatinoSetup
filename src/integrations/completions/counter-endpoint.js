import { HttpError, requestJson } from '../../shared/http/request-json.js';

function endpointUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new HttpError('Endpoint del contador inválido.', { code: 'INVALID_COUNTER_URL' });
  }
  return url.href;
}

/** Legacy counter services increment via GET. A transport failure can still mean a committed hit. */
export async function requestCounterValue(endpoint, { increment = false, ...options } = {}) {
  const url = endpointUrl(endpoint);
  options.signal?.throwIfAborted();
  try {
    const data = await requestJson(url, { timeoutMs: increment ? 3500 : 3000, credentials: 'omit', ...options });
    if (!Number.isSafeInteger(data?.value) || data.value < 0) {
      throw new HttpError('Respuesta del contador inválida.', { code: 'INVALID_COUNTER_VALUE' });
    }
    return data.value;
  } catch (error) {
    // No fallback/retry after an ambiguous mutation, even though its transport verb is GET.
    const rejected = [400, 401, 403, 404, 405, 422, 429].includes(error.status);
    if (increment && !rejected) {
      throw new HttpError('No se pudo confirmar el incremento del contador.', { outcome: 'unknown', cause: error });
    }
    throw error;
  }
}
