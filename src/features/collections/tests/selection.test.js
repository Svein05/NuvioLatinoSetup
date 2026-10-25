import { expect, it } from 'vitest';
import { collectActiveCatalogIds, selectedCollections, flattenedCollections } from '../index.js';

it('includes both supported source lists and omits disabled sections and folders', () => {
  const collections = [{ folders: [{ catalogSources: [{ catalogId: 'tmdb.trending.movie' }], sources: [{ catalogId: 'tmdb.top.tv' }] },
    { enabled: false, sources: [{ catalogId: 'disabled' }] }] }, { enabled: false, folders: [{ sources: [{ catalogId: 'hidden' }] }] }];
  expect([...collectActiveCatalogIds(collections)]).toEqual(['tmdb.trending.movie', 'tmdb.trending', 'tmdb.top.tv', 'tmdb.top']);
});

it('exports detached active collections and preserves profile identifiers and folder order', () => {
  const collections = [{ pinToTop: false, folders: [{ id: 'first', title: 'First', sources: [{ catalogId: 'catalog' }] },
    { id: 'second', title: 'Second' }, { enabled: false }] }];
  const selected = selectedCollections(collections);
  selected[0].folders[0].title = 'Changed export';
  expect(collections[0].folders[0].title).toBe('First');
  expect(selected[0].pinToTop).toBe(false);
  expect(flattenedCollections(collections, { profileId: 2, addonId: 'addon' })).toMatchObject([
    { profile_id: 2, addon_id: 'addon', catalog_id: 'catalog', sort_order: 1 },
    { profile_id: 2, addon_id: 'addon', catalog_id: 'second', sort_order: 2 },
  ]);
});
