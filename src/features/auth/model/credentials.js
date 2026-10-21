export function validateCredentials({ email, password, confirmation }, mode) {
  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    return { message: 'Por favor ingresa tu correo y contraseña de Nuvio.', field: 'email' };
  }
  if (mode !== 'signup') return null;
  if (password.length < 6) return { message: 'La contraseña debe tener al menos 6 caracteres.', field: 'password' };
  if (password !== confirmation) return { message: 'Las contraseñas no coinciden. Por favor verifícalas antes de continuar.', field: 'confirmation' };
  return null;
}
