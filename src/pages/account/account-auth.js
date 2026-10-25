import { saveSession } from './account-state.js';
import { setAuthBusy, setAuthError, loginErrorMessage } from './auth-feedback.js';

export function showAccountSession(root, connected) {
  root.getElementById?.('accountAuthView')?.classList.toggle('hidden', connected);
  root.getElementById?.('accountDashboardView')?.classList.toggle('hidden', !connected);
}

export function bindAccountAuthentication({ root, state, lifetime, actions }) {
  const form = root.getElementById?.('accountAuthForm');
  let pending = false;
  for (const id of ['accountEmail', 'accountPassword']) lifetime.on(root.getElementById(id), 'input', () => setAuthError(root));
  lifetime.on(form, 'submit', async event => {
    event.preventDefault();
    if (pending || lifetime.signal.aborted) return;
    const email = root.getElementById('accountEmail')?.value.trim();
    const passwordInput = root.getElementById('accountPassword');
    const password = passwordInput?.value;
    if (!email || !password) { setAuthError(root, 'Completa correo y contraseña.'); return; }
    pending = true;
    setAuthError(root);
    setAuthBusy(form, true);
    let authenticated = false;
    try {
      if (await actions.tryCollaborator?.({ email, password })) return;
      if (lifetime.signal.aborted) return;
      const session = await actions.login({ email, password });
      if (lifetime.signal.aborted) return;
      saveSession({ ...session, email }, state);
      authenticated = true;
      if (passwordInput) passwordInput.value = '';
      showAccountSession(root, true);
      await actions.onConnected();
    } catch (error) {
      if (lifetime.signal.aborted) return;
      if (authenticated) actions.notify('La sesión se inició, pero no se pudieron cargar los perfiles. Reintenta desde Cuenta.', 'warning');
      else setAuthError(root, loginErrorMessage(error));
    } finally {
      pending = false;
      if (!lifetime.signal.aborted) setAuthBusy(form, false);
    }
  });
}
