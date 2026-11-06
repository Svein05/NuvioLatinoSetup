import { expect, it } from 'vitest';
import { normalizeStremioSnapshot } from './normalize.js';
import { addonUrl, episodeIdentity, mergeMissing } from './identity.js';

it('preserves configured addon URLs, rejects credentials and deduplicates imports', () => {
  expect(addonUrl('stremio://example.invalid/private/manifest.json?key=x#fragment'))
    .toBe('https://example.invalid/private/manifest.json?key=x');
  expect(addonUrl('https://user:secret@example.invalid/manifest.json')).toBeNull();
  expect(episodeIdentity('tt123', 'tt123:0:1')).toEqual({ season: 0, episode: 1 });
  expect(episodeIdentity('tt123', 'tt456:1:2')).toBeNull();
  expect(mergeMissing([{ content_id: 'tt1' }], [{ content_id: 'tt1' }, { content_id: 'tt2' }, { content_id: 'tt2' }]))
    .toEqual([{ content_id: 'tt2' }]);
});

it('imports compatible records and verified episodes without inventing history', async () => {
  const date = '2025-01-01T00:00:00Z';
  const result = await normalizeStremioSnapshot({ addons: [
    { transportUrl: 'https://example.invalid/manifest.json', manifest: { name: 'Source', logo: '/logo.png' } },
  ], library: [
    { _id: 'tt123', type: 'series', name: 'Series', _mtime: date,
      state: { video_id: 'tt123:1:2', timeOffset: 1000, duration: 3000, lastWatched: date, watched: 'verified' } },
    { _id: 'unsupported', type: 'movie', _mtime: date },
  ] }, { isMetadataAddon: () => false, readWatched: async () => ['tt123:0:1', 'tt123:1:1'] });
  expect(result.library).toHaveLength(1);
  expect(result.progress[0]).toMatchObject({ season: 1, episode: 2, position: 1000, duration: 3000 });
  expect(result.watched.map(item => [item.season, item.episode])).toEqual([[0, 1], [1, 1]]);
  expect(result.addons[0].logo).toBe('https://example.invalid/logo.png');
  expect(result.omitted).toHaveLength(1);
});

it('honors cancellation before processing private library data', async () => {
  await expect(normalizeStremioSnapshot({ addons: [], library: [{}] }, {
    signal: AbortSignal.abort(), isMetadataAddon: () => false,
  })).rejects.toBeDefined();
});
