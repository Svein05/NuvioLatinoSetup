import { createLifetime } from '../../../shared/ui/lifetime.js';
import { attachMigrationNavigation } from './navigation.js';
import { renderMigrationReview, renderMigrationSummary, synchronizeMigrationSelection } from './view.js';

function clearMigrationPassword(modal) {
  const input = modal.querySelector('#migrationPassword');
  input.value = '';
  input.type = 'password';
  const toggle = modal.querySelector('#btnToggleMigrationPassword');
  toggle.title = 'Mostrar contraseña';
  toggle.setAttribute('aria-label', toggle.title);
  toggle.setAttribute('aria-pressed', 'false');
  toggle.querySelector('i').className = 'fa-solid fa-eye text-xs pointer-events-none';
}

function createMigrationReader({ modal, readSnapshot, show, accept }) {
  let request;
  const password = modal.querySelector('#migrationPassword');
  const submit = modal.querySelector('[data-migration-submit]');
  const error = modal.querySelector('[data-migration-error]');
  const run = async event => {
    event.preventDefault();
    if (request && !request.signal.aborted) return;
    const current = request = new AbortController();
    submit.disabled = true;
    submit.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Leyendo tu cuenta...';
    accept(null);
    error.classList.add('hidden');
    try {
      const reading = readSnapshot({ email: modal.querySelector('#migrationEmail').value.trim(), password: password.value, signal: current.signal });
      clearMigrationPassword(modal);
      const snapshot = await reading;
      if (current.signal.aborted || request !== current) return;
      accept(snapshot);
      renderMigrationReview(modal, snapshot);
      show('review');
    } catch (failure) {
      if (current.signal.aborted || request !== current) return;
      error.textContent = failure instanceof TypeError ? 'No se pudo conectar con Stremio. Revisa tu conexión e inténtalo otra vez.' : failure.message;
      error.classList.remove('hidden');
    } finally {
      if (request === current) {
        submit.disabled = false;
        submit.textContent = 'Leer mi cuenta de Stremio';
        request = null;
      }
    }
  };
  return { run, cancel: () => { request?.abort(); clearMigrationPassword(modal); } };
}

function connectMigrationActions({ modal, state, lifetime, controls }) {
  lifetime.on(modal.ownerDocument.querySelector('.lat-nav-tab[aria-label="Asistente"]'), 'click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (!state.migrationEnabled && !state.migrationNeedsReconnect && !state.migration) return;
    event.preventDefault();
    state.currentStep = 1;
    state.isManualMode = false;
    controls.skip();
    controls.flow.querySelector('form').reset();
    controls.flow.querySelector('[data-migration-error]').classList.add('hidden');
    modal.ownerDocument.querySelector('#nuvioEmail')?.focus();
  });
  lifetime.on(modal.ownerDocument.querySelector('#btnStartStremioMigration'), 'click', controls.actions.login);
  lifetime.on(controls.flow.querySelector('form'), 'submit', controls.reader.run);
  const dispatch = event => {
    const action = event.target.closest('[data-migration-action]')?.dataset.migrationAction;
    controls.actions[action]?.();
  };
  lifetime.on(modal, 'click', dispatch);
  lifetime.on(controls.flow, 'click', dispatch);
  lifetime.on(controls.flow, 'error', event => { if (event.target.matches?.('[data-migration-logo]')) event.target.remove(); }, { capture: true });
  lifetime.on(controls.flow, 'change', () => { synchronizeMigrationSelection(controls.flow, state); controls.updateUI(); });
}

function createDialogPresentation({ modal, flow, state, lifetime, updateUI }) {
  let animation;
  const show = panel => {
    modal.dataset.dialogRequired = String(panel === 'choice');
    modal.querySelector('#migrationTitle').textContent = panel === 'manual' ? '¿Continuar en modo manual?' : '¿Vienes de Stremio?';
    modal.querySelector('[data-manual-migration-warning]').hidden = !(state.migration || state.migrationNeedsReconnect);
    if (panel === 'login' || panel === 'review') {
      if (panel === 'review' && !state.migrationReviewReady) return;
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      state.migrationEnabled = true;
      state.migrationStage = panel;
      if (panel === 'review') synchronizeMigrationSelection(flow, state);
      modal.ownerDocument.querySelector('#btnStartStremioMigration').hidden = true;
      updateUI();
      flow.querySelector(`[data-migration-panel="${panel}"] input, [data-migration-panel="${panel}"] button`)?.focus();
      return;
    }
    modal.querySelectorAll('[data-migration-panel]').forEach(node => node.classList.toggle('hidden', node.dataset.migrationPanel !== panel));
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.querySelector(`[data-migration-panel="${panel}"] input, [data-migration-panel="${panel}"] button`)?.focus();
    animation?.cancel();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      animation = modal.firstElementChild.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 250, easing: 'ease-out' });
    }
  };
  lifetime.add(() => animation?.cancel());
  return show;
}

function createSummary(root) {
  const summary = root.createElement('section');
  summary.className = 'migration-summary';
  summary.hidden = true;
  (root.querySelector('#summaryAddonsStatus')?.closest('.lat-card') || root.querySelector('#step-7'))?.append(summary);
  return summary;
}

function refreshMigrationStatus(root, summary, state) {
  root.querySelector('#btnStartStremioMigration').hidden = Boolean(state.migrationEnabled || state.migration || state.migrationNeedsReconnect);
  renderMigrationSummary(summary, state);
}

export function mountMigration({ state, readSnapshot, saveSession, updateUI, root = document }) {
  const modal = root.querySelector('#modalStremioMigration');
  if (!modal) return () => {};
  const lifetime = createLifetime();
  let pending;
  let manual;
  const flow = root.querySelector('#stremioMigrationSteps');
  const error = flow.querySelector('[data-migration-error]');
  const summary = createSummary(root);
  const refresh = () => refreshMigrationStatus(root, summary, state);
  const show = createDialogPresentation({ modal, flow, state, lifetime, updateUI });
  const close = () => {
    reader.cancel();
    state.migrationStage = null;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    updateUI();
  };
  const skip = () => {
    state.migration = null;
    state.profileAddons = (state.profileAddons || []).filter(addon => !addon.migrationSource);
    state.hasLoadedAddonsForProfile = null;
    pending = null;
    state.migrationEnabled = false;
    state.migrationReviewReady = false;
    state.migrationNeedsReconnect = false;
    close();
    saveSession?.();
    refresh();
  };
  const reader = createMigrationReader({ modal: flow, readSnapshot, show, accept: value => { pending = value; state.migrationReviewReady = Boolean(value); updateUI(); } });
  const accept = () => {
    if (!pending) return;
    pending.selected = Object.fromEntries([...flow.querySelectorAll('[data-migration-category]')].map(input => [input.dataset.migrationCategory, input.checked]));
    if (!state.migrationSelectionReady) return;
    pending.addons.forEach((addon, index) => { addon.selected = flow.querySelector(`[data-migration-addon="${index}"]`).checked; });
    state.migration = pending;
    state.migrationNeedsReconnect = false;
    state.hasLoadedAddonsForProfile = null;
    saveSession?.();
    close();
    refresh();
  };
  connectMigrationActions({ modal, state, lifetime, controls: { flow, reader, skip, close, updateUI, actions: {
    login: () => show('login'), skip, accept, connect: close,
    manual: () => { const proceed = manual; skip(); proceed?.(); },
  } } });
  attachMigrationNavigation({ root, state, lifetime, actions: { show, accept } });
  state.requestMigrationManualMode = proceed => { manual = proceed; show('manual'); };
  lifetime.add(state.subscribe(refresh));
  lifetime.add(() => { close(); summary.remove(); delete state.requestMigrationManualMode; });
  if (state.migrationNeedsReconnect) {
    show('login');
    error.textContent = 'Vuelve a conectar Stremio para recuperar la importación pendiente.';
    error.classList.remove('hidden');
  } else if (!state.nuvioAuth?.isAuthenticated && state.currentStep === 1) show('choice');
  refresh();
  return () => lifetime.dispose();
}
