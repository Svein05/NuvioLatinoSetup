import { HttpError, requestJson } from '../../shared/http/request-json.js';

function instanceRoot(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('La instancia de AIOStreams requiere una URL HTTPS sin credenciales ni parámetros.');
  }
  return url.href.replace(/\/+$/, '');
}

function manifestCredentials(data, root) {
  const { uuid, encryptedPassword } = data?.data || {};
  const segment = value => typeof value === 'string' && /^[a-zA-Z0-9_=-]{1,8192}$/.test(value);
  if (data?.success !== true || !segment(uuid) || !segment(encryptedPassword)) {
    throw new HttpError('AIOStreams no devolvió credenciales de manifiesto válidas.', {
      code: 'INVALID_AIOSTREAMS_RESPONSE', outcome: data?.success === false ? 'failed' : 'unknown',
    });
  }
  return { uuid, encryptedPassword, manifestUrl: `${root}/stremio/${uuid}/${encryptedPassword}/manifest.json` };
}

/** One request through the configured trusted proxy, or directly when no proxy is supplied. */
export async function createStreamingUser(instance, config, password, options = {}) {
  const { proxyUrl, ...http } = options;
  const root = instanceRoot(instance);
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('La configuración de AIOStreams no es válida.');
  if (typeof password !== 'string' || password.trim().length < 6) throw new Error('La contraseña de AIOStreams debe tener al menos seis caracteres.');
  const endpoint = `${root}/api/v1/user`;
  const target = proxyUrl ? `${instanceRoot(proxyUrl)}/${endpoint}` : endpoint;
  http.signal?.throwIfAborted();
  let data;
  try {
    data = await requestJson(target, { ...http, timeoutMs: http.timeoutMs ?? 9000,
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, password: password.trim() }), credentials: 'omit', redirect: 'error' });
  } catch (error) {
    throw new HttpError('No se pudo confirmar la creación de AIOStreams.', {
      status: error.status, code: error.code,
      outcome: error.outcome === 'unknown' || error.status >= 500 || error.status === 408 ? 'unknown' : 'failed', cause: error,
    });
  }
  return manifestCredentials(data, root);
}
