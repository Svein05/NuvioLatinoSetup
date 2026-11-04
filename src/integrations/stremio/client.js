/** Read-only Stremio API. Authentication and snapshots are never persisted. */
async function request(operation, body, { signal, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`https://api.strem.io/api/${operation}`, {
    method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error',
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000),
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Stremio devolvió una respuesta vacía.');
  const chunks = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 16 * 1024 * 1024) {
      await reader.cancel();
      throw new Error('La cuenta supera el tamaño de importación admitido.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let data;
  try { data = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new Error('Stremio devolvió una respuesta inválida.'); }
  if (!response.ok || data.error) {
    throw new Error(operation === 'login' ? 'No se pudo iniciar sesión. Revisa tu correo y contraseña de Stremio.'
      : 'No se pudieron leer los datos de Stremio. Inténtalo nuevamente.');
  }
  return data.result;
}

export async function readStremioAccount({ email, password, signal, fetchImpl }) {
  const options = { signal, fetchImpl };
  let authKey;
  try {
    const auth = await request('login', { type: 'Login', email, password, facebook: false }, options);
    authKey = auth?.authKey;
    if (typeof authKey !== 'string' || !authKey) throw new Error('Stremio no confirmó la sesión.');
    const [collection, library] = await Promise.all([
      request('addonCollectionGet', { authKey, update: false }, options),
      request('datastoreGet', { authKey, collection: 'libraryItem', ids: [], all: true }, options),
    ]);
    if (!Array.isArray(collection?.addons) || !Array.isArray(library)) throw new Error('El formato de la cuenta de Stremio no es compatible.');
    return { addons: collection.addons, library };
  } finally { password = ''; authKey = null; }
}
