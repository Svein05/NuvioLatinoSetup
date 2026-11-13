import { readBoundedJson } from './response.js';

async function request(operation, body, signal) {
  const response = await fetch(`https://api.strem.io/api/${operation}`, {
    method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error',
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000),
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await readBoundedJson(response);
  if (!response.ok || data.error) {
    const error = new Error(operation === 'login' ? 'Correo o contraseña de Stremio incorrectos, o servicio no disponible.' : 'Stremio no pudo confirmar la operación.');
    error.confirmedRejection = Boolean(data.error) || (response.status >= 400 && response.status < 500 && response.status !== 408);
    throw error;
  }
  return data.result;
}

export async function connectStremio({ email, password, signal }) {
  const auth = await request('login', { type: 'Login', email, password, facebook: false }, signal);
  if (typeof auth?.authKey !== 'string' || !auth.authKey) throw new Error('Stremio no confirmó la sesión.');
  const session = { authKey: auth.authKey, email };
  const addons = await readStremioAddons(session, signal);
  return { session, addons };
}

export async function readStremioAddons(session, signal) {
  const data = await request('addonCollectionGet', { authKey: session.authKey, update: false }, signal);
  if (!Array.isArray(data?.addons)) throw new Error('La lista de addons de Stremio no es compatible.');
  if (data.addons.some(addon => !addon.transportUrl || !addon.manifest?.id)) throw new Error('Stremio devolvió un addon incompleto. No se modificó la cuenta.');
  return data.addons;
}

export async function writeStremioAddons(session, addons, signal) {
  try {
    const result = await request('addonCollectionSet', { authKey: session.authKey, addons }, signal);
    if (result?.success !== true) throw new Error('Stremio no confirmó el guardado.');
  } catch (error) {
    error.outcome = error.confirmedRejection ? 'rejected' : 'unknown';
    throw error;
  }
}
