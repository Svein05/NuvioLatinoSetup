import { WorkerError } from '../middleware/http.js';
import { identityHash } from '../shared/identity-hash.js';

export function avatarRankingKey(value) {
  if (typeof value !== 'string' || value.length > 512 || /[<>\\:?#]/.test(value)
    || [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) throw new WorkerError('Avatar inválido.');
  const parts = value.split('/');
  if (![2, 3].includes(parts.length) || parts.some(part => !part.trim() || part === '.' || part === '..' || part.startsWith('.'))
    || !/\.(webp|png|jpe?g|svg)$/i.test(parts.at(-1))) throw new WorkerError('Avatar inválido.');
  return value;
}

// The vote, account limit and increment share one server-side atomic operation.
export const RECORD_AVATAR_SCRIPT = `
local previous = redis.call('ZSCORE', KEYS[1], ARGV[1]) or '0'
if redis.call('EXISTS', KEYS[2]) == 1 then return {'duplicate', previous} end
local daily = tonumber(redis.call('GET', KEYS[3]) or '0')
if daily >= 100 then return {'limited', previous} end
local score = redis.call('ZINCRBY', KEYS[1], 1, ARGV[1])
redis.call('SET', KEYS[2], '1', 'EX', 86400)
redis.call('INCR', KEYS[3])
if daily == 0 then redis.call('EXPIRE', KEYS[3], 172800) end
return {'recorded', score}
`;

export async function avatarVoteCommand(userId, key, now = Date.now()) {
  const [user, avatar] = await Promise.all([identityHash(userId), identityHash(key)]);
  return ['EVAL', RECORD_AVATAR_SCRIPT, 3, 'avatar_ranks', `avatar_rank_vote:${user}:${avatar}`,
    `avatar_rank_daily:${user}:${Math.floor(now / 86400000)}`, key];
}

export function rankedAvatars(raw) {
  if (!Array.isArray(raw) || raw.length % 2) throw new WorkerError('Respuesta de ranking inválida.', 502);
  const items = [];
  for (let index = 0; index < raw.length; index += 2) {
    const value = raw[index + 1];
    if (!['string', 'number'].includes(typeof value) || String(value).trim() === '') throw new WorkerError('Puntuación de ranking inválida.', 502);
    const score = Number(value);
    if (!Number.isSafeInteger(score) || score < 0) throw new WorkerError('Puntuación de ranking inválida.', 502);
    try { items.push({ key: avatarRankingKey(raw[index]), score }); }
    catch { /* Ignore obsolete legacy members with non-avatar keys, without rendering them. */ }
  }
  return items;
}
