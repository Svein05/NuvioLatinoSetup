/** Hover and image fallback behavior belongs to the mounted collection view. */
export function bindCollectionMedia(root, controller) {
  if (!root?.addEventListener) return () => {};
  const onHover = event => {
    const folder = event.target.closest('.draggable-card[data-folder-id]');
    if (folder && !folder.contains(event.relatedTarget)) controller.focusFolder(folder.dataset.sectionId, folder.dataset.folderId);
    const header = event.target.closest('[data-collection-header]');
    if (header && !header.contains(event.relatedTarget)) controller.onSectionHeaderHover(header.dataset.collectionHeader, true);
  };
  const onLeave = event => {
    const header = event.target.closest('[data-collection-header]');
    if (header && !header.contains(event.relatedTarget)) controller.onSectionHeaderHover(header.dataset.collectionHeader, false);
  };
  const onError = event => {
    const image = event.target;
    if (!image.dataset?.fallbackSrc) return;
    const fallback = image.dataset.fallbackSrc;
    delete image.dataset.fallbackSrc;
    image.src = fallback;
  };
  root.addEventListener('mouseover', onHover);
  root.addEventListener('mouseout', onLeave);
  root.addEventListener('error', onError, true);
  return () => {
    root.removeEventListener('mouseover', onHover);
    root.removeEventListener('mouseout', onLeave);
    root.removeEventListener('error', onError, true);
  };
}
