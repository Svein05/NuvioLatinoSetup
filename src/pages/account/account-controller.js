import { accountState, loadSession, clearSession, updateSaveButtonUI } from './account-state.js';
import { updateUndoButtonUI, performAccountUndo } from './account-undo.js';
import { setupScrollableTabs, switchSection } from './tabs-navigation.js';
import { saveAccountChanges } from '../../workflows/save-account-changes.js';
import {
  setupProfilePopover,
  renderProfilePopover,
  showSelectProfilePrompt,
  setupProfileModals,
  openEditProfileModal,
} from './sections/profiles.js';

function createSaveHandler({ root, state, config, client, deps, notify, updateUI }) {
  return async () => {
    const btn = root.getElementById?.('btnAccountSave');
    await saveAccountChanges({
      state, config, client,
      updateMetadataConfiguration: deps.updateMetadataConfiguration,
      resolveOwnerInstanceUrl: deps.resolveOwnerInstanceUrl,
      avatarService: {
        resolvePublicUrl: deps.resolveAvatarCdnUrl,
        recordUsage: deps.recordAvatarUsage,
      },
      ui: {
        notify,
        onSavingStateChange: (isSaving) => {
          if (btn) {
            btn.innerHTML = isSaving
              ? '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Guardando...'
              : '<i class="fa-solid fa-floppy-disk mr-1.5"></i><span>Guardar Cambios</span><span id="accountSaveCountBadge" class="hidden ml-1.5 px-2 py-0.5 rounded-full text-[11px] bg-black text-[#ffd479] font-mono font-bold"></span>';
          }
          updateUI();
        },
      },
    }).catch(() => {});
  };
}

function updateProfileHeaderUI(root, profile, resolveAvatarCdnUrl) {
  const activeAvatar = root.getElementById?.('sidebarActiveAvatar');
  const activeName = root.getElementById?.('sidebarActiveName');
  if (activeAvatar && profile) activeAvatar.src = resolveAvatarCdnUrl(profile.avatar_url);
  if (activeName && profile) activeName.textContent = profile.name;
}

function createProfileSelector({ root, state, resolveAvatarCdnUrl, updateUI }) {
  const selectProfile = async (profileId) => {
    state.selectedProfileId = Number(profileId) || profileId;
    state.hasChosenProfileInSession = true;
    const profile = (state.profiles || []).find(p => Number(p.profile_index ?? p.id) === state.selectedProfileId);
    updateProfileHeaderUI(root, profile, resolveAvatarCdnUrl);

    state.selectedAvatarUrl = profile?.avatar_url || null;
    state.originalAvatarUrl = profile?.avatar_url || null;
    renderProfilePopover({
      root, state, resolveAvatarCdnUrl,
      onSelectProfile: selectProfile,
      onEditProfile: (id) => openEditProfileModal({ root, state, profileId: id }),
    });

    state.dirty = { aiometadata: false, settings: false, avatar: false, addons: false };
    state.addonHistory = [];
    updateUI();

    switchSection(state.activeSection || 'overview', {
      root, state, updateUndoButton: () => updateUndoButtonUI(root, state),
    });
  };
  return selectProfile;
}

async function initSessionView({ root, state, fetchProfiles, selectProfile, resolveAvatarCdnUrl, notify }) {
  const session = loadSession(state);
  const authView = root.getElementById?.('accountAuthView');
  const dashboardView = root.getElementById?.('accountDashboardView');

  if (!session?.accessToken) {
    authView?.classList.remove('hidden');
    dashboardView?.classList.add('hidden');
    return;
  }

  authView?.classList.add('hidden');
  dashboardView?.classList.remove('hidden');
  try {
    await fetchProfiles();
    renderProfilePopover({ root, state, resolveAvatarCdnUrl, onSelectProfile: selectProfile });
    if (state.profiles.length > 0) {
      if (!state.hasChosenProfileInSession) {
        showSelectProfilePrompt({ root, state, resolveAvatarCdnUrl, onSelectProfile: selectProfile });
      }
      await selectProfile(state.profiles[0].profile_index ?? state.profiles[0].id);
    }
  } catch (err) {
    notify(`Error al cargar cuenta: ${err.message}`, 'error');
  }
}

export function createAccountController(deps = {}) {
  const root = deps.root || (typeof document !== 'undefined' ? document : null);
  const { state = accountState, config = {}, client, showToast = () => {}, resolveAvatarCdnUrl = u => u } = deps;
  const notify = deps.renderToast || showToast;
  const updateUI = () => { updateSaveButtonUI(root, state); updateUndoButtonUI(root, state); };
  const handleUndo = () => performAccountUndo(state, { notify, updateUI });
  const handleSave = createSaveHandler({ root, state, config, client, deps, notify, updateUI });
  const selectProfile = createProfileSelector({ root, state, resolveAvatarCdnUrl, updateUI });

  const fetchProfiles = async () => {
    if (!state.session?.accessToken || !client?.getProfiles) return [];
    const profiles = await client.getProfiles({
      apiUrl: config.NUVIO_API_URL, apikey: config.NUVIO_PUBLIC_ANON_KEY,
      accessToken: state.session.accessToken, userId: state.session.userId,
    });
    state.profiles = profiles;
    if (!state.selectedProfileId && profiles.length > 0) {
      state.selectedProfileId = profiles[0].profile_index ?? profiles[0].id;
    }
    return profiles;
  };

  const init = async () => {
    setupScrollableTabs(root);
    setupProfilePopover({ root, onToggle: () => renderProfilePopover({
      root, state, resolveAvatarCdnUrl, onSelectProfile: selectProfile,
      onEditProfile: (id) => openEditProfileModal({ root, state, profileId: id }),
    }) });
    setupProfileModals({
      root, state, config, client, showToast: notify,
      refreshProfiles: async () => {
        await fetchProfiles();
        renderProfilePopover({ root, state, resolveAvatarCdnUrl, onSelectProfile: selectProfile });
      },
      selectProfile,
    });

    bindHeaderButtons(root, { handleSave, handleUndo, state, notify });
    bindTabNavigation(root, state);
    await initSessionView({ root, state, fetchProfiles, selectProfile, resolveAvatarCdnUrl, notify });
  };

  return { init, selectProfile, fetchProfiles, handleSave, handleUndo, updateUI, state };
}

function bindHeaderButtons(root, { handleSave, handleUndo, state, notify }) {
  root.getElementById?.('btnAccountSave')?.addEventListener('click', handleSave);
  root.getElementById?.('btnAccountUndo')?.addEventListener('click', handleUndo);
  root.getElementById?.('btnAccountLogout')?.addEventListener('click', () => {
    clearSession(state);
    root.getElementById?.('accountDashboardView')?.classList.add('hidden');
    root.getElementById?.('accountAuthView')?.classList.remove('hidden');
    notify('Sesión cerrada correctamente.', 'info');
  });
}

function bindTabNavigation(root, state) {
  root.querySelectorAll?.('.account-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset?.section;
      if (section) {
        switchSection(section, { root, state, updateUndoButton: () => updateUndoButtonUI(root, state) });
      }
    });
  });
}
