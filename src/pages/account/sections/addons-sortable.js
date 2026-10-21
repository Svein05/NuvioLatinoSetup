export function moveAddon({ state, index, direction, pushHistory, onDirty, renderAddons }) {
  const newIndex = index + direction;
  if (!state.installedAddons || newIndex < 0 || newIndex >= state.installedAddons.length) return;

  pushHistory?.();
  const item = state.installedAddons.splice(index, 1)[0];
  state.installedAddons.splice(newIndex, 0, item);

  onDirty?.('addons', true);
  renderAddons?.();
}

export function setupAddonsSortable({ root = document, state, Sortable, pushHistory, onDirty, renderAddons }) {
  const container = root.getElementById?.('accountAddonsListContainer');
  if (!container || !Sortable) return;

  if (container._sortableInstance) {
    container._sortableInstance.destroy();
  }

  container._sortableInstance = new Sortable(container, {
    animation: 150,
    handle: '.sortable-drag-handle',
    ghostClass: 'sortable-ghost',
    onEnd: (evt) => {
      if (evt.oldIndex === evt.newIndex) return;
      pushHistory?.();
      const movedItem = state.installedAddons.splice(evt.oldIndex, 1)[0];
      state.installedAddons.splice(evt.newIndex, 0, movedItem);

      onDirty?.('addons', true);
      renderAddons?.();
    },
  });
}
