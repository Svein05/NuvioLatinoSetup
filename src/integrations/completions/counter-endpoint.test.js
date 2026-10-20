import { expect, it, vi } from 'vitest';
import { requestCounterValue } from './counter-endpoint.js';

it('keeps the public counter wire contract, including zero', async () => {
  const fetchImpl = vi.fn().mockResolvedValue(Response.json({ value: 0 }));
  expect(await requestCounterValue('https://counter.invalid/get', { fetchImpl })).toBe(0);
  expect(fetchImpl).toHaveBeenCalledWith('https://counter.invalid/get', expect.objectContaining({ credentials: 'omit' }));
});

it.each([null, -1, 1.5, '151', {}])('rejects an invalid count: %j', async value => {
  const fetchImpl = vi.fn().mockResolvedValue(Response.json({ value }));
  await expect(requestCounterValue('https://counter.invalid/get', { fetchImpl }))
    .rejects.toMatchObject({ code: 'INVALID_COUNTER_VALUE' });
});

it.each([400, 401, 403, 404, 405, 422, 429])('reports explicit HTTP %i rejection without retries', async status => {
  const fetchImpl = vi.fn().mockResolvedValue(Response.json({}, { status }));
  await expect(requestCounterValue('https://counter.invalid/hit', { fetchImpl, increment: true }))
    .rejects.toMatchObject({ status, outcome: 'failed' });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it.each(['network', 'server', 'invalid-json', 'invalid-count'])('marks a hit as uncertain after %s failure', async mode => {
  const fetchImpl = vi.fn(async () => {
    if (mode === 'network') throw new Error('synthetic network failure');
    if (mode === 'server') return Response.json({}, { status: 503 });
    if (mode === 'invalid-json') return new Response('invalid');
    return Response.json({ value: -1 });
  });
  await expect(requestCounterValue('https://counter.invalid/hit', { fetchImpl, increment: true }))
    .rejects.toMatchObject({ outcome: 'unknown' });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it.each(['http://counter.invalid/hit', 'https://user:password@counter.invalid/hit'])('rejects unsafe endpoints before sending: %s', async url => {
  const fetchImpl = vi.fn();
  await expect(requestCounterValue(url, { fetchImpl, increment: true })).rejects.toBeDefined();
  expect(fetchImpl).not.toHaveBeenCalled();
});

it('cancels a read through its supplied signal', async () => {
  const controller = new AbortController();
  const fetchImpl = vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }));
  const pending = requestCounterValue('https://counter.invalid/get', { fetchImpl, signal: controller.signal });
  controller.abort();
  await expect(pending).rejects.toMatchObject({ outcome: 'failed' });
});
