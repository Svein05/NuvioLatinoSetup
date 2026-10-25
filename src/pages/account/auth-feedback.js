export function setAuthError(root, message = '') {
  const error = root.getElementById('accountAuthError');
  if (error) { error.textContent = message; error.hidden = !message; }
  for (const id of ['accountEmail', 'accountPassword']) {
    const input = root.getElementById(id);
    if (message) input?.setAttribute('aria-describedby', 'accountAuthError');
    else input?.removeAttribute('aria-describedby');
  }
}
export function setAuthBusy(form, busy) {
  form?.setAttribute('aria-busy', String(busy));
  const button = form?.querySelector('button[type="submit"]');
  if (!button) return;
  button.disabled = busy;
  button.innerHTML = busy ? '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>Iniciando sesión…</span>'
    : '<i class="fa-solid fa-arrow-right-to-bracket" aria-hidden="true"></i><span>Iniciar Sesión</span>';
}
export function loginErrorMessage(error) {
  if (error.code === 'email_not_confirmed') return 'Confirma tu correo electrónico antes de iniciar sesión.';
  if (error.code === 'invalid_credentials' || [401, 403].includes(error.status)) return 'Correo o contraseña incorrectos.';
  if (error.status === 429) return 'Demasiados intentos. Espera un momento antes de volver a intentarlo.';
  return 'No se pudo conectar con Nuvio. Revisa tu conexión e intenta nuevamente.';
}
