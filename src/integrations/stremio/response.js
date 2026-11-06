/** Bound decoded response bytes before parsing private or public provider data. */
export async function readBoundedJson(response, limit = 16 * 1024 * 1024) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('El proveedor devolvió una respuesta vacía.');
  const chunks = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) {
      await reader.cancel();
      throw new Error('La respuesta supera el tamaño de importación admitido.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new Error('El proveedor devolvió una respuesta inválida.'); }
}
