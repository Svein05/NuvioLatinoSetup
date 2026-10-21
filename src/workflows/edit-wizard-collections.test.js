import { expect, it } from 'vitest';
import { editWizardCollections } from './edit-wizard-collections.js';

it('preserves unrelated metadata and renames both catalog representations', () => {
  const collections = [{ id: 'section', folders: [{ id: 'folder', sources: [{ catalogId: 'a', title: 'Old' }], catalogSources: [{ catalogId: 'a', title: 'Old' }] }] }];
  const metadataTemplate = { config: { apiKeys: { tmdb: 'synthetic' }, catalogs: [{ id: 'a', name: 'Old', options: 7 }] } };
  const snapshot = structuredClone({ collections, metadataTemplate });
  const result = editWizardCollections({ collections, metadataTemplate }, {
    operation: 'catalog-rename', sectionId: 'section', folderId: 'folder', index: 0, title: ' New title ',
  });
  expect(result.metadataTemplate.config).toEqual({ apiKeys: { tmdb: 'synthetic' }, catalogs: [{ id: 'a', name: 'New title', options: 7 }] });
  expect(result.collections[0].folders[0].catalogSources[0].title).toBe('New title');
  expect({ collections, metadataTemplate }).toEqual(snapshot);
});

