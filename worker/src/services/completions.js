import { WorkerError } from '../middleware/http.js';
import { identityHash } from '../shared/identity-hash.js';

export const COMPLETION_BASELINE = 55;
export const COMPLETION_KEY = 'nuvio:completions:production';

// Initialize only if absent; retries cannot reset history or increment twice.
export const RECORD_COMPLETION_SCRIPT = `
redis.call('SET', KEYS[1], ARGV[1], 'NX')
local current = redis.call('GET', KEYS[1])
if redis.call('EXISTS', KEYS[2]) == 1 then return {'duplicate', current} end
local daily = tonumber(redis.call('GET', KEYS[3]) or '0')
if daily >= 10 then return {'limited', current} end
if tonumber(current) >= 9007199254740991 then return {'overflow', current} end
local count = redis.call('INCR', KEYS[1])
redis.call('SET', KEYS[2], '1', 'EX', 86400)
redis.call('INCR', KEYS[3])
if daily == 0 then redis.call('EXPIRE', KEYS[3], 172800) end
return {'recorded', tostring(count)}
`;

export function completionCount(value) {
  if (value === null) return COMPLETION_BASELINE;
  if (!['string', 'number'].includes(typeof value) || String(value).trim() === '') throw new WorkerError('Contador inválido.', 502);
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) throw new WorkerError('Contador inválido.', 502);
  return count;
}

export async function completionCommand({ clientId, ip, now }) {
  const [client, network] = await Promise.all([identityHash(`${ip}:${clientId}`), identityHash(ip)]);
  return ['EVAL', RECORD_COMPLETION_SCRIPT, 3, COMPLETION_KEY, `completion:client:${client}`,
    `completion:daily:${network}:${Math.floor(now / 86400000)}`, String(COMPLETION_BASELINE)];
}
