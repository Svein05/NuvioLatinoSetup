import { json, readJson, WorkerError } from '../middleware/http.js';
import { metricsEnvironment } from '../middleware/production-metrics.js';
import { avatarRedis } from '../integrations/avatar-redis.js';
import { completionKey, completionCommand, completionCount } from '../services/completions.js';

const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);

export async function completionsRoute(request, env, { fetchImpl, now }) {
  const redis = avatarRedis(env, fetchImpl);
  const environment = metricsEnvironment(request, request.method === 'POST');
  if (request.method === 'GET') return json({ value: completionCount(await redis(['GET', completionKey(environment)]), environment), environment });
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
  const body = await readJson(request, 1024);
  if (!body || Object.keys(body).some(key => !['clientId', 'completionId'].includes(key)) || !uuid(body.clientId)
    || (Object.hasOwn(body, 'completionId') && !uuid(body.completionId))) {
    throw new WorkerError('Identificador de finalización inválido.');
  }
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) throw new WorkerError('No se pudo verificar el origen de red.', 403);
  const result = await redis(await completionCommand({ ...body, ip, now: now(), environment }), { write: true });
  if (!Array.isArray(result) || !['recorded', 'duplicate', 'limited', 'overflow'].includes(result[0]) || result[1] === null) {
    throw new WorkerError('No se pudo confirmar la finalización.', 502, 'unknown');
  }
  const value = completionCount(result[1], environment);
  if (result[0] === 'limited') throw new WorkerError('Límite de finalizaciones alcanzado.', 429);
  if (result[0] === 'overflow') throw new WorkerError('Contador fuera de rango.', 503);
  return json({ value, status: result[0], environment });
}
