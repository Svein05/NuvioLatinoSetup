import { saveSession } from './account-state.js';

export function showAccountSession(root, connected) {
  root.getElementById?.('accountAuthView')?.classList.toggle('hidden', connected);
  root.getElementById?.('accountDashboardView')?.classList.toggle('hidden', !connected);
}

export function bindAccountAuthentication({ root, state, lifetime, actions }) {
  const form = root.getElementById?.('accountAuthForm');
  let pending = false;
  lifetime.on(form, 'submit', async event => {
    event.preventDefault();
    if (pending) return;
    const email = root.getElementById('accountEmail')?.value.trim();
    const passwordInput = root.getElementById('accountPassword');
    const password = passwordInput?.value;
    if (!email || !password) { actions.notify('Completa correo y contraseña.', 'error'); return; }
    const button = form.querySelector('button[type="submit"]');
    pending = true;
    if (button) button.disabled = true;
    try {
      if (await actions.tryCollaborator?.({ email, password })) return;
      const session = await actions.login({ email, password });
      saveSession({ ...session, email }, state);
      if (passwordInput) passwordInput.value = '';
      showAccountSession(root, true);
      actions.notify('Sesión iniciada correctamente.', 'success');
      await actions.onConnected();
    } catch (error) {
      actions.notify(`Error de acceso: ${error.message}`, 'error');
    } finally {
      pending = false;
      if (button) button.disabled = false;
    }
  });
}
