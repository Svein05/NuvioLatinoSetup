import { expect, it, vi } from 'vitest';
import { publicMetadataRoute } from '../src/routes/public-metadata.js';

function setup(previous = null) {
  let snapshot = previous;
  const kv = { get: vi.fn(async () => snapshot), put: vi.fn(async (_key, value) => { snapshot = JSON.parse(value); }) };
  const fetchImpl = vi.fn(async () => Response.json({ stargazers_count: 7 }));
  const request = new Request('https://worker.invalid/api/repository/stars');
  const options = { kind: 'stars', fetchImpl, now: () => 24_000_000 };
  return { kv, fetchImpl, read: context => publicMetadataRoute(request, { POSTER_FEED_KV: kv }, { ...options, context }) };
}

it('coalesces cold public reads and reuses the confirmed snapshot', async () => {
  const { kv, fetchImpl, read } = setup();
  const responses = await Promise.all([read(), read()]);
  expect(await responses[0].json()).toMatchObject({ count: 7, stale: false });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(fetchImpl.mock.calls[0][1].redirect).toBe('manual');
  await read();
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(kv.put).toHaveBeenCalledTimes(1);
});

it('serves stale data while a refresh fails without dropping the snapshot', async () => {
  const { fetchImpl, read } = setup({ count: 5, updatedAt: 0 });
  fetchImpl.mockRejectedValue(new Error('offline'));
  const tasks = [];
  const response = await read({ waitUntil: task => tasks.push(task) });
  expect(await response.json()).toMatchObject({ count: 5, stale: true });
  await Promise.all(tasks);
  expect(await (await read()).json()).toMatchObject({ count: 5, stale: true });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it('reports a cold upstream failure without inventing a count', async () => {
  const { fetchImpl, read } = setup();
  fetchImpl.mockRejectedValue(new Error('offline'));
  await expect(read()).rejects.toMatchObject({ status: 503 });
});
