export function saveWizardSession(state, store) {
  if (!state.nuvioAuth?.isAuthenticated || !state.nuvioAuth?.accessToken) return;
  store.write({
    auth: state.nuvioAuth,
    profiles: state.profiles,
    selectedProfileId: state.selectedProfileId,
    selectedProfileName: state.selectedProfileName,
    newlyCreatedProfileIds: Array.from(state.newlyCreatedProfileIds || []),
    currentStep: state.currentStep,
    maxUnlockedStep: state.maxUnlockedStep,
  });
}

export function restoreWizardSession(state, store, { setAuthBadge, updateProfileWarning } = {}) {
  try {
    if (typeof sessionStorage === 'undefined') return;
    const data = store.read();
    if (data?.auth?.isAuthenticated) {
      state.nuvioAuth = { ...state.nuvioAuth, ...data.auth };
      state.profiles = data.profiles || [];
      state.selectedProfileId = data.selectedProfileId || null;
      state.selectedProfileName = data.selectedProfileName || '';
      if (Array.isArray(data.newlyCreatedProfileIds)) {
        state.newlyCreatedProfileIds = new Set(data.newlyCreatedProfileIds.map(String));
      }
      state.maxUnlockedStep = Math.max(state.maxUnlockedStep, data.maxUnlockedStep || 2);
      state.currentStep = Math.max(state.currentStep, data.currentStep || 2);
      setAuthBadge?.(true);
      if (state.profiles.length > 0 && !state.selectedProfileId) {
        state.selectedProfileId = state.profiles[0].id;
        state.selectedProfileName = state.profiles[0].name || state.profiles[0].title || 'Principal';
        state.unlockStep(3);
      }
      updateProfileWarning?.(state.selectedProfileId, state.selectedProfileName);
    }
  } catch {
    // ignore
  }
}

export function setAuthBadgeUI(root = document, connected) {
  const badge = root.querySelector?.('#authStatusBadge');
  if (!badge) return;
  if (connected) {
    badge.className = 'text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5';
    badge.innerHTML = '<i class="fa-solid fa-check"></i> Conectado';
  } else {
    badge.className = 'text-xs bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5';
    badge.innerHTML = '<i class="fa-solid fa-circle text-[8px]"></i> No autenticado';
  }
}
