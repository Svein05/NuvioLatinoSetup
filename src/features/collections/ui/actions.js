import { escapeHtml } from '../../../shared/ui/safe-markup.js';

const allowed = new Set(['toggleAll', 'resetDefaults', 'moveSection', 'moveSectionExtreme',
  'openSectionModal', 'toggleSection', 'focusFolder', 'toggleFolder', 'moveFolder', 'openEditModal',
  'openCatalogExplorer', 'moveCatalog', 'moveCatalogExtreme', 'renameCatalogInExplorer',
  'deleteCatalogInExplorer', 'openAddCatalogModal', 'closeModal', 'doAddCatalog',
  'moveFolderInSection', 'moveFolderInSectionExtreme', 'saveSectionModal', 'saveEditModal', 'closeEditModal']);

export function collectionAction(action, ...args) {
  if (!allowed.has(action)) throw new Error(`Acción de colección desconocida: ${action}`);
  return `data-collection-action="${action}" data-action-args="${escapeHtml(JSON.stringify(args))}"`;
}

/** Delegation survives view replacement without exposing controllers on window. */
export function bindCollectionActions(root, controller) {
  if (!root?.addEventListener) return () => {};
  const onClick = event => {
    const close = event.target.closest('[data-close-collection-modal]');
    if (close) { event.stopPropagation(); close.closest('[role="dialog"]')?.remove(); return; }
    const target = event.target.closest('[data-collection-action]');
    if (!target || !root.contains(target) || target.disabled) return;
    event.stopPropagation();
    const action = target.dataset.collectionAction;
    if (allowed.has(action)) {
      controller[action](...JSON.parse(target.dataset.actionArgs));
      if (action === 'toggleFolder') target.querySelector('.lat-folder-checkbox')?.classList.toggle('checked');
    }
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
