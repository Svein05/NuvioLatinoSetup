import { expect, it } from 'vitest';
import { editCollections, initializeCollections } from '../index.js';

function collectionFixture() {
  const sources = ['a', 'b', 'c'].map(id => ({ catalogId: id, title: id, custom: { keep: true } }));
  return [{
    id: 'section', title: 'Original', enabled: true, pinToTop: false, unknown: { keep: true },
    folders: [{ id: 'folder', enabled: true, sources, catalogSources: structuredClone(sources) }, { id: 'other', enabled: false }],
  }, { id: 'second', folders: [] }];
}

it.each([{ to: 2 }, { direction: 1 }, { destination: 'bottom' }])('moves both catalog representations together: %j', movement => {
  const original = collectionFixture();
  const snapshot = structuredClone(original);
  const result = editCollections(original, {
    operation: 'catalog-move', sectionId: 'section', folderId: 'folder', index: 0, ...movement,
  });
  const folder = result.collections[0].folders[0];
  expect(result.result).toBe(true);
  expect(folder.sources.map(source => source.catalogId)).toEqual(folder.catalogSources.map(source => source.catalogId));
  expect(original).toEqual(snapshot);
  expect(result.collections[1]).toBe(original[1]);
  expect(result.collections[0].unknown).toEqual({ keep: true });
});

it.each([-1, 3, 0.5])('rejects invalid source index %s without losing records', index => {
  const original = collectionFixture();
  const result = editCollections(original, { operation: 'catalog-move', sectionId: 'section', folderId: 'folder', index, to: 0 });
  expect(result).toMatchObject({ collections: original, result: false });
  expect(result.collections).toBe(original);
});

it('does not reorder inconsistent paired lists', () => {
  const original = collectionFixture();
  original[0].folders[0].catalogSources.pop();
  expect(editCollections(original, {
    operation: 'catalog-move', sectionId: 'section', folderId: 'folder', index: 0, to: 1,
  }).collections).toBe(original);
});

it('rejects duplicate or unidentified catalogs and preserves addon source fields', () => {
  const collections = collectionFixture();
  const base = { operation: 'catalog-add', sectionId: 'section', folderId: 'folder' };
  expect(editCollections(collections, { ...base, metadata: { id: 'a' } }).result.success).toBe(false);
  expect(editCollections(collections, { ...base, metadata: {} }).result.success).toBe(false);
  const result = editCollections(collections, { ...base, metadata: { id: 'new', type: 'series', name: 'New' } });
  expect(result.result).toEqual({ success: true });
  expect(result.collections[0].folders[0].sources[3]).toMatchObject({ catalogId: 'new', addonId: 'aio-metadata', type: 'series', provider: 'addon', filters: null });
  expect(collections[0].folders[0].sources).toHaveLength(3);
});

it('initializes and resets enabled flags without mutating the template or pin preference', () => {
  const template = collectionFixture();
  expect(initializeCollections(template)[0].folders[1].enabled).toBe(false);
  const reset = initializeCollections(template, { reset: true });
  expect(reset[0]).toMatchObject({ enabled: true, pinToTop: false });
  expect(reset[0].folders.every(folder => folder.enabled)).toBe(true);
  expect(template[0].folders[1].enabled).toBe(false);
});

it('toggles every section and folder through one immutable edit', () => {
  const original = collectionFixture();
  const result = editCollections(original, { operation: 'all-toggle', enabled: false });
  expect(result.collections.every(section => section.enabled === false)).toBe(true);
  expect(result.collections.flatMap(section => section.folders).every(folder => folder.enabled === false)).toBe(true);
  expect(original[0].enabled).toBe(true);
});
