import { requestJson } from '../../shared/http/request-json.js';
import { debridProviders } from './providers.js';

const failed = (status, error) => ({ valid: false, status, error });

/** A key's shape never proves provider authorization; errors never echo the key or response body. */
export async function validateDebridKey(serviceId, apiKey, { fetchImpl = fetch, signal, now = Date.now, timeoutMs = 5000 } = {}) {
  signal?.throwIfAborted();
  const key = String(apiKey || '').trim();
  if (!key) return failed('invalid', 'La clave API no puede estar vacía.');
  const id = String(serviceId).toLowerCase();
  const provider = Object.hasOwn(debridProviders, id) ? debridProviders[id] : null;
  if (!provider) return failed('unsupported', 'Este proveedor no permite verificación en esta aplicación.');
  const { url, headers } = provider.request(key);
  try {
    const data = await requestJson(url, { headers, fetchImpl, signal, timeoutMs, credentials: 'omit', redirect: 'error' });
    signal?.throwIfAborted();
    if (provider.rejected(data)) return failed('invalid', 'El proveedor rechazó la clave API.');
    if (!provider.accepted(data)) return failed('unverifiable', 'El proveedor no devolvió una verificación reconocible.');
    const account = provider.account(data, now());
    return { valid: true, status: 'valid', user: String(account.user), plan: account.plan };
  } catch (error) {
    signal?.throwIfAborted();
    return [400, 401, 403].includes(error.status)
      ? failed('invalid', 'El proveedor rechazó la clave API.')
      : failed('unverifiable', 'No se pudo verificar la clave con el proveedor. Reintenta más tarde.');
  }
}
