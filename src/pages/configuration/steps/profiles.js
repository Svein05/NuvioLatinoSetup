import { createLifetime } from '../../../shared/ui/lifetime.js';
import { renderProfilesList, renderProfileWarningUI } from './profiles-view.js';
import { createWizardAvatarPicker } from './wizard-avatar-picker.js';

function bindDialogButtons(root, { closeNewModal, closeDelModal, picker, onOpenNew }, lifetime) {
  lifetime.on(root.getElementById('btnOpenNewProfileModal'), 'click', onOpenNew);
  lifetime.on(root.getElementById('btnCloseNewProfileModal'), 'click', closeNewModal);
  lifetime.on(root.getElementById('btnCancelNewProfile'), 'click', closeNewModal);
  lifetime.on(root.getElementById('btnCloseDeleteProfileModal'), 'click', closeDelModal);
  lifetime.on(root.getElementById('btnCancelDeleteProfile'), 'click', closeDelModal);

  lifetime.on(root.getElementById('btnPickNewProfileAvatar'), 'click', picker.openPicker);
  lifetime.on(root.getElementById('btnCloseWizardAvatarPicker'), 'click', picker.closePicker);
  lifetime.on(root.getElementById('btnWizardFranchisesTrigger'), 'click', picker.openFranchises);
  lifetime.on(root.getElementById('btnCloseWizardFranchises'), 'click', () => {
    root.getElementById('modalWizardFranchises')?.classList.replace('flex', 'hidden');
  });
  lifetime.on(root.getElementById('inputWizardAvatarSearch'), 'input', (e) => picker.setFilterQuery(e.target.value.trim()));
}

function bindProfileActions(root, { actions, closeNewModal, closeDelModal, render, getAvatarUrl, getPendingDelete }, lifetime) {
  lifetime.on(root.getElementById('btnConfirmDeleteProfile'), 'click', async () => {
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
    const button = root.getElementById('btnConfirmNewProfile') || root.getElementById('btnCreateProfile');
    if (button?.disabled) return;
    const nameInput = root.getElementById('inputNewProfileName') || root.getElementById('newProfileName');
    const name = nameInput?.value.trim();
    if (!name) { actions.notify('Escribe un nombre para el nuevo perfil.', 'warning'); return; }
    if (button) button.disabled = true;
    try {
      await actions.createProfile({ name, avatarUrl: getAvatarUrl() });
      closeNewModal();
      render();
      actions.notify(`✓ Perfil "${name}" creado con éxito.`, 'success');
    } catch (err) {
      actions.notify(`Error al crear perfil: ${err.message}`, 'error');
    } finally { if (button) button.disabled = false; }
  };

  const btnConfirm = root.getElementById('btnConfirmNewProfile') || root.getElementById('btnCreateProfile');
  lifetime.on(btnConfirm, 'click', confirmCreate);
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
    if (String(state.selectedProfileId) !== String(profileId)) return;
    renderProfileWarningUI({ isNew: false, hasAio, displayName: profileName }, root);
  };
}

export function mountProfilesStep({ state, actions, root = document } = {}) {
  const lifetime = createLifetime();
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

  bindDialogButtons(root, { closeNewModal, closeDelModal, picker, onOpenNew }, lifetime);
  bindProfileActions(root, { actions, closeNewModal, closeDelModal, render, getAvatarUrl: () => newProfileAvatarUrl, getPendingDelete: () => pendingDelete }, lifetime);

  render();
  return { render, updateWarning, openNewModal: onOpenNew, closeNewModal, promptDelete: onPromptDelete, dispose: () => lifetime.dispose() };
}
