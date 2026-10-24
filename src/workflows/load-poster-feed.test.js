import { expect, it, vi } from 'vitest';
import { createPosterFeedLoader } from './load-poster-feed.js';

const now = Date.now();
const feed = { schemaVersion: 1, generatedAt: new Date(now).toISOString(), items: Array.from({ length: 12 }, (_, id) => ({
  id: id + 1, mediaType: 'movie', title: 'Movie', posterPath: '/poster_' + id + '.jpg',
})) };
const memory = () => { let value; return { getItem: () => value, setItem: (_key, item) => { value = item; } }; };

it('deduplicates concurrent reads and shares a fresh cache between page instances', async () => {
  const storage = memory();
  const read = vi.fn().mockResolvedValue(feed);
  const load = createPosterFeedLoader({ read, storage });
  expect(await Promise.all([load(), load()])).toEqual([feed, feed]);
  await createPosterFeedLoader({ read, storage })();
  expect(read).toHaveBeenCalledTimes(1);
});

it('retains a recent last-good snapshot, but rejects expired, malformed or future snapshots', async () => {
  const storage = memory();
  await createPosterFeedLoader({ read: async () => feed, storage, now: () => now })();
  const failed = vi.fn().mockRejectedValue(new Error('offline'));
  expect(await createPosterFeedLoader({ read: failed, storage, now: () => now + 9 * 86400000 })()).toEqual(feed);
  expect(await createPosterFeedLoader({ read: failed, storage, now: () => now + 31 * 86400000 })()).toBeNull();
  expect(await createPosterFeedLoader({ read: async () => ({ ...feed, items: [null] }), storage: memory() })()).toBeNull();
});

it('blocked storage and unavailable endpoints never block application startup', async () => {
  const storage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  expect(await createPosterFeedLoader({ read: async () => feed, storage })()).toEqual(feed);
  expect(await createPosterFeedLoader({ read: async () => { throw new Error('offline'); }, storage })()).toBeNull();
});
