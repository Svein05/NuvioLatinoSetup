import { createLifetime } from '../../../shared/ui/lifetime.js';
import { keyFields, readKeySnapshot, renderKeyResult, renderKeySummary, invalidateKeySummary, renderKeyBusy } from './api-keys-view.js';

const instances = new WeakMap();

async function verifyKeys({ actions, state, root, lifetime }) {
  if (state.pending) return;
  const pending = new AbortController();
  state.pending = pending;
  const revision = state.revision;
  const snapshot = readKeySnapshot(root);
  actions.onSnapshot(snapshot);
  renderKeyBusy(true, root);
  try {
    const result = await actions.verify(snapshot, AbortSignal.any([pending.signal, lifetime.signal]));
    if (revision !== state.revision || lifetime.signal.aborted) return;
    for (const [provider, verdict] of Object.entries(result.providers)) renderKeyResult(provider, verdict, root);
    renderKeySummary(result, root);
    actions.onValidated(result);
    actions.notify(result.valid ? '✓ Claves obligatorias verificadas' : 'No se pudieron verificar las claves obligatorias.', result.valid ? 'success' : 'warning');
  } catch {
    if (revision === state.revision && !lifetime.signal.aborted) actions.notify('No se pudo completar la verificación. Reintenta.', 'warning');
  } finally {
    if (state.pending === pending) {
      state.pending = null;
      if (!lifetime.signal.aborted) renderKeyBusy(false, root);
    }
  }
}

/** Capture and invalidate revisions so edited keys never inherit an old verification result. */
export function mountApiKeysStep(actions, root = document) {
  instances.get(root)?.();
  const lifetime = createLifetime();
  const state = { revision: 0, pending: null };
  lifetime.add(() => state.pending?.abort());
  function edited() {
    state.revision++;
    state.pending?.abort();
    actions.onEdit(readKeySnapshot(root));
    invalidateKeySummary(root);
  }
  for (const [key, id] of Object.entries(keyFields)) {
    const input = root.querySelector(`#${id}`);
    if (input) input.value = actions.initial.keys[key] || (key === 'rpdb' ? 't0-free-rpdb' : '');
    lifetime.on(input, 'input', () => { renderKeyResult(key, { status: 'pending', valid: false }, root); edited(); });
    lifetime.on(input, 'change', edited);
    if (actions.initial.statusMap[key]) renderKeyResult(key, { status: 'valid', valid: true }, root);
  }
  const ai = root.querySelector('#toggleSearchAi');
  if (ai) ai.checked = actions.initial.aiEnabled;
  const renderAi = () => root.querySelector('#aiKeysContainer')?.classList.toggle('hidden', !ai?.checked);
  renderAi();
  lifetime.on(ai, 'change', () => { renderAi(); edited(); });
  lifetime.on(root.querySelector('#btnValidateApiKeys'), 'click', () => verifyKeys({ actions, state, root, lifetime }));
  const dispose = () => { lifetime.dispose(); if (instances.get(root) === dispose) instances.delete(root); };
  instances.set(root, dispose);
  return dispose;
}
