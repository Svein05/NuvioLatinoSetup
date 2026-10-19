import { editCollections } from '../features/collections/index.js';
import { renamedMetadataCatalog } from '../features/metadata/index.js';

export function editWizardCollections({ collections, metadataTemplate }, edit) {
  const result = editCollections(collections, edit);
  return {
    ...result,
    metadataTemplate: result.result === true && edit.operation === 'catalog-rename'
      ? renamedMetadataCatalog(metadataTemplate, result.catalogId, result.title) : metadataTemplate,
  };
}
