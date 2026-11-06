import { json, readJson, WorkerError } from '../middleware/http.js';

function allowOrigin(request) {
  const origin = new URL(request.headers.get('Origin') || 'https://invalid.local');
  const allowed = origin.origin === 'https://guia.lat-add.com'
    || (origin.protocol === 'https:' && /^(?:[a-z0-9-]+\.)?testing-latinosetup\.pages\.dev$/.test(origin.hostname))
    || (origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname));
  if (!allowed) throw new WorkerError('Origen no permitido.', 403);
}

/** Fixed read-only provider request; never forward an arbitrary URL or return account details. */
export async function validateTorboxRoute(request, fetchImpl) {
  allowOrigin(request);
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
  const body = await readJson(request, 4096);
  const key = typeof body?.apiKey === 'string' ? body.apiKey.trim() : '';
  if (!key || key.length > 2048) throw new WorkerError('Clave no válida.');
  let result;
  try {
    const response = await fetchImpl('https://api.torbox.app/v1/api/user/me', {
      method: 'GET', headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      redirect: 'manual', signal: AbortSignal.timeout(8000),
    });
    if ([400, 401, 403].includes(response.status)) result = { valid: false, status: 'invalid', error: 'El proveedor rechazó la clave API.' };
    else if (!response.ok) result = { valid: false, status: 'unverifiable', error: 'TorBox no está disponible. Inténtalo nuevamente.' };
    else {
      const data = await readJson(response, 65536);
      result = data?.success === true && data.data && typeof data.data === 'object'
        ? { valid: true, status: 'valid', user: 'TorBox', plan: data.data.plan === 0 ? 'Gratis' : 'Cuenta verificada' }
        : { valid: false, status: data?.success === false ? 'invalid' : 'unverifiable', error: 'TorBox no confirmó la clave.' };
    }
  } catch { result = { valid: false, status: 'unverifiable', error: 'No se pudo conectar con TorBox. Inténtalo nuevamente.' }; }
  const response = json(result);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Vary', 'Origin');
  return response;
}
