export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-password',
};

export class WorkerError extends Error {
  constructor(message, status = 400, outcome = 'failed') {
    super(message);
    this.status = status;
    this.outcome = outcome;
  }
}

export function json(data, status = 200) {
  return Response.json(data, { status, headers: corsHeaders });
}

export async function readBodyBytes(request, limit) {
  if (Number(request.headers.get('content-length')) > limit) throw new WorkerError('El lote supera el tamaño permitido.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new WorkerError('Falta el cuerpo de la petición.');
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) {
      await reader.cancel();
      throw new WorkerError('El lote supera el tamaño permitido.', 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

export async function readJson(request, limit = 25 * 1024 * 1024) {
  try { return JSON.parse(new TextDecoder().decode(await readBodyBytes(request, limit))); }
  catch (error) {
    if (error instanceof WorkerError) throw error;
    throw new WorkerError('El cuerpo JSON no es válido.');
  }
}
