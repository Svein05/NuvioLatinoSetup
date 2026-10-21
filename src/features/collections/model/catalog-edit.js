import { destinationIndex, movedItems } from './order.js';

function failure(folder, error) {
  return { folder, result: error ? { success: false, error } : false };
}

function addCatalog(folder, metadata) {
  const id = metadata?.id;
  if (typeof id !== 'string' || !id.trim()) return failure(folder, 'El catálogo no tiene identificador.');
  const sources = folder.sources || [];
  if (sources.some(source => (source.catalogId || source.id) === id)) {
    return failure(folder, 'El catálogo ya está presente en esta fila.');
  }
  const base = {
    type: metadata.type || 'movie', genre: null, addonId: 'aio-metadata',
    catalogId: id, title: metadata.name || id,
  };
  const source = {
    ...base, sortBy: null, tmdbId: null, filters: null, sortHow: null,
    provider: 'addon', mediaType: null, traktListId: null, tmdbSourceType: null,
  };
  return {
    folder: { ...folder, sources: [...sources, source], catalogSources: [...(folder.catalogSources || []), base] },
    result: { success: true },
  };
}

function reorderCatalog(folder, edit) {
  const sources = folder.sources || [];
  const to = destinationIndex(sources.length, edit.index, edit);
  const reordered = movedItems(sources, edit.index, to);
  if (!reordered) return failure(folder);
  // Paired arrays must keep their correspondence; reject an inconsistent input before editing it.
  if (Array.isArray(folder.catalogSources) && folder.catalogSources.length !== sources.length) {
    return failure(folder);
  }
  return {
    folder: {
      ...folder, sources: reordered,
      ...(folder.catalogSources ? { catalogSources: movedItems(folder.catalogSources, edit.index, to) } : {}),
    },
    result: true,
  };
}

function renameCatalog(folder, edit) {
  const title = typeof edit.title === 'string' ? edit.title.trim() : '';
  if (!title) return failure(folder);
  const rename = (source, index) => index === edit.index ? { ...source, title } : source;
  return {
    folder: {
      ...folder, sources: folder.sources.map(rename),
      ...(Array.isArray(folder.catalogSources) ? { catalogSources: folder.catalogSources.map(rename) } : {}),
    },
    result: true,
    catalogId: folder.sources[edit.index].catalogId || folder.sources[edit.index].id,
    title,
  };
}

export function editFolderCatalog(folder, edit) {
  if (edit.operation === 'catalog-add') return addCatalog(folder, edit.metadata);
  if (!Number.isInteger(edit.index) || !folder.sources?.[edit.index]) return failure(folder);
  if (edit.operation === 'catalog-move') return reorderCatalog(folder, edit);
  if (edit.operation === 'catalog-rename') return renameCatalog(folder, edit);
  if (edit.operation !== 'catalog-remove') return failure(folder);
  return {
    folder: {
      ...folder, sources: folder.sources.filter((_, index) => index !== edit.index),
      ...(Array.isArray(folder.catalogSources)
        ? { catalogSources: folder.catalogSources.filter((_, index) => index !== edit.index) } : {}),
    },
    result: true,
  };
}
