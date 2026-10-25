import { expect, it, vi } from 'vitest';
import { createRepositoryStars } from './load-repository-stars.js';

function setup(snapshot, readCount = vi.fn(async () => 7)) {
  const store = { read: () => snapshot, write: vi.fn() };
  return { stars: createRepositoryStars({ readCount, store, now: () => 4_000_000 }), store, readCount };
}

it('uses a fresh one-hour cache without requesting GitHub', async () => {
  const { stars, readCount } = setup({ stars: 5, timestamp: 3_999_000 });
  expect(await stars.refresh()).toEqual({ count: 5, source: 'cache' });
  expect(readCount).not.toHaveBeenCalled();
});

it('refreshes an expired cache and retains the old storage schema', async () => {
  const { stars, store } = setup({ stars: 5, timestamp: 0 });
  expect(stars.initial()).toEqual({ count: 5, source: 'cache' });
  expect(await stars.refresh()).toEqual({ count: 7, source: 'network' });
  expect(store.write).toHaveBeenCalledWith({ stars: 7, timestamp: 4_000_000 });
});

it.each([null, { stars: 5, timestamp: 0 }])('preserves a visible fallback with an explicit warning on outage: %j', async snapshot => {
  const { stars } = setup(snapshot, async () => { throw new Error('unavailable'); });
  expect(await stars.refresh()).toMatchObject({ count: snapshot?.stars ?? 3, warning: expect.any(String) });
});

it('does not treat a future timestamp as a fresh cache', async () => {
  const { stars, readCount } = setup({ stars: 5, timestamp: 9_000_000 });
  expect((await stars.refresh()).source).toBe('network');
  expect(readCount).toHaveBeenCalledTimes(1);
});

it('does not save or expose a late response after cancellation', async () => {
  const controller = new AbortController();
  const { stars, store } = setup(null, async () => { controller.abort(); return 7; });
  await expect(stars.refresh({ signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  expect(store.write).not.toHaveBeenCalled();
});
