import { renderAddonsSection } from './addons.js';
import { moveAddon, setupAddonsSortable } from './addons-sortable.js';
import { pushAddonsHistory } from '../account-undo.js';
import {
  openAccountEditAddonModal, closeAccountEditAddonModal, saveAccountEditAddon,
  openAccountAddAddonModal, closeAccountAddAddonModal, confirmAccountAddAddon,
} from './addons-modals.js';
import { createAccountStreaming } from './streaming-controller.js';

function bindAddonDialogs({ root, lifetime, state, context, render, notify }) {
  const on = (id, action) => lifetime.on(root.getElementById(id), 'click', action);
  on('btnAccountOpenAddAddon', () => openAccountAddAddonModal(root));
  on('btnConfirmAccountAddAddon', () => confirmAccountAddAddon(context).catch(error => notify(error.message, 'error')));
  on('btnConfirmAccountEditAddon', () => saveAccountEditAddon(context));
  for (const id of ['btnCloseAccountAddAddonModal', 'btnCancelAccountAddAddon']) {
    on(id, () => closeAccountAddAddonModal(root));
  }
  for (const id of ['btnCloseAccountEditAddonModal', 'btnCancelAccountEditAddon']) {
    on(id, () => closeAccountEditAddonModal({ root, state }));
  }
  const toggle = (id, open) => {
    root.getElementById(id)?.classList.toggle('hidden', !open);
    root.getElementById(id)?.classList.toggle('flex', open);
  };
  on('btnAccountDeleteAllAddons', () => toggle('modalAccountDeleteAllAddons', true));
  on('btnConfirmAccountDeleteAllAddons', () => {
    context.pushHistory(); state.installedAddons = []; context.onDirty('addons', true);
    toggle('modalAccountDeleteAllAddons', false); render();
  });
  on('btnConfirmAccountDeleteAddon', () => {
    if (state._deletingAddonIndex == null) return;
    context.pushHistory(); state.installedAddons.splice(state._deletingAddonIndex, 1);
    context.onDirty('addons', true); toggle('modalAccountDeleteAddon', false); render();
  });
  for (const kind of ['DeleteAddon', 'DeleteAllAddons']) {
    for (const id of [`btnCloseAccount${kind}Modal`, `btnCancelAccount${kind}`]) {
      on(id, () => toggle(`modalAccount${kind}`, false));
    }
  }
}

export function createAccountAddons({ root, state, services, lifetime, notify, updateUI, reload }) {
  const context = {
    root, state, showToast: notify, requestJson: services.requestJson,
    pushHistory: () => pushAddonsHistory(state),
    onDirty: (key, value) => { state.dirty[key] = value; updateUI(); },
    renderAddons: () => render(),
  };
  const streaming = createAccountStreaming({ root, state, services, lifetime, notify,
    onAddon: addon => {
      context.pushHistory(); state.installedAddons.push(addon);
      context.onDirty('addons', true); render();
    } });
  function render() {
    renderAddonsSection(state, { root,
      onEditAddon: index => openAccountEditAddonModal({ root, state, index }),
      onDeleteAddon: index => {
        state._deletingAddonIndex = index;
        const label = root.getElementById('accountDeleteAddonTargetName');
        if (label) label.textContent = state.installedAddons[index].name;
        root.getElementById('modalAccountDeleteAddon')?.classList.replace('hidden', 'flex');
      },
      onMoveAddon: (index, direction) => moveAddon({ ...context, index, direction }),
    });
    setupAddonsSortable({ ...context, Sortable: services.Sortable });
  }
  bindAddonDialogs({ root, state, lifetime, context, render, notify });
  lifetime.on(root.getElementById('btnAccountOpenAddAioStreams'), 'click', streaming.open);
  lifetime.on(root.getElementById('btnAccountRefreshAddons'), 'click', () => {
    if (state.dirty.addons) { notify('Guarda o deshaz tus cambios antes de recargar.', 'warning'); return; }
    reload();
  });
  lifetime.add(() => root.getElementById('accountAddonsListContainer')?._sortableInstance?.destroy());
  return { render };
}
