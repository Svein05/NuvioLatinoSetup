/** Optional preparation steps use a separate route, preserving existing setup identities. */
export function renderMigrationNavigation(root, state) {
  const enabled = Boolean(state.migrationEnabled);
  const stage = state.migrationStage;
  for (const [index, name] of ['login', 'review'].entries()) {
    root.querySelector(`[data-migration-panel="${name}"]`)?.classList.toggle('active', stage === name);
    const item = root.querySelector(`[data-migration-route="${name}"]`);
    if (item) {
      item.hidden = !enabled;
      item.className = `drawer-step-item ${stage === name ? 'active' : state.migrationReviewReady ? 'completed' : 'locked'}`;
      item.disabled = name === 'review' && !state.migrationReviewReady;
      item.querySelector('.drawer-badge').textContent = String(index + 1);
    }
  }
  for (let i = 1; i <= state.totalSteps; i++) {
    if (stage) root.querySelector(`#step-${i}`)?.classList.remove('active');
    if (stage) root.querySelector(`#drawer-step-${i}`)?.classList.remove('active');
    const badge = root.querySelector(`#drawer-step-${i} .drawer-badge`);
    if (badge) badge.textContent = String(i + (enabled ? 2 : 0));
  }
  const index = stage ? (stage === 'login' ? 1 : 2) : state.currentStep + (enabled ? 2 : 0);
  for (const id of ['stepCounter', 'drawerStepCounter']) {
    const counter = root.querySelector(`#${id}`);
    if (counter) counter.textContent = `Paso ${index} de ${state.totalSteps + (enabled ? 2 : 0)}`;
  }
  if (stage || (enabled && state.currentStep === 1)) {
    root.querySelector('#btnBack').style.visibility = stage === 'login' ? 'hidden' : 'visible';
  }
  if (stage) root.querySelector('#btnNext').style.display = 'flex';
}

export function attachMigrationNavigation({ root, state, lifetime, actions }) {
  const list = root.querySelector('#drawerStepList');
  const items = ['login', 'review'].map((name, index) => {
    const item = root.createElement('button');
    item.type = 'button';
    item.dataset.migrationRoute = name;
    item.innerHTML = `<span class="drawer-badge">${index + 1}</span><span class="text-left text-xs">${index ? 'Revisar importación' : 'Cuenta Stremio'}</span>`;
    lifetime.on(item, 'click', () => {
      actions.show(name);
      root.querySelector('#btnCloseIndex')?.click();
    });
    return item;
  });
  list.prepend(...items);
  state.migrationNavigation = {
    change(delta) {
      if (state.migrationStage === 'login') return true;
      if (state.migrationStage === 'review') { if (delta < 0) actions.show('login'); else actions.accept(); return true; }
      if (state.migrationEnabled && state.currentStep === 1 && delta < 0) { actions.show('review'); return true; }
      return false;
    },
    go(target) {
      if (!state.migrationStage) return false;
      if (target === 1 && state.migrationStage === 'review') actions.accept();
      return true;
    },
  };
  lifetime.add(() => { items.forEach(item => item.remove()); delete state.migrationNavigation; });
}
