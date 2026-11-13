/** Optional view before stable collection step 3; existing persisted step IDs stay valid. */
export function attachConnectionsNavigation({ root, state, lifetime, updateUI }) {
  const item = root.createElement('button');
  item.id = 'drawer-connections';
  item.type = 'button';
  item.className = 'drawer-step-item locked';
  item.innerHTML = '<span class="drawer-badge">3</span><span class="text-left text-xs">Conexiones<span class="block text-[10px] text-white/50">Opcional</span></span>';
  root.querySelector('#drawer-step-3').before(item);
  const previous = () => state.targetApplication === 'stremio' || state.isManualMode ? 1 : 2;
  const show = () => {
    if (state.currentStep < previous() || !state.validateStep(previous()).valid) return false;
    state.connectionsStage = true;
    state.currentStep = previous();
    state.connectionsOpened?.();
    updateUI();
    root.querySelector('#connectionsTitle').focus({ preventScroll: true });
    return true;
  };
  const leave = target => {
    state.connectionsCancel?.();
    state.connectionsStage = false;
    state.unlockStep(target);
    state.currentStep = target;
    updateUI();
  };
  lifetime.on(item, 'click', () => { if (state.targetApplication === 'stremio') state.platformNavigation?.go('connections'); else show(); root.querySelector('#btnCloseIndex')?.click(); });
  state.connectionsNavigation = {
    show,
    change(delta) {
      if (state.migrationStage) return false;
      if (state.connectionsStage) { leave(delta < 0 ? previous() : 3); return true; }
      if ((state.currentStep === previous() && delta > 0) || (state.currentStep === 3 && delta < 0)) return show();
      return false;
    },
    go(target) {
      if (state.connectionsStage) { if (target <= 3 && !(state.isManualMode && target === 2)) leave(target); return true; }
      if (!state.migrationStage && state.currentStep === previous() && target === 3) return show();
      return false;
    },
  };
  lifetime.add(() => { item.remove(); delete state.connectionsNavigation; delete state.connectionsStage; });
}

export function renderConnectionsNavigation(root, state) {
  const active = Boolean(state.connectionsStage);
  root.querySelector('#connectionsStep')?.classList.toggle('active', active);
  const item = root.querySelector('#drawer-connections');
  if (item) {
    const previous = state.targetApplication === 'stremio' || state.isManualMode ? 1 : 2;
    const unlocked = state.currentStep >= previous && state.validateStep(previous).valid;
    item.disabled = !unlocked;
    item.className = `drawer-step-item ${active ? 'active' : unlocked ? 'completed' : 'locked'}`;
    item.querySelector('.drawer-badge').textContent = String(3 + (state.migrationEnabled ? 2 : 0));
  }
  if (active) {
    root.querySelector(`#step-${state.currentStep}`)?.classList.remove('active');
    root.querySelector(`#drawer-step-${state.currentStep}`)?.classList.remove('active');
  }
}
