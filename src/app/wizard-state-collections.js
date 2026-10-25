import { editWizardCollections } from '../workflows/edit-wizard-collections.js';
import { prepareMetadataPayload } from '../workflows/prepare-metadata-payload.js';
import { selectedCollections, flattenedCollections, initializeCollections } from '../features/collections/index.js';

export class WizardCollectionsState {
  applyCollectionEdit(edit) {
    const result = editWizardCollections({
      collections: this.collections,
      metadataTemplate: this.rawMetadataTemplate,
    }, edit);
    if (result.collections !== this.collections) {
      this.collections = result.collections;
      this.rawMetadataTemplate = result.metadataTemplate;
      this.notify('COLLECTIONS_UPDATED');
    }
    return result.result;
  }

  resetCollections() {
    if (!this.originalCollectionsTemplate) return;
    this.collections = initializeCollections(this.originalCollectionsTemplate, { reset: true });
    this.notify('COLLECTIONS_UPDATED');
  }

  toggleFolder(sectionId, folderId) {
    return this.applyCollectionEdit({ operation: 'folder-toggle', sectionId, folderId });
  }

  toggleAllCollections(enabled) {
    return this.applyCollectionEdit({ operation: 'all-toggle', enabled });
  }

  toggleSection(sectionId, forceState = null) {
    return this.applyCollectionEdit({ operation: 'section-toggle', sectionId, enabled: forceState });
  }

  updateSection(sectionId, properties) {
    return this.applyCollectionEdit({ operation: 'section-update', sectionId, properties });
  }

  updateFolder(sectionId, folderId, properties) {
    return this.applyCollectionEdit({ operation: 'folder-update', sectionId, folderId, properties });
  }

  reorderFolder(sectionId, index, to) {
    return this.applyCollectionEdit({ operation: 'folder-move', sectionId, index, to });
  }

  moveFolder(sectionId, index, direction) {
    return this.applyCollectionEdit({ operation: 'folder-move', sectionId, index, direction });
  }

  reorderSection(index, to) {
    return this.applyCollectionEdit({ operation: 'section-move', index, to });
  }

  moveSection(index, direction) {
    return this.applyCollectionEdit({ operation: 'section-move', index, direction });
  }

  moveSectionExtreme(index, destination) {
    return this.applyCollectionEdit({ operation: 'section-move', index, destination });
  }

  deleteFolder(sectionId, folderId) {
    return this.applyCollectionEdit({ operation: 'folder-delete', sectionId, folderId });
  }

  reorderCatalogInFolder(sectionId, folderId, index, to) {
    return this.applyCollectionEdit({ operation: 'catalog-move', sectionId, folderId, index, to });
  }

  moveCatalogInFolder(sectionId, folderId, index, direction) {
    return this.applyCollectionEdit({ operation: 'catalog-move', sectionId, folderId, index, direction });
  }

  moveCatalogExtreme(sectionId, folderId, index, destination) {
    return this.applyCollectionEdit({ operation: 'catalog-move', sectionId, folderId, index, destination });
  }

  renameCatalogInFolder(sectionId, folderId, index, title) {
    return this.applyCollectionEdit({ operation: 'catalog-rename', sectionId, folderId, index, title });
  }

  removeCatalogFromFolder(sectionId, folderId, index) {
    return this.applyCollectionEdit({ operation: 'catalog-remove', sectionId, folderId, index });
  }

  addCatalogToFolder(sectionId, folderId, metadata) {
    return this.applyCollectionEdit({ operation: 'catalog-add', sectionId, folderId, metadata });
  }

  getSynchronizedMetadataPayload() {
    return prepareMetadataPayload({
      rawTemplate: this.rawMetadataTemplate,
      collections: this.collections,
      preferences: this.preferences,
      apiKeys: this.apiKeys,
      searchAiEnabled: this.searchAiEnabled,
      password: this.aiometadata.password || 'NuvioSetupMaster2026',
    });
  }

  getSynchronizedNuvioCollections() {
    return selectedCollections(this.collections);
  }

  getFlattenedCollectionsForApi(profileId, addonId) {
    return flattenedCollections(this.collections, { profileId, addonId });
  }
}
