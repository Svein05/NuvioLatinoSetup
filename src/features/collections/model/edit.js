import { destinationIndex, movedItems } from './order.js';
import { editFolderCatalog } from './catalog-edit.js';

function editFolder(folder, edit) {
  if (edit.operation.startsWith('catalog-')) return editFolderCatalog(folder, edit);
  if (edit.operation === 'folder-toggle') return { folder: { ...folder, enabled: !folder.enabled }, result: true };
  if (edit.operation === 'folder-update') return { folder: { ...folder, ...structuredClone(edit.properties) }, result: true };
  return { folder, result: false };
}

function editSection(section, edit) {
  if (edit.operation === 'section-toggle') {
    const enabled = edit.enabled ?? !section.enabled;
    return { section: { ...section, enabled, folders: section.folders.map(folder => ({ ...folder, enabled })) }, result: true };
  }
  if (edit.operation === 'section-update') {
    return { section: { ...section, ...structuredClone(edit.properties) }, result: true };
  }
  if (edit.operation === 'folder-move') {
    const to = destinationIndex(section.folders.length, edit.index, edit);
    const folders = movedItems(section.folders, edit.index, to);
    return { section: folders ? { ...section, folders } : section, result: !!folders };
  }
  const folderIndex = section.folders.findIndex(folder => folder.id === edit.folderId);
  if (folderIndex < 0) return { section, result: false };
  if (edit.operation === 'folder-delete') {
    return { section: { ...section, folders: section.folders.filter((_, index) => index !== folderIndex) }, result: true };
  }
  const result = editFolder(section.folders[folderIndex], edit);
  const folders = section.folders.map((folder, index) => index === folderIndex ? result.folder : folder);
  return { ...result, section: result.folder === section.folders[folderIndex] ? section : { ...section, folders } };
}

/** Pure edit boundary. Unrelated records and unknown properties are preserved. */
export function editCollections(collections, edit) {
  if (edit.operation === 'all-toggle') {
    return {
      collections: collections.map(section => ({
        ...section, enabled: edit.enabled,
        folders: section.folders.map(folder => ({ ...folder, enabled: edit.enabled })),
      })), result: true,
    };
  }
  if (edit.operation === 'section-move') {
    const to = destinationIndex(collections.length, edit.index, edit);
    const reordered = movedItems(collections, edit.index, to);
    return { collections: reordered || collections, result: !!reordered };
  }
  const sectionIndex = collections.findIndex(section => section.id === edit.sectionId);
  if (sectionIndex < 0) return missing(collections, edit, 'Sección no encontrada.');
  const result = editSection(collections[sectionIndex], edit);
  if (edit.operation === 'catalog-add' && result.result === false) {
    return missing(collections, edit, 'Carpeta no encontrada.');
  }
  return {
    collections: result.section === collections[sectionIndex] ? collections
      : collections.map((section, index) => index === sectionIndex ? result.section : section),
    result: result.result, catalogId: result.catalogId, title: result.title,
  };
}

function missing(collections, edit, error) {
  return { collections, result: edit.operation === 'catalog-add' ? { success: false, error } : false };
}
