import { expect, it } from 'vitest';
import { prepareMetadataPayload } from './prepare-metadata-payload.js';

function input() {
  return { rawTemplate: { config: {
    catalogs: [{ id: 'tmdb.trending', type: 'movie' }, { id: 'disabled' }, { id: 'tmdb.trending', type: 'movie' }],
    apiKeys: { unrelated: 'preserved' }, search: { engineEnabled: { unrelated: true } },
    unrelated: { enabled: true },
  } }, collections: [{ folders: [{ catalogSources: [{ catalogId: 'tmdb.trending.movie' }] }] }],
  preferences: { posterEngine: 'default' }, apiKeys: { tmdb: ' synthetic ', mdblist: ' second ' },
  searchAiEnabled: true, password: 'synthetic-only' };
}

it('preserves unrelated settings, deduplicates selected catalogs and leaves templates untouched', () => {
  const data = input();
  const before = structuredClone(data);
  const result = prepareMetadataPayload(data);
  expect(result.config.catalogs).toEqual([{ id: 'tmdb.trending', type: 'movie', showInHome: false, enableRatingPosters: false }]);
  expect(result.config.apiKeys).toMatchObject({ unrelated: 'preserved', tmdb: 'synthetic', mdblist: 'second' });
  expect(result.config.search.engineEnabled).toEqual({ unrelated: true, 'gemini.search': true });
  expect(result.config.unrelated).toEqual({ enabled: true });
  expect(data).toEqual(before);
  result.config.unrelated.enabled = false;
  expect(data.rawTemplate.config.unrelated.enabled).toBe(true);
});

it.each(['default', 'betterposter', 'postersplus'])('applies the %s poster engine without changing catalog selection', engine => {
  const data = input();
  data.preferences.posterEngine = engine;
  const result = prepareMetadataPayload(data);
  expect(result.config.catalogs).toHaveLength(1);
  expect(result.config.catalogs[0].enableRatingPosters).toBe(engine !== 'default');
  expect(result.config.posterRatingProvider).toBe(engine === 'default' ? 'none' : 'custom');
});

it('excludes disabled collections and preserves custom poster patterns verbatim', () => {
  const data = input();
  data.collections[0].enabled = false;
  data.preferences = { posterEngine: 'betterposter', customPosterUrl: 'https://example.invalid/CaseSensitive/{imdb_id}' };
  const result = prepareMetadataPayload(data);
  expect(result.config.catalogs).toEqual([]);
  expect(result.config.customPosterUrlPattern).toBe(data.preferences.customPosterUrl);
});
