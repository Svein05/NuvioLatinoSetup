import { expect, it, vi } from 'vitest';
import { createAvatarRankingClient } from './avatar-ranking.js';

const key = 'Style/Series/Hero.webp';
it('uses only Worker routes and sends no Redis configuration', async () => {
  const fetchImpl = vi.fn().mockResolvedValueOnce(Response.json({ items: [{ key, score: 4 }] }))
    .mockResolvedValueOnce(Response.json({ status: 'recorded', score: 5 }));
  const client = createAvatarRankingClient('https://worker.invalid', { fetchImpl });
  expect(await client.top(8)).toEqual([{ key, score: 4 }]);
  expect(await client.record(key, { accessToken: 'synthetic-user-token' })).toEqual({ status: 'recorded', score: 5 });
  expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual(['https://worker.invalid/api/avatars/ranking?limit=8', 'https://worker.invalid/api/avatars/usage']);
  const init = fetchImpl.mock.calls[1][1];
  expect(init.headers.Authorization).toBe('Bearer synthetic-user-token');
  expect(JSON.parse(init.body)).toEqual({ key });
  expect(init.redirect).toBe('error');
});

it.each([401, 404, 429, 503])('never retries or confirms HTTP %i', async status => {
  const fetchImpl = vi.fn().mockResolvedValue(Response.json({}, { status }));
  const client = createAvatarRankingClient('https://worker.invalid', { fetchImpl });
  await expect(client.record(key, { accessToken: 'synthetic-token' })).rejects.toMatchObject({ status, outcome: status === 503 ? 'unknown' : 'failed' });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it.each([{}, { status: 'recorded', score: -1 }, { status: 'unknown', score: 4 }])('does not confirm an invalid response: %j', async body => {
  const client = createAvatarRankingClient('https://worker.invalid', { fetchImpl: async () => Response.json(body) });
  await expect(client.record(key, { accessToken: 'synthetic-token' })).rejects.toMatchObject({ outcome: 'unknown' });
});

it('does not send a missing session or an already cancelled request', async () => {
  const fetchImpl = vi.fn();
  const client = createAvatarRankingClient('https://worker.invalid', { fetchImpl });
  await expect(client.record(key)).rejects.toMatchObject({ status: 401 });
  await expect(client.top(8, { signal: AbortSignal.abort() })).rejects.toBeDefined();
  expect(fetchImpl).not.toHaveBeenCalled();
});

it.each([{}, { items: [{ key, score: '4' }] }, { items: [{ key: null, score: 4 }] }])('rejects an invalid public ranking: %j', async body => {
  const client = createAvatarRankingClient('https://worker.invalid', { fetchImpl: async () => Response.json(body) });
  await expect(client.top(8)).rejects.toThrow('Ranking inválido');
});
