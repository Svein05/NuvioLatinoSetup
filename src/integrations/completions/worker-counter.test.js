import { expect, it, vi } from 'vitest';
import { createWorkerCounter } from './worker-counter.js';

it('reads zero and records via POST without exposing Redis credentials', async () => {
  const fetchImpl = vi.fn().mockResolvedValueOnce(Response.json({ value: 0 }))
    .mockResolvedValueOnce(Response.json({ value: 56, status: 'recorded' }));
  const client = createWorkerCounter('https://worker.invalid', { fetchImpl, clientId: () => 'synthetic-id' });
  expect(await client.read()).toBe(0);
  expect(await client.increment(undefined, 'execution-id')).toEqual({ value: 56, status: 'recorded' });
  expect(fetchImpl.mock.calls[0][0]).toBe('https://worker.invalid/api/completions');
  const init = fetchImpl.mock.calls[1][1];
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body)).toEqual({ clientId: 'synthetic-id', completionId: 'execution-id' });
  expect(init.credentials).toBe('omit');
  expect(init.headers).not.toHaveProperty('Authorization');
});

it.each([null, -1, '55', 2.5])('rejects invalid read values: %s', value => {
  const client = createWorkerCounter('https://worker.invalid', { fetchImpl: async () => Response.json({ value }) });
  return expect(client.read()).rejects.toThrow();
});

it.each([403, 429, 502, 'disconnect'])('classifies %s without retrying the write', async status => {
  const fetchImpl = vi.fn(async () => {
    if (status === 'disconnect') throw new Error('synthetic disconnect');
    return Response.json({}, { status });
  });
  const client = createWorkerCounter('https://worker.invalid', { fetchImpl, clientId: () => 'synthetic-id' });
  await expect(client.increment()).rejects.toMatchObject({ outcome: [403, 429].includes(status) ? 'failed' : 'unknown' });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});
