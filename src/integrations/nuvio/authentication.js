import { HttpError, requestJson } from '../../shared/http/request-json.js';

function authResult(data, now) {
  if (typeof data?.access_token !== 'string' || !data.access_token || typeof data.user?.id !== 'string' || !data.user.id) {
    throw new HttpError('Respuesta de autenticación incompleta: faltan la sesión o el usuario.');
  }
  const expiry = Number(data.expires_at) * 1000 || (Number(data.expires_in) > 0 ? now() + Number(data.expires_in) * 1000 : null);
  return { accessToken: data.access_token, userId: data.user.id, user: data.user,
    ...(expiry ? { expiresAt: expiry } : {}) };
}

function authenticationError(error, signup) {
  if (signup && ['user_already_exists', 'email_exists'].includes(error.code)) {
    return new HttpError('Ya existe una cuenta con este correo en Nuvio. Cambia a la opción "Iniciar Sesión".', {
      status: error.status, code: error.code, cause: error, outcome: error.outcome,
    });
  }
  if (error.code === 'email_not_confirmed') return new HttpError('Nuvio requiere confirmar el correo antes de iniciar sesión.', {
    status: error.status, code: error.code, cause: error, outcome: error.outcome,
  });
  if (error.status === 400 && error.code === 'invalid_credentials') return new HttpError('El correo o la contraseña de Nuvio no son correctos.', {
    status: error.status, code: error.code, cause: error,
  });
  return error;
}

async function authenticate(context, operation) {
  const { apiUrl, apikey, email, password, fetchImpl, signal } = context;
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    throw new HttpError('Completa el correo y la contraseña de Nuvio.');
  }
  return requestJson(`${apiUrl.replace(/\/+$/, '')}/auth/v1/${operation}`, {
    fetchImpl, signal, method: 'POST', headers: { apikey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  });
}

export async function login(context) {
  try {
    return authResult(await authenticate(context, 'token?grant_type=password'), context.now || Date.now);
  } catch (error) { throw authenticationError(error, false); }
}

export async function signup(context) {
  try {
    const data = await authenticate(context, 'signup');
    if (!data || typeof data !== 'object') throw new HttpError('Nuvio devolvió una respuesta de registro inválida.');
    if (data.access_token) return authResult(data, context.now || Date.now);
    return await login(context);
  } catch (error) { throw authenticationError(error, true); }
}
