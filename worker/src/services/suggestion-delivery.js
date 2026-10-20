import { identityHash } from '../shared/identity-hash.js';

const RESERVE = `
local prior = redis.call('GET', KEYS[1])
if prior and prior ~= 'failed' then return prior end
if redis.call('EXISTS', KEYS[2]) == 1 then return 'limited' end
redis.call('SET', KEYS[1], 'pending', 'EX', 86400)
redis.call('SET', KEYS[2], ARGV[1], 'EX', 120)
return 'reserved'
`;
const FINISH = `
redis.call('SET', KEYS[1], ARGV[1], 'EX', 86400)
if ARGV[1] == 'failed' and redis.call('GET', KEYS[2]) == ARGV[2] then redis.call('DEL', KEYS[2]) end
return 'OK'
`;

export async function createSuggestionDelivery(redis, userId, requestId) {
  const user = await identityHash(userId);
  const request = await identityHash(requestId);
  const keys = [`avatar_suggestion:${user}:${request}`, `avatar_suggestion_cooldown:${user}`];
  return {
    reserve: () => redis(['EVAL', RESERVE, 2, ...keys, requestId], { write: true }),
    finish: status => redis(['EVAL', FINISH, 2, ...keys, status, requestId], { write: true }),
  };
}
