function applyAuthenticatedState({ state, auth, profiles, email, anonKey }) {
  state.isManualMode = false;
  Object.assign(state.nuvioAuth, {
    accessToken: auth.accessToken,
    userId: auth.userId,
    expiresAt: auth.expiresAt,
    isAuthenticated: true,
    apikey: anonKey,
    email,
    password: '',
  });
  state.profiles = profiles;
  if (profiles.length) {
    state.selectedProfileId = profiles[0].id;
    state.selectedProfileName = profiles[0].name || profiles[0].title || 'Principal';
    state.unlockStep(3);
  }
  state.unlockStep(2);
}

function handleManualMode(state, notify) {
  state.enableManualMode();
  const badge = document.getElementById('authStatusBadge');
  if (badge) {
    badge.className = 'text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5';
    badge.innerHTML = '<i class="fa-solid fa-user-slash text-[10px]"></i> Modo Manual (Sin cuenta)';
  }
  notify?.('Continuando en modo manual sin cuenta de Nuvio.', 'info');
}

export function createAuthStepMountOptions({
  state,
  client,
  config,
  authenticateWizard,
  notify,
  saveSession,
  setAuthBadge,
  renderProfiles,
  updateUI,
  updateNavigationButtons,
}) {
  return {
    authenticate: ({ mode, credentials, signal }) => authenticateWizard({
      mode,
      credentials,
      client,
      context: { apiUrl: config.apiUrl, apikey: config.anonKey, signal },
    }),
    onCredentials: ({ email, password }) => {
      state.nuvioAuth.email = email;
      state.nuvioAuth.password = password;
      updateNavigationButtons?.();
    },
    onAuthenticated: ({ auth, profiles, email }) => {
      applyAuthenticatedState({ state, auth, profiles, email, anonKey: config.anonKey });
      setAuthBadge?.(true);
      saveSession?.();
    },
    onContinue: destination => {
      state.currentStep = destination === 'manual' ? 3 : 2;
      if (destination === 'manual') state.unlockStep(3);
      else renderProfiles?.();
      updateUI?.();
    },
    onManual: () => handleManualMode(state, notify),
    notify: (message, type) => notify?.(message, type),
    onFailure: () => setAuthBadge?.(false),
  };
}
