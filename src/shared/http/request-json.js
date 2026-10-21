export class HttpError extends Error {
  constructor(message, { status = null, code = null, outcome = 'failed', cause } = {}) {
    super(message, { cause });
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.outcome = outcome;
  }
}

function rejectedResponse(response, body) {
  return new HttpError(`El servidor rechazó la operación (HTTP ${response.status}).`, {
    status: response.status,
    code: typeof body?.code === 'string' ? body.code : (typeof body?.error_code === 'string' ? body.error_code : null),
  });
}

/** JSON transport. Does not retry writes or expose response bodies in errors. */
export async function requestJson(url, options = {}) {
  const { fetchImpl = globalThis.fetch, timeoutMs = 15000, responseMetadata = false, allowEmpty = false, ...init } = options;
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  let response;
  try {
    response = await fetchImpl(url, { ...init, signal });
  } catch (cause) {
    const write = !['GET', 'HEAD'].includes(init.method || 'GET');
    throw new HttpError('No se pudo confirmar la respuesta del servidor.', {
      outcome: write ? 'unknown' : 'failed', cause,
    });
  }
  if (response.status === 204) return null;
  let body;
  try {
    if (allowEmpty && response.ok) {
      const text = await response.text();
      body = text.trim() ? JSON.parse(text) : null;
    } else body = await response.json();
  } catch (cause) {
    if (!response.ok) throw rejectedResponse(response);
    throw new HttpError('El servidor devolvió una respuesta JSON inválida.', {
      outcome: ['GET', 'HEAD'].includes(init.method || 'GET') ? 'failed' : 'unknown', cause,
    });
  }
  if (!response.ok) throw rejectedResponse(response, body);
  return responseMetadata ? { data: body, headers: response.headers } : body;
}
