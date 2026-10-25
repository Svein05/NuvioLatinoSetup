import { recordCreatedProfileAvatar } from '../../../workflows/record-created-profile-avatar.js';

export function openEditProfileModal({ root = document, state, profileId }) {
  const modal = root.getElementById?.('modalEditProfile');
  const targetIdInput = root.getElementById?.('editProfileTargetId');
  const nameInput = root.getElementById?.('inputEditProfileName');
  const subEl = root.getElementById?.('modalEditProfileSub');
  const btnDelete = root.getElementById?.('btnDeleteProfileInModal');
  if (!modal) return;

  const id = Number(profileId);
  const profile = (state.profiles || []).find(p => Number(p.profile_index ?? p.id) === id);
  if (!profile) return;

  if (targetIdInput) targetIdInput.value = id;
  if (nameInput) nameInput.value = profile.name;
  if (subEl) subEl.textContent = 'Personaliza el nombre de tu perfil';

  if (btnDelete) {
    btnDelete.classList.toggle('hidden', (state.profiles || []).length <= 1);
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (nameInput) setTimeout(() => nameInput.focus(), 50);
}

export function closeEditProfileModal(root = document) {
  const modal = root.getElementById?.('modalEditProfile');
  modal?.classList.add('hidden');
  modal?.classList.remove('flex');
}

export function openCreateProfileModal({ root = document, state, showToast }) {
  root.getElementById?.('accountProfilePopover')?.classList.add('hidden');
  if ((state.profiles || []).length >= 6) {
    showToast?.('Has alcanzado el límite máximo de 6 perfiles en Nuvio.', 'warning');
    return;
  }
  const preview = root.getElementById?.('createProfileAvatarPreview');
  if (preview) preview.src = '/assets/icons/avatar-placeholder.svg';
  if (preview?.dataset) delete preview.dataset.selectedUrl;
  const modal = root.getElementById?.('modalCreateProfile');
  const nameInput = root.getElementById?.('inputCreateProfileName');
  if (!modal) return;

  if (nameInput) nameInput.value = '';
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (nameInput) setTimeout(() => nameInput.focus(), 50);
}

export function closeCreateProfileModal(root = document) {
  const modal = root.getElementById?.('modalCreateProfile');
  modal?.classList.add('hidden');
  modal?.classList.remove('flex');
}

export function setupProfileModals({
  root = document,
  state,
  config,
  client,
  showToast,
  refreshProfiles,
  selectProfile,
  recordAvatarUsage,
  onAvatarRecorded,
}) {
  bindEditForm({ root, state, config, client, showToast, refreshProfiles });
  bindDeleteButton({ root, state, config, client, showToast, refreshProfiles, selectProfile });
  bindCreateForm({ root, state, config, client, showToast, refreshProfiles, selectProfile, recordAvatarUsage, onAvatarRecorded });
}

function bindEditForm({ root, state, config, client, showToast, refreshProfiles }) {
  const formEdit = root.getElementById?.('formEditProfile');
  root.getElementById?.('btnCloseEditProfileModal')?.addEventListener('click', () => closeEditProfileModal(root));
  root.getElementById?.('btnCancelEditProfile')?.addEventListener('click', () => closeEditProfileModal(root));

  formEdit?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const targetId = root.getElementById?.('editProfileTargetId')?.value;
    const newName = root.getElementById?.('inputEditProfileName')?.value.trim();
    const btnSubmit = root.getElementById?.('btnSaveEditProfile');
    if (btnSubmit?.disabled) return;
    if (!newName || !targetId) return;

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Guardando...';
    }
    try {
      await client.updateProfile({
        apiUrl: config.NUVIO_API_URL, apikey: config.NUVIO_PUBLIC_ANON_KEY,
        accessToken: state.session.accessToken, userId: state.session.userId,
        profileId: targetId, name: newName,
      });
      const p = (state.profiles || []).find(item => Number(item.profile_index ?? item.id) === Number(targetId));
      if (p) p.name = newName;
      if (Number(state.selectedProfileId) === Number(targetId)) {
        const activeName = root.getElementById?.('sidebarActiveName');
        if (activeName) activeName.textContent = newName;
      }
      refreshProfiles?.();
      showToast?.('✓ Nombre de perfil actualizado con éxito.', 'success');
      closeEditProfileModal(root);
    } catch (err) {
      showToast?.(`Error actualizando perfil: ${err.message}`, 'error');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Guardar';
      }
    }
  });
}

function bindDeleteButton({ root, state, config, client, showToast, refreshProfiles, selectProfile }) {
  const btnDeleteModal = root.getElementById?.('btnDeleteProfileInModal');
  btnDeleteModal?.addEventListener('click', async () => {
    const targetId = root.getElementById?.('editProfileTargetId')?.value;
    if (!targetId) return;

    const targetProf = (state.profiles || []).find(p => Number(p.profile_index ?? p.id) === Number(targetId));
    const profName = targetProf ? targetProf.name : 'este perfil';
    if (!confirm(`¿Estás seguro de que deseas eliminar el perfil "${profName}"? Se borrarán sus datos y configuraciones en Nuvio.`)) return;

    btnDeleteModal.disabled = true;
    btnDeleteModal.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Eliminando...';
    try {
      await client.deleteProfile({
        apiUrl: config.NUVIO_API_URL, apikey: config.NUVIO_PUBLIC_ANON_KEY,
        accessToken: state.session.accessToken, userId: state.session.userId, profileId: targetId,
      });
      showToast?.('✓ Perfil eliminado con éxito.', 'success');
      closeEditProfileModal(root);
      await refreshProfiles?.();
      if (state.profiles?.length > 0) {
        selectProfile?.(state.profiles[0].profile_index ?? state.profiles[0].id);
      }
    } catch (delErr) {
      showToast?.(`Error al eliminar perfil: ${delErr.message}`, 'error');
    } finally {
      btnDeleteModal.disabled = false;
      btnDeleteModal.innerHTML = '<i class="fa-regular fa-trash-can mr-1"></i> Eliminar';
    }
  });
}

function bindCreateForm({ root, state, config, client, showToast, refreshProfiles, selectProfile, recordAvatarUsage, onAvatarRecorded }) {
  const formCreate = root.getElementById?.('formCreateProfile');
  root.getElementById?.('btnCloseCreateProfileModal')?.addEventListener('click', () => closeCreateProfileModal(root));
  root.getElementById?.('btnCancelCreateProfile')?.addEventListener('click', () => closeCreateProfileModal(root));
  root.getElementById?.('btnPopoverAddProfile')?.addEventListener('click', () => openCreateProfileModal({ root, state, showToast }));
  root.getElementById?.('btnPromptCreateProfile')?.addEventListener('click', () => {
    root.getElementById('modalSelectProfilePrompt')?.classList.replace('flex', 'hidden');
    openCreateProfileModal({ root, state, showToast });
  });
  root.getElementById?.('btnCloseSelectProfileModal')?.addEventListener('click', () => {
    root.getElementById('modalSelectProfilePrompt')?.classList.replace('flex', 'hidden');
  });

  formCreate?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = root.getElementById?.('inputCreateProfileName')?.value.trim();
    const btnSubmit = root.getElementById?.('btnSubmitCreateProfile');
    if (btnSubmit?.disabled) return;
    if (!name) return;

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Creando...';
    }
    const accessToken = state.session?.accessToken;
    const avatarUrl = root.getElementById('createProfileAvatarPreview')?.dataset?.selectedUrl;
    try {
      const created = await client.createProfile({
        apiUrl: config.NUVIO_API_URL, apikey: config.NUVIO_PUBLIC_ANON_KEY,
        accessToken, userId: state.session.userId, name, avatarUrl,
      });
      recordCreatedProfileAvatar({ profile: created, avatarUrl, accessToken, recordUsage: recordAvatarUsage, onRecorded: onAvatarRecorded });
      showToast?.('✓ Perfil creado con éxito.', 'success');
      closeCreateProfileModal(root);
      await refreshProfiles?.();
      const newId = created.profile_index ?? created.id;
      if (newId) selectProfile?.(newId);
    } catch (createErr) {
      showToast?.(`Error al crear perfil: ${createErr.message}`, 'error');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fa-solid fa-plus mr-1"></i> Crear Perfil';
      }
    }
  });
}
