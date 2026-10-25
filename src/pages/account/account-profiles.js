import { showProfilesFeedback } from './profiles-feedback.js';
import { createInitialAccountState } from './account-state.js';
import { renderProfilePopover, showSelectProfilePrompt, openEditProfileModal } from './sections/profiles.js';

export function updateProfileHeader(root, state, resolveAvatar) {
  const profile = state.profiles.find(p => Number(p.profile_index ?? p.id) === Number(state.selectedProfileId));
  const avatar = root.getElementById?.('sidebarActiveAvatar');
  const name = root.getElementById?.('sidebarActiveName');
  if (profile && avatar) avatar.src = resolveAvatar(profile.avatar_url) || '/assets/icons/avatar-placeholder.svg';
  if (profile && name) name.textContent = profile.name;
}

export function createAccountProfiles({ root, state, client, config, resolveAvatarCdnUrl, activate, getSections }) {
  const render = () => renderProfilePopover({ root, state, resolveAvatarCdnUrl, onSelectProfile: select,
    onEditProfile: id => { if (!state.isSaving) openEditProfileModal({ root, state, profileId: id }); },
  });
  async function fetchProfiles() {
    if (!state.session?.accessToken || !client?.getProfiles) return [];
    const session = state.session;
    showProfilesFeedback(root, { loading: true });
    try {
    const profiles = await client.getProfiles({ apiUrl: config.NUVIO_API_URL,
      apikey: config.NUVIO_PUBLIC_ANON_KEY, ...session });
    if (state.session !== session) return [];
    state.profiles = profiles;
    if (!state.selectedProfileId && profiles.length) state.selectedProfileId = profiles[0].profile_index ?? profiles[0].id;
    showProfilesFeedback(root, { empty: !profiles.length });
    return profiles;
    } catch (error) {
      if (state.session === session) showProfilesFeedback(root, { error: 'No se pudieron cargar los perfiles.', retry: () => { void connected().catch(() => {}); } });
      throw error;
    }
  }
  async function select(id) {
    if (state.isSaving) return;
    state.selectedProfileId = Number(id) || id;
    state.hasChosenProfileInSession = true;
    const profile = state.profiles.find(p => Number(p.profile_index ?? p.id) === Number(id));
    state.selectedAvatarUrl = profile?.avatar_url || null;
    state.originalAvatarUrl = state.selectedAvatarUrl;
    state.dirty = { aiometadata: false, settings: false, avatar: false, addons: false };
    state.addonHistory = [];
    const defaults = createInitialAccountState();
    state.aioPassword = defaults.aioPassword;
    state.originalAioConfig = null;
    state.posterEngine = defaults.posterEngine; state.originalPosterEngine = defaults.posterEngine;
    state.customPosterUrl = ''; state.originalCustomPosterUrl = '';
    state.overviewData = createInitialAccountState().overviewData;
    updateProfileHeader(root, state, resolveAvatarCdnUrl); render();
    activate(state.activeSection || 'overview');
    await getSections()?.load(state.selectedProfileId);
  }
  async function connected() {
    await fetchProfiles(); render();
    if (state.profiles.length) {
      showSelectProfilePrompt({ root, state, resolveAvatarCdnUrl, onSelectProfile: select });
      await select(state.profiles[0].profile_index ?? state.profiles[0].id);
    }
  }
  return { render, select, connected, fetchProfiles };
}
