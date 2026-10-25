import { createDrawerSize } from './drawer-size.js';
import { createLifetime } from '../../shared/ui/lifetime.js';

function setupDrawer({ lifetime, root }) {
  const drawer = root.querySelector?.('#indexDrawer');
  const overlay = root.querySelector?.('#indexDrawerOverlay');
  const size = createDrawerSize({ root, drawer, lifetime });

  const openDrawer = () => {
    size.setOpen(true);
    drawer?.classList.add('open');
    overlay?.classList.add('open');
  };

  const closeDrawer = () => {
    size.setOpen(false);
    drawer?.classList.remove('open');
    overlay?.classList.remove('open');
  };

  lifetime.on(root.querySelector?.('#btnOpenIndex'), 'click', openDrawer);
  lifetime.on(root.querySelector?.('#btnCloseIndex'), 'click', closeDrawer);
  if (overlay) lifetime.on(overlay, 'click', closeDrawer);
  const doc = root.ownerDocument || (typeof document !== 'undefined' ? document : null);
  if (doc) lifetime.on(doc, 'keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  return { openDrawer, closeDrawer };
}

function handleGoToStep({ targetStep, state, actions, closeDrawer }) {
  if (targetStep === state.currentStep) { closeDrawer(); return; }
  if (state.isManualMode && targetStep === 2) { actions.notify?.('En modo sin cuenta, el paso 2 de perfiles está omitido.', 'info'); return; }

  if (targetStep < state.currentStep) {
    state.currentStep = targetStep;
    closeDrawer();
    actions.onStepChanged?.();
    return;
  }

  if (state.isManualMode && state.currentStep === 1 && targetStep === 3) {
    state.unlockStep(3);
    state.currentStep = 3;
    closeDrawer();
    actions.onStepChanged?.();
    return;
  }

  if (targetStep > state.currentStep + 1) {
    actions.notify?.('Solo puedes avanzar un paso a la vez tras completar el actual.', 'warning');
    return;
  }

  const val = state.validateStep(state.currentStep);
  if (!val.valid) { actions.notify?.(val.error, 'warning'); return; }

  state.unlockStep(targetStep);
  state.currentStep = targetStep;
  closeDrawer();
  actions.onStepChanged?.();
}

function handleChangeStep({ delta, state, actions }) {
  if (delta < 0) {
    if (state.isManualMode && state.currentStep === 3) { state.currentStep = 1; actions.onStepChanged?.(); return; }
    const prev = state.currentStep + delta;
    if (prev >= 1) { state.currentStep = prev; actions.onStepChanged?.(); }
    return;
  }

  const val = state.validateStep(state.currentStep);
  if (!val.valid) { actions.notify?.(val.error, 'warning'); return; }

  if (state.isManualMode && state.currentStep === 1) {
    state.unlockStep(3);
    state.currentStep = 3;
    actions.onStepChanged?.();
    return;
  }

  const next = state.currentStep + delta;
  if (next > state.totalSteps) return;

  state.unlockStep(next);
  state.currentStep = next;
  actions.onStepChanged?.();
}

export function updateNavigationButtons(root, state) {
  const btnNext = root.querySelector?.('#btnNext');
  if (!btnNext) return;

  const val = state.validateStep(state.currentStep);
  if (val.valid) {
    btnNext.disabled = false;
    btnNext.className = 'lat-capsule-btn solid text-xs py-1.5 px-4 shadow-[var(--shadow-lift)] cursor-pointer flex items-center gap-1.5';
    btnNext.title = 'Avanzar al siguiente paso';
  } else {
    btnNext.disabled = true;
    btnNext.className = 'lat-capsule-btn glass opacity-40 text-xs py-1.5 px-4 cursor-not-allowed flex items-center gap-1.5';
    btnNext.title = val.error || 'Completa este paso para continuar';
  }
}

function updateDrawerItems(root, state) {
  const { currentStep, totalSteps, maxUnlockedStep } = state;
  for (let i = 1; i <= totalSteps; i++) {
    const item = root.querySelector?.(`#drawer-step-${i}`);
    if (!item) continue;

    if (state.isManualMode && i === 2) {
      item.className = 'drawer-step-item opacity-40 cursor-not-allowed';
      item.title = 'Paso omitido en modo manual (sin cuenta de Nuvio)';
      const statusIcon = item.querySelector?.('.drawer-status-icon');
      if (statusIcon) statusIcon.className = 'fa-solid fa-ban text-slate-500 text-[10px] drawer-status-icon';
      continue;
    }

    const isCurrent = (i === currentStep);
    const isUnlocked = (i <= maxUnlockedStep);
    const icon = item.querySelector?.('.drawer-status-icon');

    if (isCurrent) {
      item.className = 'drawer-step-item active';
      if (icon) icon.className = 'drawer-status-icon hidden';
    } else if (i < currentStep || isUnlocked) {
      item.className = 'drawer-step-item completed';
      if (icon) icon.className = i < currentStep ? 'fa-solid fa-circle-check text-emerald-400 text-xs drawer-status-icon' : 'drawer-status-icon hidden';
    } else {
      item.className = 'drawer-step-item locked';
      if (icon) icon.className = 'fa-solid fa-lock text-slate-500 text-[10px] drawer-status-icon';
    }
  }
}

export function updateStepperUI(root, state) {
  const { currentStep, totalSteps } = state;

  for (let i = 1; i <= totalSteps; i++) {
    root.querySelector?.(`#step-${i}`)?.classList.toggle('active', i === currentStep);
  }

  updateDrawerItems(root, state);

  const btnBack = root.querySelector?.('#btnBack');
  const btnNext = root.querySelector?.('#btnNext');
  const stepCounter = root.querySelector?.('#stepCounter');
  const drawerCounter = root.querySelector?.('#drawerStepCounter');

  if (btnBack) btnBack.style.visibility = (currentStep === 1) ? 'hidden' : 'visible';
  if (btnNext) btnNext.style.display = (currentStep === totalSteps) ? 'none' : 'flex';
  if (stepCounter) stepCounter.innerText = `Paso ${currentStep} de ${totalSteps}`;
  if (drawerCounter) drawerCounter.innerText = `Paso ${currentStep} de ${totalSteps}`;

  updateNavigationButtons(root, state);
  return currentStep;
}

export function setupStepperNavigation({ state, actions, root = document }) {
  const lifetime = createLifetime();
  const { openDrawer, closeDrawer } = setupDrawer({ lifetime, root });

  const goToStep = target => handleGoToStep({ targetStep: target, state, actions, closeDrawer });
  const changeStep = delta => handleChangeStep({ delta, state, actions });

  root.querySelectorAll?.('[data-target-step]').forEach(button => lifetime.on(button, 'click', () => {
    goToStep(Number(button.dataset.targetStep));
  }));
  root.querySelectorAll?.('[data-step-delta]').forEach(button => lifetime.on(button, 'click', () => {
    changeStep(Number(button.dataset.stepDelta));
  }));

  return {
    openDrawer,
    closeDrawer,
    goToStep,
    changeStep,
    updateUI: () => updateStepperUI(root, state),
    updateNavigationButtons: () => updateNavigationButtons(root, state),
    dispose: () => lifetime.dispose(),
  };
}
