import { expect, it } from 'vitest';
import { buildProfileOverview } from '../index.js';

function overview(sources = {}) {
  return buildProfileOverview({ profileId: 1, plugins: [], progressItems: [], libraryItems: [],
    watchedItems: [], loadErrors: {}, addonsCount: 2, ...sources });
}

it('excludes other profiles, unstarted items, completed durations and watched episodes', () => {
  const active = { profile_id: 1, content_id: 'show', season: 1, episode: 2, position: 10, duration: 100 };
  const input = Object.freeze([active, { ...active, profile_id: 2 }, { ...active, position: 0 },
    { ...active, content_id: 'complete', position: 90 }, { ...active, episode: 1 }]);
  const result = overview({ progressItems: input, watchedItems: [{ ...active, episode: 1 }] });
  expect(result.currentlyWatching).toEqual([active]);
  expect(result.progressCount).toBe(1);
  expect(input).toHaveLength(5);
});

it('counts distinct watched episodes while showing only one active episode per show', () => {
  const item = { content_id: 'show', season: 1, episode: 1, position: 1 };
  const result = overview({ progressItems: [item, { ...item, episode: 2 }],
    watchedItems: [{ ...item, content_id: 'other' }, { ...item, content_id: 'other' }] });
  expect(result.watchedCount).toBe(1);
  expect(result.progressCount).toBe(2);
  expect(result.currentlyWatching).toEqual([item]);
});

it('preserves provider totals and legacy metric fallback without inventing visible cards', () => {
  const result = overview({ plugins: Object.assign([], { totalCount: 20 }),
    libraryItems: Object.assign([], { totalCount: 30 }),
    progressItems: Object.assign([{ position: 0 }], { totalCount: 40 }), loadErrors: { progressItems: { status: 503 } } });
  expect(result).toMatchObject({ pluginsCount: 20, libraryCount: 30, progressCount: 40,
    currentlyWatching: [], loadErrors: { progressItems: { status: 503 } } });
});

it('limits both rows to six without reducing the full metrics', () => {
  const items = Array.from({ length: 8 }, (_, index) => ({ content_id: `movie-${index}`, position: 1 }));
  const result = overview({ progressItems: items, watchedItems: items.map(item => ({ ...item, content_id: `watched-${item.content_id}` })) });
  expect(result.progressCount).toBe(8);
  expect(result.watchedCount).toBe(8);
  expect(result.currentlyWatching).toHaveLength(6);
  expect(result.recentlyWatched).toHaveLength(6);
});
