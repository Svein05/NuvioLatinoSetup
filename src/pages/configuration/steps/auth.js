import { createLifetime } from '../../../shared/ui/lifetime.js';
import { validateCredentials } from '../../../features/auth/index.js';
import { authElements, renderAuthMode, renderAuthBusy, renderPasswordMatch } from './auth-view.js';

const instances = new WeakMap();

function readCredentials(elements) {
  return { email: elements.email?.value.trim(), password: elements.password?.value, confirmation: elements.confirmation?.value };
}

async function submitAuthentication({ state, elements, actions, lifetime, root }) {
  if (state.busy) return;
  const credentials = readCredentials(elements);
  const invalid = validateCredentials(credentials, state.mode);
  if (invalid) { actions.notify(invalid.message, 'warning'); elements[invalid.field]?.focus(); return; }
  const mode = state.mode;
  state.busy = true;
  renderAuthBusy(elements, mode, true);
  try {
    const result = await actions.authenticate({ mode, credentials, signal: lifetime.signal });
    if (lifetime.signal.aborted) return;
    actions.onAuthenticated(result);
    actions.notify(mode === 'signup' ? '✓ ¡Cuenta creada con éxito! Bienvenido a Nuvio.' : '✓ ¡Sesión iniciada con éxito! Perfiles sincronizados.', 'success');
    result.warnings.forEach(message => actions.notify(message, 'warning'));
    lifetime.timeout(() => actions.onContinue('profiles'), 600);
  } catch (error) {
    if (lifetime.signal.aborted) return;
    actions.notify(mode === 'signup' ? error.message : `Error al conectar: ${error.message}`, 'error');
    actions.onFailure();
    if (mode === 'signup' && /iniciar sesión/i.test(error.message)) { state.mode = 'login'; renderAuthMode(elements, 'login', root); }
  } finally { state.busy = false; if (!lifetime.signal.aborted) renderAuthBusy(elements, mode, false); }
}

/** Page-local form controller: inputs emit actions; it owns no account data or network adapter. */
export function mountAuthStep(actions, root = document) {
  instances.get(root)?.();
  const lifetime = createLifetime();
  const elements = authElements(root);
  const state = { mode: 'login', busy: false };
  renderAuthMode(elements, state.mode, root);
  const submit = () => submitAuthentication({ state, elements, actions, lifetime, root });
  for (const mode of ['login', 'signup']) {
    lifetime.on(elements[`${mode}Tab`], 'click', () => {
      if (!state.busy) { state.mode = mode; renderAuthMode(elements, mode, root); }
    });
    lifetime.on(elements[mode], 'click', submit);
  }
  lifetime.on(elements.form, 'submit', event => { event.preventDefault(); submit(); });
  for (const input of [elements.email, elements.password, elements.confirmation]) {
    lifetime.on(input, 'input', () => {
      actions.onCredentials(readCredentials(elements));
      renderPasswordMatch(elements, state.mode, root);
    });
    lifetime.on(input, 'keydown', event => { if (event.key === 'Enter') { event.preventDefault(); submit(); } });
  }
  lifetime.on(elements.manual, 'click', () => {
    if (state.busy) return;
    actions.onManual();
    lifetime.timeout(() => actions.onContinue('manual'), 300);
  });
  const dispose = () => {
    lifetime.dispose();
    if (instances.get(root) === dispose) instances.delete(root);
  };
  instances.set(root, dispose);
  return dispose;
}
