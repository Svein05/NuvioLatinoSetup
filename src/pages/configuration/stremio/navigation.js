const ROUTE = [1, 'connections', 3, 4, 5, 6, 7];
const TITLES = { 1: 'Cuenta Stremio', 3: 'Mini Stremio', 4: 'API Keys', 5: 'Pósters', 6: 'Addons', 7: 'Aplicar configuración' };

function renderDrawer(root, stremio) {
  root.querySelector('#drawer-step-2').hidden = stremio;
  for (const [step, title] of Object.entries(TITLES)) {
    const item = root.querySelector(`#drawer-step-${step}`);
    const label = item.querySelector('.text-left');
    label.dataset.originalMarkup ??= label.innerHTML;
    if (stremio) {
      label.textContent = title;
      item.querySelector('.drawer-badge').textContent = String(ROUTE.indexOf(Number(step)) + 1);
    } else label.innerHTML = label.dataset.originalMarkup;
  }
  if (stremio) root.querySelector('#drawer-connections .drawer-badge').textContent = '2';
}

export function attachPlatformNavigation({ root, state, updateUI, choose, refresh }) {
  const target = () => state.targetApplication === 'stremio';
  const current = () => state.connectionsStage ? 'connections' : state.currentStep;
  const show = step => {
    state.connectionsCancel?.();
    state.connectionsStage = step === 'connections';
    state.currentStep = step === 'connections' ? 1 : step;
    if (state.connectionsStage) state.connectionsOpened?.();
    if (typeof step === 'number') state.unlockStep(step);
    updateUI();
    const view = state.connectionsStage ? root.querySelector('#connectionsStep') : root.querySelector('.step-content.active');
    view?.querySelector('h2')?.focus({ preventScroll: true });
  };
  const renderButtons = () => {
    const next = root.querySelector('#btnNext');
    const back = root.querySelector('#btnBack');
    root.querySelector('#btnOpenIndex').hidden = !state.targetApplication;
    if (!state.targetApplication) { next.style.display = 'none'; back.style.visibility = 'hidden'; return; }
    if (!target()) { if (state.currentStep === 1 && !state.migrationStage) back.style.visibility = 'visible'; return; }
    next.style.display = current() === 7 ? 'none' : 'flex';
    next.disabled = Boolean(state.stremio.running) || (!state.connectionsStage && !state.validateStep(state.currentStep).valid);
    back.style.visibility = 'visible';
    back.disabled = Boolean(state.stremio.running);
  };
  state.platformNavigation = {
    change(delta) {
      if (!state.targetApplication || state.stremio.running) return true;
      if (!target()) { if (delta < 0 && state.currentStep === 1 && !state.migrationStage && !state.migrationEnabled) { choose(null); return true; } return false; }
      if (state.stremio.pendingWrite) { if (delta < 0) show(1); return true; }
      if (current() === 1 && delta < 0) { choose(null); return true; }
      if (delta > 0 && !state.connectionsStage && !state.validateStep(state.currentStep).valid) return true;
      const next = ROUTE[ROUTE.indexOf(current()) + delta];
      if (next !== undefined) show(next);
      return true;
    },
    go(step) {
      if (!state.targetApplication || state.stremio.running) return true;
      if (!target()) return false;
      if (state.stremio.pendingWrite && ![1, 7].includes(step)) return true;
      const index = ROUTE.indexOf(step);
      if (index >= 0 && (step <= state.maxUnlockedStep || step === 1 || (step === 'connections' && state.validateStep(1).valid))) show(step);
      return true;
    },
    renderButtons,
    render() {
      root.querySelector('#platformChoice').classList.toggle('active', !state.targetApplication);
      if (!state.targetApplication) root.querySelectorAll('.step-content:not(#platformChoice)').forEach(node => node.classList.remove('active'));
      root.querySelector('#stremioLoginStep').classList.toggle('active', target() && !state.connectionsStage && state.currentStep === 1);
      root.querySelector('#stremioCatalogStep').classList.toggle('active', target() && !state.connectionsStage && state.currentStep === 3);
      root.querySelector('#stremioFinishStep').classList.toggle('active', target() && !state.connectionsStage && state.currentStep === 7);
      if (target()) {
        for (const step of [1, 2, 3, 7]) root.querySelector(`#step-${step}`).classList.remove('active');
        for (const id of ['stepCounter', 'drawerStepCounter']) root.querySelector(`#${id}`).textContent = `Paso ${ROUTE.indexOf(current()) + 1} de ${ROUTE.length}`;
      }
      renderDrawer(root, target());
      refresh(); renderButtons();
    },
  };
  return { show, dispose: () => { delete state.platformNavigation; } };
}
