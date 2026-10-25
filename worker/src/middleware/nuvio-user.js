import { WorkerError } from './http.js';

/** Validate the access token remotely; never trust a decoded JWT or a client-supplied user ID. */
export async function authenticatedNuvioUser(request, env, fetchImpl) {
  const authorization = request.headers.get('Authorization') || '';
  if (!/^Bearer [^\s]{1,8192}$/.test(authorization)) throw new WorkerError('Se requiere una sesión de Nuvio.', 401);
  if (!env.NUVIO_PUBLIC_ANON_KEY) throw new WorkerError('Verificación de sesión no configurada.', 503);
  let response;
  let user;
  try {
    response = await fetchImpl('https://api.nuvio.tv/auth/v1/user', { redirect: 'manual', signal: AbortSignal.timeout(5000),
      headers: { Authorization: authorization, apikey: env.NUVIO_PUBLIC_ANON_KEY } });
    if ([401, 403].includes(response.status)) throw new WorkerError('Sesión de Nuvio no válida.', 401);
    if (!response.ok) throw new WorkerError('No se pudo verificar la sesión de Nuvio.', 502);
    user = await response.json();
  } catch (error) {
    if (error instanceof WorkerError) throw error;
    throw new WorkerError('No se pudo verificar la sesión de Nuvio.', 502);
  }
  if (typeof user?.id !== 'string' || !user.id || user.id.length > 128 || user.is_anonymous === true) {
    throw new WorkerError('Sesión de Nuvio no válida.', 401);
  }
  return user.id;
}
