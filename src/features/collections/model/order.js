export function movedItems(items, from, to) {
  if (!Array.isArray(items) || !Number.isInteger(from) || !Number.isInteger(to)) return null;
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return null;
  const result = items.slice();
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

export function destinationIndex(length, index, { to, direction, destination }) {
  if (destination) return destination === 'top' ? 0 : length - 1;
  return to ?? index + direction;
}

export function initializeCollections(template, { reset = false } = {}) {
  return structuredClone(template).map(section => ({
    ...section,
    pinToTop: section.pinToTop ?? true,
    enabled: reset || section.enabled !== false,
    folders: (section.folders || []).map(folder => ({
      ...folder, enabled: reset || folder.enabled !== false,
    })),
  }));
}
