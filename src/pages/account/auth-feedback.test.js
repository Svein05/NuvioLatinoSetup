import { expect, it } from 'vitest';
import { loginErrorMessage } from './auth-feedback.js';
it.each([
  [{ code: 'invalid_credentials', status: 400 }, 'Correo o contraseña incorrectos.'],
  [{ code: 'email_not_confirmed', status: 403 }, 'Confirma tu correo'],
  [{ status: 429 }, 'Demasiados intentos'],
  [{ status: 503 }, 'No se pudo conectar'],
  [new Error('offline'), 'No se pudo conectar'],
])('classifies login failure without exposing provider internals: %j', (error, message) => {
  expect(loginErrorMessage(error)).toContain(message);
});
