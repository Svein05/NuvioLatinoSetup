import { json, readJson, WorkerError } from '../middleware/http.js';
import { requireProductionMetrics } from '../middleware/production-metrics.js';
import { avatarRedis } from '../integrations/avatar-redis.js';
import { COMPLETION_KEY, completionCommand, completionCount } from '../services/completions.js';

export async function completionsRoute(request, env, { fetchImpl, now }) {
  const redis = avatarRedis(env, fetchImpl);
  if (request.method === 'GET') return json({ value: completionCount(await redis(['GET', COMPLETION_KEY])) });
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
  requireProductionMetrics(request);
  const body = await readJson(request, 1024);
  if (!body || Object.keys(body).length !== 1 || typeof body.clientId !== 'string'
    || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.clientId)) {
    throw new WorkerError('Identificador de finalización inválido.');
  }
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) throw new WorkerError('No se pudo verificar el origen de red.', 403);
  const result = await redis(await completionCommand({ clientId: body.clientId, ip, now: now() }), { write: true });
  if (!Array.isArray(result) || !['recorded', 'duplicate', 'limited', 'overflow'].includes(result[0]) || result[1] === null) {
    throw new WorkerError('No se pudo confirmar la finalización.', 502, 'unknown');
  }
  const value = completionCount(result[1]);
  if (result[0] === 'limited') throw new WorkerError('Límite de finalizaciones alcanzado.', 429);
  if (result[0] === 'overflow') throw new WorkerError('Contador fuera de rango.', 503);
  return json({ value, status: result[0] });
}
