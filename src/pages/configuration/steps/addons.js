import { createLifetime } from '../../../shared/ui/lifetime.js';
import { isAioMetadataAddon } from '../../../features/addons/index.js';
import { renderAddonsContainer } from './addons-view.js';
import { cleanManifestUrl, fetchManifestInfo, enrichProfileAddons } from './addons-manifest.js';
import {
  syncDebridModalInputs,
  updateInstallButtonState,
  validateDraftKeys,
  commitAioStreamsInstall,
  bindAioStreamsModalEvents,
} from './aiostreams-modal.js';

const DEBRID_KEYS = ['torbox', 'alldebrid', 'realdebrid', 'premiumize', 'debridlink', 'easydebrid', 'debrider', 'torrin', 'offcloud'];

function bindAddModalEvents({ lifetime, root, onOpen, onConfirm, onClose }) {
  const modal = root.querySelector?.('#modalAddAddon');
  const input = root.querySelector?.('#inputAddonManifestUrl');
  lifetime.on(root.querySelector?.('#btnOpenAddAddonModal'), 'click', onOpen);
  lifetime.on(root.querySelector?.('#btnCloseAddAddonModal'), 'click', onClose);
  lifetime.on(root.querySelector?.('#btnCancelAddAddon'), 'click', onClose);
  lifetime.on(root.querySelector?.('#btnConfirmAddAddon'), 'click', onConfirm);
  if (input) lifetime.on(input, 'keydown', e => { if (e.key === 'Enter') { e.preventDefault(); onConfirm(); } });
  if (modal) lifetime.on(modal, 'click', e => { if (e.target === modal) onClose(); });
}

function bindRemoveModalEvents({ lifetime, root, onAccept, onCancel }) {
  const modal = root.querySelector?.('#modalConfirmRemoveAddon');
  lifetime.on(root.querySelector?.('#btnCloseConfirmRemoveAddonModal'), 'click', onCancel);
  lifetime.on(root.querySelector?.('#btnCancelConfirmRemoveAddon'), 'click', onCancel);
  lifetime.on(root.querySelector?.('#btnAcceptConfirmRemoveAddon'), 'click', onAccept);
  if (modal) lifetime.on(modal, 'click', e => { if (e.target === modal) onCancel(); });
}

function toggleModal(el, show) {
  if (!el) return;
  el.classList.toggle('hidden', !show);
  el.classList.toggle('flex', show);
}

async function addCustomAddon(rawUrl, { root, state, cache, notify, render, close }) {
  const clean = cleanManifestUrl(rawUrl);
  if (!clean) { notify?.('Por favor ingresa la URL del manifest (.json).', 'warning'); return; }
  if (isAioMetadataAddon({ url: clean, name: '' })) {
    notify?.('AIOMetadata ya es tu addon principal (#1) y se encuentra anclado en la parte superior.', 'info');
    return;
  }
  if (state.hasAddonManifest(clean)) {
    notify?.('Este enlace de manifiesto ya se encuentra agregado en tu perfil.', 'warning');
    return;
  }

  const manifest = await fetchManifestInfo(clean, cache);
  let name = manifest?.name || '';
  if (!name) {
    try { name = new URL(clean).hostname.replace(/^(www\.|stremio\.)/, '').split('.')[0]; } catch { name = `Addon ${state.profileAddons.length + 2}`; }
  }
  state.addCustomAddon(clean, name, manifest?.logo || null);
  const input = root.querySelector?.('#inputAddonManifestUrl');
  if (input) input.value = '';
  close();
  render();
  notify?.(`✓ Addon "${name}" agregado exitosamente a la lista.`, 'success');
}

function bindDebridInputs({ lifetime, root, getDraft, state }) {
  DEBRID_KEYS.forEach(key => {
    const capitalized = key.charAt(0).toUpperCase() + key.slice(1);
    const input = root.querySelector?.(`#inputDebrid${capitalized}`);
    if (input) {
      lifetime.on(input, 'input', () => {
        const draft = getDraft();
        if (draft) { delete draft.validatedKeys[key]; delete draft.debrids[key]; }
        updateInstallButtonState(root, draft, state.hasAioStreamsInstance());
      });
    }
  });
}

function openDebridsDialog(root, state) {
  toggleModal(root.querySelector?.('#modalAioStreamsRequirement'), false);
  toggleModal(root.querySelector?.('#modalAioStreamsDebrids'), true);
  const draft = { debrids: { ...(state.aiostreams.debrids || {}) }, validatedKeys: { ...(state.aiostreams.validatedKeys || {}) } };
  syncDebridModalInputs(root, draft, state.hasAioStreamsInstance());
  updateInstallButtonState(root, draft, state.hasAioStreamsInstance());
  return draft;
}

function createAioStreamsActions({ root, state, getDraft, setDraft, render, actions }) {
  return {
    openAioStreamsFlow: () => toggleModal(root.querySelector?.(state.hasAioStreamsInstance() ? '#modalAioStreamsConflict' : '#modalAioStreamsRequirement'), true),
    closeAioStreamsConflict: () => toggleModal(root.querySelector?.('#modalAioStreamsConflict'), false),
    confirmAioStreamsReplacement: () => {
      const idx = state.getAioStreamsIndex();
      if (idx !== -1) { state.removeAddon(idx); render(); }
      toggleModal(root.querySelector?.('#modalAioStreamsConflict'), false);
      toggleModal(root.querySelector?.('#modalAioStreamsRequirement'), true);
    },
    openAioStreamsDebridsModal: () => setDraft(openDebridsDialog(root, state)),
    closeAioStreamsDebridsModal: () => { toggleModal(root.querySelector?.('#modalAioStreamsDebrids'), false); setDraft(null); },
    validateDebridKeys: () => validateDraftKeys({ root, draft: getDraft(), validateKey: actions.validateDebridKey, notify: actions.notify }),
    installAioStreamsFromModal: () => commitAioStreamsInstall({ root, draft: getDraft(), state, onClose: () => { toggleModal(root.querySelector?.('#modalAioStreamsDebrids'), false); setDraft(null); render(); }, notify: actions.notify }),
  };
}

function setupRemoveModal({ lifetime, root, state, getPending, setPending, render, notify }) {
  bindRemoveModalEvents({
    lifetime, root,
    onAccept: () => {
      const idx = getPending();
      if (idx === null) return;
      const name = state.profileAddons[idx]?.name || 'este addon';
      state.removeAddon(idx);
      setPending(null);
      toggleModal(root.querySelector?.('#modalConfirmRemoveAddon'), false);
      render();
      notify?.(`✓ Addon "${name}" removido de la lista.`, 'info');
    },
    onCancel: () => { setPending(null); toggleModal(root.querySelector?.('#modalConfirmRemoveAddon'), false); },
  });
}

export function mountAddonsStep({ state, actions, root = document } = {}) {
  const lifetime = createLifetime();
  const cache = new Map();
  let pendingDeleteIndex = null;
  let draft = null;

  const render = () => {
    renderAddonsContainer(root, { addons: state.profileAddons, aioDebrids: state.aiostreams?.debrids });
    enrichProfileAddons(state.profileAddons, { cache, onUpdate: () => renderAddonsContainer(root, { addons: state.profileAddons, aioDebrids: state.aiostreams?.debrids }) });
    actions.onUpdate?.();
  };

  const openAdd = (url = '') => {
    const input = root.querySelector?.('#inputAddonManifestUrl');
    if (input) input.value = url;
    toggleModal(root.querySelector?.('#modalAddAddon'), true);
    input?.focus();
  };

  bindAddModalEvents({
    lifetime, root, onOpen: () => openAdd(''),
    onConfirm: () => addCustomAddon(root.querySelector?.('#inputAddonManifestUrl')?.value, { root, state, cache, notify: actions.notify, render, close: () => toggleModal(root.querySelector?.('#modalAddAddon'), false) }),
    onClose: () => toggleModal(root.querySelector?.('#modalAddAddon'), false),
  });

  setupRemoveModal({ lifetime, root, state, getPending: () => pendingDeleteIndex, setPending: idx => { pendingDeleteIndex = idx; }, render, notify: actions.notify });
  bindDebridInputs({ lifetime, root, getDraft: () => draft, state });
  const aio = createAioStreamsActions({ root, state, getDraft: () => draft, setDraft: d => { draft = d; }, render, actions });

  bindAioStreamsModalEvents({
    lifetime, root,
    handlers: {
      onOpenFlow: aio.openAioStreamsFlow, onCloseConflict: aio.closeAioStreamsConflict,
      onConfirmReplace: aio.confirmAioStreamsReplacement, onCloseReq: () => toggleModal(root.querySelector?.('#modalAioStreamsRequirement'), false),
      onAcceptReq: aio.openAioStreamsDebridsModal, onCloseDebrids: aio.closeAioStreamsDebridsModal,
      onValidate: aio.validateDebridKeys, onInstall: aio.installAioStreamsFromModal,
    },
  });

  return {
    render, openAddModal: openAdd, closeAddAddonModal: () => toggleModal(root.querySelector?.('#modalAddAddon'), false),
    moveAddon: (idx, dir) => { state.moveAddon(idx, dir); render(); },
    removeAddon: idx => {
      pendingDeleteIndex = idx;
      const nameEl = root.querySelector?.('#deleteAddonTargetName');
      if (nameEl) nameEl.textContent = `"${state.profileAddons[idx]?.name || 'Addon ' + (idx + 2)}"`;
      toggleModal(root.querySelector?.('#modalConfirmRemoveAddon'), true);
    },
    ...aio, dispose: () => lifetime.dispose(),
  };
}
