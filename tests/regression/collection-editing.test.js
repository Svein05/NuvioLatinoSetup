import { expect, it, vi } from 'vitest';
import { editWizardCollections } from '../../src/workflows/edit-wizard-collections.js';
import { WizardCollectionsState } from '../../src/app/wizard-state-collections.js';

function fixture() {
  const sources = ['a', 'b', 'c'].map(catalogId => ({ catalogId, title: catalogId }));
  return [{ id: 's', enabled: true, folders: [
    { id: 'f', enabled: true, sources, catalogSources: structuredClone(sources) },
    { id: 'g', enabled: true, sources: [] },
  ] }, { id: 't', enabled: false, folders: [] }];
}

const cases = [
  ['toggleFolder', ['s', 'f'], { operation: 'folder-toggle' }],
  ['toggleSection', ['s'], { operation: 'section-toggle' }],
  ['toggleSection', ['s', true], { operation: 'section-toggle', enabled: true }],
  ['updateSection', ['s', { title: 'New' }], { operation: 'section-update', properties: { title: 'New' } }],
  ['updateFolder', ['s', 'f', { title: 'New' }], { operation: 'folder-update', properties: { title: 'New' } }],
  ['reorderFolder', ['s', 0, 1], { operation: 'folder-move', index: 0, to: 1 }],
  ['moveFolder', ['s', 0, 1], { operation: 'folder-move', index: 0, direction: 1 }],
  ['reorderSection', [0, 1], { operation: 'section-move', index: 0, to: 1 }],
  ['moveSection', [0, 1], { operation: 'section-move', index: 0, direction: 1 }],
  ['moveSectionExtreme', [0, 'bottom'], { operation: 'section-move', index: 0, destination: 'bottom' }],
  ['deleteFolder', ['s', 'f'], { operation: 'folder-delete' }],
  ['reorderCatalogInFolder', ['s', 'f', 0, 2], { operation: 'catalog-move', index: 0, to: 2 }],
  ['moveCatalogInFolder', ['s', 'f', 0, 1], { operation: 'catalog-move', index: 0, direction: 1 }],
  ['moveCatalogExtreme', ['s', 'f', 0, 'bottom'], { operation: 'catalog-move', index: 0, destination: 'bottom' }],
  ['renameCatalogInFolder', ['s', 'f', 0, ' New '], { operation: 'catalog-rename', index: 0, title: ' New ' }],
  ['removeCatalogFromFolder', ['s', 'f', 0], { operation: 'catalog-remove', index: 0 }],
  ['addCatalogToFolder', ['s', 'f', { id: 'new' }], { operation: 'catalog-add', metadata: { id: 'new' } }],
];

it.each(cases)('preserves the observable collection operation %s', (method, args, edit) => {
  const collections = fixture();
  const metadataTemplate = { config: { catalogs: [{ id: 'a', name: 'a' }] } };
  const expected = editWizardCollections({ collections, metadataTemplate }, { sectionId: 's', folderId: 'f', ...edit });
  const state = Object.create(WizardCollectionsState.prototype);
  Object.assign(state, { collections: structuredClone(collections), rawMetadataTemplate: structuredClone(metadataTemplate), notify: vi.fn() });
  state[method](...args);
  expect(state.collections).toEqual(expected.collections);
  expect(state.rawMetadataTemplate).toEqual(expected.metadataTemplate);
});
