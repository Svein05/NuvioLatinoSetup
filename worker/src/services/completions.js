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
if ARGV[2] == 'event' then redis.call('SET', KEYS[2], '1')
else redis.call('SET', KEYS[2], '1', 'EX', 86400) end
redis.call('INCR', KEYS[3])
if daily == 0 then redis.call('EXPIRE', KEYS[3], 172800) end
return {'recorded', tostring(count)}
`;

export function completionCount(value, environment = 'production') {
  if (value === null) return environment === 'production' ? COMPLETION_BASELINE : 0;
  if (!['string', 'number'].includes(typeof value) || String(value).trim() === '') throw new WorkerError('Contador inválido.', 502);
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) throw new WorkerError('Contador inválido.', 502);
  return count;
}

export const completionKey = environment => `nuvio:completions:${environment}`;

export async function completionCommand({ clientId, completionId, ip, now, environment = 'production' }) {
  const [client, network] = await Promise.all([identityHash(completionId || `${ip}:${clientId}`), identityHash(ip)]);
  const prefix = environment === 'testing' ? 'completion:testing' : 'completion';
  return ['EVAL', RECORD_COMPLETION_SCRIPT, 3, completionKey(environment),
    `${prefix}:${completionId ? 'event' : 'client'}:${client}`,
    `${prefix}:daily:${network}:${Math.floor(now / 86400000)}`,
    String(environment === 'production' ? COMPLETION_BASELINE : 0), completionId ? 'event' : 'legacy'];
}
