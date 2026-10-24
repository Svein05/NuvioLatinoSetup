import { expect, it, vi } from 'vitest';
import { createAvatarSummaryLoader } from './avatar-ranking-summary.js';

const item = { key: 'IconsStyle/Show/Avatar.webp', score: 4 };
function fixture(read, saved = null) {
  const store = { save: vi.fn(), read: () => [item], saveSummary: vi.fn(value => { saved = value; }), readSummary: () => saved };
  return { store, load: createAvatarSummaryLoader({ read, store }) };
}

it('shares the carousel read and preserves a total larger than the returned top scores', async () => {
  const read = vi.fn(async () => ({ items: [item], totalUsage: 100 }));
  const { load, store } = fixture(read);
  const [first, second] = await Promise.all([load(), load()]);
  expect(read).toHaveBeenCalledTimes(1);
  expect(first).toBe(second);
  expect(first).toMatchObject({ totalUsage: 100, source: 'network' });
  expect(store.saveSummary).toHaveBeenCalledWith({ totalUsage: 100 });
});

it('distinguishes confirmed zero, missing totals on older Workers and unavailable data', async () => {
  expect(await fixture(async () => ({ items: [], totalUsage: 0 })).load()).toMatchObject({ totalUsage: 0, source: 'network' });
  expect(await fixture(async () => ({ items: [item], totalUsage: null })).load()).toMatchObject({ totalUsage: null, source: 'unavailable' });
  expect(await fixture(async () => { throw new Error('offline'); }).load()).toMatchObject({ totalUsage: null, source: 'unavailable' });
});

it('keeps the last confirmed total as cached data on outages or older Workers', async () => {
  const saved = { totalUsage: 98 };
  expect(await fixture(async () => { throw new Error('offline'); }, saved).load()).toMatchObject({ totalUsage: 98, source: 'cache' });
  expect(await fixture(async () => ({ items: [item], totalUsage: null }), saved).load()).toMatchObject({ totalUsage: 98, source: 'cache' });
});

it('starts a new read after the previous document signal was aborted', async () => {
  const read = vi.fn().mockImplementationOnce(() => new Promise(() => {}))
    .mockResolvedValueOnce({ items: [item], totalUsage: 5 });
  const { load } = fixture(read);
  const request = new AbortController();
  void load(32, { signal: request.signal });
  request.abort();
  expect(await load()).toMatchObject({ totalUsage: 5 });
});
