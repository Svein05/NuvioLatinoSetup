import { requestJson } from '../../shared/http/request-json.js';
import { debridProviders } from './providers.js';

const failed = (status, error) => ({ valid: false, status, error });
const formatOnlyProviders = new Set(['easydebrid', 'debrider', 'torrin', 'offcloud']);

/** A key's shape never proves provider authorization; errors never echo the key or response body. */
export async function validateDebridKey(serviceId, apiKey, { fetchImpl = fetch, signal, now = Date.now, timeoutMs = 10000, proxyUrl, allowFormatValidation = false } = {}) {
  signal?.throwIfAborted();
  const key = String(apiKey || '').trim();
  if (!key) return failed('invalid', 'La clave API no puede estar vacía.');
  const id = String(serviceId).toLowerCase();
  const provider = Object.hasOwn(debridProviders, id) ? debridProviders[id] : null;
  if (!provider && allowFormatValidation && formatOnlyProviders.has(id)) {
    return /^[\x21-\x7e]{8,2048}$/.test(key)
      ? { valid: true, status: 'format-valid', user: 'Formato correcto', plan: 'Solo se comprobó el formato; no se consultó al proveedor.' }
      : failed('invalid', 'Usa una clave de 8 a 2048 caracteres ASCII, sin espacios.');
  }
  if (!provider) return failed('unsupported', 'Este proveedor no permite verificación en esta aplicación.');
  const { url, headers } = provider.request(key);
  try {
    if (id === 'torbox' && proxyUrl) {
      const result = await requestJson(`${proxyUrl.replace(/\/$/, '')}/api/debrid/torbox/validate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: key }),
        fetchImpl, signal, timeoutMs, credentials: 'omit', redirect: 'error', cache: 'no-store',
      });
      return result?.valid === true && result.status === 'valid' ? result
        : failed(result?.status === 'invalid' ? 'invalid' : 'unverifiable', result?.error || 'No se pudo verificar la clave con TorBox.');
    }
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
