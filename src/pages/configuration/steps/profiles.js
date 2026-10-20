import { renderProfilesList, renderProfileWarningUI } from './profiles-view.js';
import { createWizardAvatarPicker } from './wizard-avatar-picker.js';

function bindDialogButtons(root, { closeNewModal, closeDelModal, picker, onOpenNew }) {
  root.getElementById('btnOpenNewProfileModal')?.addEventListener('click', onOpenNew);
  root.getElementById('btnCloseNewProfileModal')?.addEventListener('click', closeNewModal);
  root.getElementById('btnCancelNewProfile')?.addEventListener('click', closeNewModal);
  root.getElementById('btnCloseDeleteProfileModal')?.addEventListener('click', closeDelModal);
  root.getElementById('btnCancelDeleteProfile')?.addEventListener('click', closeDelModal);

  root.getElementById('btnPickNewProfileAvatar')?.addEventListener('click', picker.openPicker);
  root.getElementById('btnCloseWizardAvatarPicker')?.addEventListener('click', picker.closePicker);
  root.getElementById('btnWizardFranchisesTrigger')?.addEventListener('click', picker.openFranchises);
  root.getElementById('btnCloseWizardFranchises')?.addEventListener('click', () => {
    root.getElementById('modalWizardFranchises')?.classList.replace('flex', 'hidden');
  });
  root.getElementById('inputWizardAvatarSearch')?.addEventListener('input', (e) => picker.setFilterQuery(e.target.value.trim()));
}

function bindProfileActions(root, { actions, closeNewModal, closeDelModal, render, getAvatarUrl, getPendingDelete }) {
  root.getElementById('btnConfirmDeleteProfile')?.addEventListener('click', async () => {
    const pending = getPendingDelete();
    if (!pending) return;
    try {
      await actions.deleteProfile(pending.id);
      closeDelModal();
      render();
      actions.notify(`✓ Perfil "${pending.name}" eliminado.`, 'success');
    } catch (err) {
      actions.notify(`Error al eliminar: ${err.message}`, 'error');
    }
  });

  const confirmCreate = async () => {
    const nameInput = root.getElementById('inputNewProfileName') || root.getElementById('newProfileName');
    const name = nameInput?.value.trim();
    if (!name) { actions.notify('Escribe un nombre para el nuevo perfil.', 'warning'); return; }
    try {
      await actions.createProfile({ name, avatarUrl: getAvatarUrl() });
      closeNewModal();
      render();
      actions.notify(`✓ Perfil "${name}" creado con éxito.`, 'success');
    } catch (err) {
      actions.notify(`Error al crear perfil: ${err.message}`, 'error');
    }
  };

  const btnConfirm = root.getElementById('btnConfirmNewProfile') || root.getElementById('btnCreateProfile');
  btnConfirm?.addEventListener('click', confirmCreate);
}

function createWarningUpdater(state, actions, root) {
  return async (profileId, profileName) => {
    if (!profileId || state.isManualMode) {
      root.getElementById('profileOverwriteWarning')?.classList.add('hidden');
      return;
    }
    if (state.isProfileNew(profileId)) {
      renderProfileWarningUI({ isNew: true, displayName: profileName }, root);
      return;
    }
    renderProfileWarningUI({ isAnalyzing: true, displayName: profileName }, root);
    const hasAio = await actions.checkProfileHasAio(profileId).catch(() => false);
    renderProfileWarningUI({ isNew: false, hasAio, displayName: profileName }, root);
  };
}

export function mountProfilesStep({ state, actions, root = document } = {}) {
  let pendingDelete = null;
  let newProfileAvatarUrl = null;

  const picker = createWizardAvatarPicker({
    loadCatalog: actions.loadAvatars, filterAvatarsList: actions.filterAvatars,
    getFranchises: actions.getFranchises, resolveCdnUrl: actions.resolveCdnUrl,
    onAvatarPicked: (url) => {
      newProfileAvatarUrl = url;
      const preview = root.getElementById('newProfileAvatarPreview');
      if (preview) preview.src = url;
    },
  });

  const updateWarning = createWarningUpdater(state, actions, root);
  const closeNewModal = () => root.getElementById('modalNewProfile')?.classList.replace('flex', 'hidden');
  const closeDelModal = () => { pendingDelete = null; root.getElementById('modalDeleteProfile')?.classList.replace('flex', 'hidden'); };
  const onOpenNew = () => {
    if (state.profiles.length >= 6) { actions.notify('Límite máximo de 6 perfiles alcanzado.', 'warning'); return; }
    newProfileAvatarUrl = null;
    const nameInput = root.getElementById('inputNewProfileName') || root.getElementById('newProfileName');
    if (nameInput) { nameInput.value = ''; nameInput.focus(); }
    root.getElementById('modalNewProfile')?.classList.replace('hidden', 'flex');
  };

  const onPromptDelete = (id, name) => {
    if (state.profiles.length <= 1) { actions.notify('No puedes eliminar el único perfil de tu cuenta.', 'warning'); return; }
    pendingDelete = { id, name };
    const target = root.getElementById('deleteProfileTargetName');
    if (target) target.textContent = `"${name}"`;
    root.getElementById('modalDeleteProfile')?.classList.replace('hidden', 'flex');
  };

  const render = () => {
    const container = root.getElementById('profilesList') || root.getElementById('profilesContainer');
    renderProfilesList(container, {
      profiles: state.profiles, selectedProfileId: state.selectedProfileId,
      onSelect: (id, name) => {
        state.selectedProfileId = id; state.selectedProfileName = name;
        actions.onSelectProfile(id, name); render(); updateWarning(id, name);
      },
      onPromptDelete,
      onOpenNewModal: onOpenNew,
    });
    updateWarning(state.selectedProfileId, state.selectedProfileName);
  };

  bindDialogButtons(root, { closeNewModal, closeDelModal, picker, onOpenNew });
  bindProfileActions(root, { actions, closeNewModal, closeDelModal, render, getAvatarUrl: () => newProfileAvatarUrl, getPendingDelete: () => pendingDelete });

  render();
  return { render, updateWarning, openNewModal: onOpenNew, promptDelete: onPromptDelete };
}
