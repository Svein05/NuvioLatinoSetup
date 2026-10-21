import { accountState, loadSession, clearSession, updateSaveButtonUI } from './account-state.js';
import { updateUndoButtonUI } from './account-undo.js';
import { setupScrollableTabs, switchSection } from './tabs-navigation.js';
import { createLifetime } from '../../shared/ui/lifetime.js';
import { bindAccountAuthentication, showAccountSession } from './account-auth.js';
import { createAccountSections } from './account-sections.js';
import { createAccountProfiles } from './account-profiles.js';
import { createAccountActions } from './account-actions.js';
import { setupProfilePopover, setupProfileModals } from './sections/profiles.js';
import { bindProfileAvatarPicker } from './sections/profile-avatar-picker.js';
import { managePageDialogs } from '../../shared/ui/dialog-accessibility.js';

function setEditingLock(root, state) {
  root.querySelectorAll?.('.account-section-pane').forEach(pane => {
    pane.inert = Boolean(state.isSaving || state.isLoadingProfile);
  });
  const trigger = root.getElementById?.('btnAccountProfileTrigger');
  if (trigger) trigger.disabled = Boolean(state.isSaving);
}

function bindNavigation({ root, state, lifetime, activate, actions, logout }) {
  lifetime.on(root.getElementById('btnAccountSave'), 'click', actions.handleSave);
  lifetime.on(root.getElementById('btnAccountUndo'), 'click', actions.handleUndo);
  lifetime.on(root.getElementById('btnAccountLogout'), 'click', () => { if (!state.isSaving) logout(); });
  root.querySelectorAll('.account-nav-btn').forEach(button => lifetime.on(button, 'click', () => {
    if (!state.isSaving) activate(button.dataset.section);
  }));
}

function initializeAccountUI(context) {
  const { root, state, lifetime, profiles, deps, notify, actions, activate, logout } = context;
  setupScrollableTabs(root);
  setupProfilePopover({ root, onToggle: profiles.render });
  setupProfileModals({ root, state, client: deps.client, config: deps.config, showToast: notify,
    refreshProfiles: async () => { await profiles.fetchProfiles(); profiles.render(); }, selectProfile: profiles.select });
  bindProfileAvatarPicker({ root, services: deps.services, lifetime, notify });
  lifetime.add(managePageDialogs(root));
  bindNavigation({ root, state, lifetime, activate, actions, logout });
  bindAccountAuthentication({ root, state, lifetime, actions: { notify,
    tryCollaborator: deps.services?.tryCollaborator, onConnected: profiles.connected,
    login: credentials => deps.client.login({ apiUrl: deps.config.NUVIO_API_URL,
      apikey: deps.config.NUVIO_PUBLIC_ANON_KEY, ...credentials }),
  } });
}

export function createAccountController(deps = {}) {
  const root = deps.root || (typeof document !== 'undefined' ? document : null);
  const { state = accountState, config = {}, client, services = {},
    resolveAvatarCdnUrl = u => u } = deps;
  const lifetime = createLifetime();
  const notify = deps.renderToast || deps.showToast || (() => {});
  let sections;
  let started = false;
  const getSections = () => sections;
  const updateUI = () => {
    updateSaveButtonUI(root, state); updateUndoButtonUI(root, state); setEditingLock(root, state);
  };
  const activate = section => switchSection(section, { root, state,
    onSectionActivated: () => sections?.render(), updateUndoButton: updateUI,
  });
  const profiles = createAccountProfiles({ root, state, client, config, resolveAvatarCdnUrl, activate, getSections });
  const actions = createAccountActions({ root, state, deps, notify, updateUI, getSections });
  const logout = () => {
    sections.cancel(); clearSession(state); showAccountSession(root, false);
    notify('Sesión cerrada correctamente.', 'info');
  };
  async function init() {
    if (started) return;
    started = true;
    const setupPasswordToggles = () => deps.setupPasswordToggles?.(root);
    const disposePasswords = setupPasswordToggles();
    if (disposePasswords) lifetime.add(disposePasswords);
    sections = createAccountSections({ root, state, services, client, config, lifetime,
      notify, updateUI, setupPasswordToggles });
    initializeAccountUI({ root, state, lifetime, profiles, deps: { ...deps, config }, notify, actions, activate, logout });
    sections.avatars.refresh();
    const session = loadSession(state);
    showAccountSession(root, Boolean(session?.accessToken));
    if (session?.accessToken) await profiles.connected()
      .catch(error => notify(`Error al cargar cuenta: ${error.message}`, 'error'));
    updateUI();
  }
  return { init, selectProfile: profiles.select, fetchProfiles: profiles.fetchProfiles, ...actions, updateUI, state,
    dispose: () => { sections?.cancel(); lifetime.dispose(); } };
}
