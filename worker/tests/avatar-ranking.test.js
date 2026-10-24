import { expect, it, vi } from 'vitest';
import { createWorker } from '../src/index.js';
import { avatarVoteCommand, rankedAvatars } from '../src/services/avatar-ranking.js';

const key = 'NetflixStyle/One Piece/Hero.webp';
const env = { AVATAR_REDIS_URL: 'https://synthetic.upstash.io', AVATAR_REDIS_TOKEN: 'synthetic-redis-secret', NUVIO_PUBLIC_ANON_KEY: 'synthetic-public-key' };
const vote = (body = { key }, token = 'synthetic-user-token') => new Request('https://worker.invalid/api/avatars/usage', {
  method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body),
});

function backend({ authStatus = 200, user = { id: 'synthetic-user', is_anonymous: false }, redisStatus = 200,
  result = ['recorded', '4'], disconnect = false } = {}) {
  return vi.fn(async (url) => {
    if (url === 'https://api.nuvio.tv/auth/v1/user') return Response.json(user, { status: authStatus });
    if (url === 'https://synthetic.upstash.io/') {
      if (disconnect) throw new Error('synthetic disconnected Redis');
      return Response.json({ result }, { status: redisStatus });
    }
    throw new Error('Unexpected external request');
  });
}

it('reads ranked pairs without requiring an account and never returns Redis secrets', async () => {
  const fetchImpl = backend({ result: [key, '4'] });
  const response = await createWorker({ fetchImpl }).fetch(new Request('https://worker.invalid/api/avatars/ranking?limit=8'), env);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ items: [{ key, score: 4 }], totalUsage: 4 });
  const [url, init] = fetchImpl.mock.calls[0];
  expect(url).toBe('https://synthetic.upstash.io/');
  expect(init.headers.Authorization).toBe('Bearer synthetic-redis-secret');
  expect(JSON.parse(init.body)).toEqual(['ZREVRANGE', 'avatar_ranks', 0, -1, 'WITHSCORES']);
  expect(init.redirect).toBe('manual');
});

it.each(['recorded', 'duplicate'])('authenticates the session and reports an atomic %s vote', async status => {
  const fetchImpl = backend({ result: [status, '4'] });
  const response = await createWorker({ fetchImpl }).fetch(vote(), env);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status, score: 4 });
  expect(fetchImpl).toHaveBeenCalledTimes(2);
  const [authUrl, auth] = fetchImpl.mock.calls[0];
  expect(authUrl).toBe('https://api.nuvio.tv/auth/v1/user');
  expect(auth.headers).toEqual({ Authorization: 'Bearer synthetic-user-token', apikey: 'synthetic-public-key' });
  const command = JSON.parse(fetchImpl.mock.calls[1][1].body);
  expect(command[0]).toBe('EVAL');
  expect(command[2]).toBe(3);
  expect(command[3]).toBe('avatar_ranks');
  expect(command.at(-1)).toBe(key);
  expect(command.join(' ')).not.toContain('synthetic-user');
  expect(command.join(' ')).not.toContain('synthetic-user-token');
});

it('uses stable hashed deduplication keys across retries and isolates accounts/avatars', async () => {
  const first = await avatarVoteCommand('user-a', key, 1000);
  expect(await avatarVoteCommand('user-a', key, 2000)).toEqual(first);
  expect((await avatarVoteCommand('user-b', key, 1000))[4]).not.toBe(first[4]);
  expect((await avatarVoteCommand('user-a', 'IconsStyle/Other.webp', 1000))[4]).not.toBe(first[4]);
  expect((await avatarVoteCommand('user-a', key, 86400000))[5]).not.toBe(first[5]);
});

it.each([401, 403, 503])('never reaches Redis when authentication returns HTTP %i', async authStatus => {
  const fetchImpl = backend({ authStatus });
  const response = await createWorker({ fetchImpl }).fetch(vote(), env);
  expect(response.status).toBe(authStatus === 503 ? 502 : 401);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it.each([{ id: 'synthetic-user', is_anonymous: true }, {}, { id: null }])('rejects an unauthenticated identity: %j', async user => {
  const fetchImpl = backend({ user });
  expect((await createWorker({ fetchImpl }).fetch(vote(), env)).status).toBe(401);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it('rejects a missing access token before network access', async () => {
  const fetchImpl = vi.fn();
  expect((await createWorker({ fetchImpl }).fetch(vote({ key }, ''), env)).status).toBe(401);
  expect(fetchImpl).not.toHaveBeenCalled();
});

it.each([{ key: '../escape.webp' }, { key: 'Style/Series/../Escape.webp' }, { key, userId: 'spoofed-id' }, { key: 'Style/Series/<img>.webp' }])('rejects invalid or identity-spoofing payloads: %j', async body => {
  const fetchImpl = vi.fn();
  expect((await createWorker({ fetchImpl }).fetch(vote(body), env)).status).toBe(400);
  expect(fetchImpl).not.toHaveBeenCalled();
});

it.each(['0', '33', 'NaN', '1.5'])('rejects a bad ranking limit %s before accessing Redis', async limit => {
  const fetchImpl = vi.fn();
  expect((await createWorker({ fetchImpl }).fetch(new Request(`https://worker.invalid/api/avatars/ranking?limit=${limit}`), env)).status).toBe(400);
  expect(fetchImpl).not.toHaveBeenCalled();
});

it('reports the server-enforced daily limit without confirming a vote', async () => {
  const response = await createWorker({ fetchImpl: backend({ result: ['limited', '4'] }) }).fetch(vote(), env);
  expect(response.status).toBe(429);
  expect(await response.json()).not.toHaveProperty('status', 'recorded');
});

it.each([{ disconnect: true }, { redisStatus: 503 }, { result: null }])('never retries or confirms an ambiguous Redis write: %j', async options => {
  const fetchImpl = backend(options);
  const response = await createWorker({ fetchImpl }).fetch(vote(), env);
  expect(response.status).toBe(502);
  expect(await response.json()).toMatchObject({ outcome: 'unknown' });
  expect(fetchImpl).toHaveBeenCalledTimes(2);
});

it('keeps optional ranking disabled when Redis has not been configured', async () => {
  const response = await createWorker({ fetchImpl: vi.fn() }).fetch(new Request('https://worker.invalid/api/avatars/ranking'), {});
  expect(response.status).toBe(503);
});

it('rejects oversized vote bodies and wrong methods before network access', async () => {
  const fetchImpl = vi.fn();
  const worker = createWorker({ fetchImpl });
  expect((await worker.fetch(vote({ key: 'x'.repeat(3000) }), env)).status).toBe(413);
  expect((await worker.fetch(new Request('https://worker.invalid/api/avatars/usage'), env)).status).toBe(405);
  expect(fetchImpl).not.toHaveBeenCalled();
});

it('drops invalid legacy members without accepting invalid score data', () => {
  expect(rankedAvatars(['../unsafe', '5', key, '4'])).toEqual([{ key, score: 4 }]);
  expect(() => rankedAvatars([key, '-1'])).toThrow();
  expect(() => rankedAvatars([key])).toThrow();
});

it('sums every stored avatar before limiting the public top, without mutating Redis', async () => {
  const entries = Array.from({ length: 45 }, (_, index) => ['IconsStyle/Avatar' + index + '.webp', String(index + 1)]).flat();
  const fetchImpl = backend({ result: entries });
  const response = await createWorker({ fetchImpl }).fetch(new Request('https://worker.invalid/api/avatars/ranking?limit=8'), env);
  const data = await response.json();
  expect(data.items).toHaveLength(8);
  expect(data.totalUsage).toBe(1035);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetchImpl.mock.calls[0][1].body)[0]).toBe('ZREVRANGE');
});

it('reports confirmed zero for an empty ranking and rejects unsafe aggregate totals', async () => {
  const request = new Request('https://worker.invalid/api/avatars/ranking');
  expect(await (await createWorker({ fetchImpl: backend({ result: [] }) }).fetch(request, env)).json()).toEqual({ items: [], totalUsage: 0 });
  const result = [key, String(Number.MAX_SAFE_INTEGER), 'IconsStyle/Other.webp', '1'];
  expect((await createWorker({ fetchImpl: backend({ result }) }).fetch(request, env)).status).toBe(502);
});

it.each([null, '', true])('does not turn an invalid score into a confirmed zero: %j', score => {
  expect(() => rankedAvatars([key, score])).toThrow();
});
