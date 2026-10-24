import { WorkerError, json, readJson } from '../middleware/http.js';
import { authenticatedNuvioUser } from '../middleware/nuvio-user.js';
import { avatarRedis } from '../integrations/avatar-redis.js';
import { avatarRankingKey, avatarVoteCommand, rankedAvatars } from '../services/avatar-ranking.js';
import { requireProductionMetrics } from '../middleware/production-metrics.js';

export async function avatarRankingRoute(request, env, fetchImpl) {
  const url = new URL(request.url);
  const reading = url.pathname === '/api/avatars/ranking';
  if (request.method !== (reading ? 'GET' : 'POST')) return json({ error: 'Método no permitido.' }, 405);
  if (reading) {
    const limit = Number(url.searchParams.get('limit') ?? 8);
    if (!Number.isInteger(limit) || limit < 1 || limit > 32) throw new WorkerError('Límite de ranking inválido.');
    const redis = avatarRedis(env, fetchImpl);
    const all = rankedAvatars(await redis(['ZREVRANGE', 'avatar_ranks', 0, -1, 'WITHSCORES']));
    const totalUsage = all.reduce((total, item) => total + item.score, 0);
    if (!Number.isSafeInteger(totalUsage)) throw new WorkerError('Total de ranking inválido.', 502);
    return json({ items: all.slice(0, limit), totalUsage });
  }
  requireProductionMetrics(request);
  const payload = await readJson(request, 2048);
  if (!payload || Object.keys(payload).some(key => key !== 'key')) throw new WorkerError('Cuerpo de voto inválido.');
  const key = avatarRankingKey(payload.key);
  const user = await authenticatedNuvioUser(request, env, fetchImpl);
  const redis = avatarRedis(env, fetchImpl);
  const result = await redis(await avatarVoteCommand(user, key), { write: true });
  if (!Array.isArray(result) || !['recorded', 'duplicate', 'limited'].includes(result[0])
    || !Number.isSafeInteger(Number(result[1])) || Number(result[1]) < 0) throw new WorkerError('No se pudo confirmar el voto.', 502, 'unknown');
  if (result[0] === 'limited') return json({ error: 'Límite diario de votos alcanzado.' }, 429);
  return json({ status: result[0], score: Number(result[1]) });
}
