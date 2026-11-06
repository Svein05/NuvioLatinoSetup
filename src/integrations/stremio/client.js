import { readBoundedJson } from './response.js';

/** Read-only Stremio API. Authentication and snapshots are never persisted. */
async function request(operation, body, { signal, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`https://api.strem.io/api/${operation}`, {
    method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error',
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000),
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await readBoundedJson(response);
  if (!response.ok || data.error) {
    throw new Error(operation === 'login' ? 'No se pudo iniciar sesión. Revisa tu correo y contraseña de Stremio.'
      : 'No se pudieron leer los datos de Stremio. Inténtalo nuevamente.');
  }
  return data.result;
}

export async function readStremioAccount({ email, password, signal, fetchImpl }) {
  const options = { signal, fetchImpl };
  const auth = await request('login', { type: 'Login', email, password, facebook: false }, options);
  const authKey = auth?.authKey;
  if (typeof authKey !== 'string' || !authKey) throw new Error('Stremio no confirmó la sesión.');
  const [collection, library] = await Promise.all([
    request('addonCollectionGet', { authKey, update: false }, options),
    request('datastoreGet', { authKey, collection: 'libraryItem', ids: [], all: true }, options),
  ]);
  if (!Array.isArray(collection?.addons) || !Array.isArray(library)) throw new Error('El formato de la cuenta de Stremio no es compatible.');
  return { addons: collection.addons, library };

}
