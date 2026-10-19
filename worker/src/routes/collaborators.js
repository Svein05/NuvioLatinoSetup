import { WorkerError, json, readJson } from '../middleware/http.js';
import { sharedAccess } from '../middleware/shared-access.js';
import { validateAvatarBatch } from '../services/avatar-batch.js';
import { publishAvatars } from '../services/publish-avatars.js';
import { createGitHubClient } from '../integrations/github.js';

export async function collaboratorRoute(request, env, { publish, fetchImpl }) {
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
  const payload = await readJson(request);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new WorkerError('Cuerpo inválido.');
  const role = sharedAccess(payload.password, payload.email, env);
  if (!role) return json({ error: 'Credenciales de colaborador no válidas o correo no autorizado.' }, 401);
  if (!publish) return json({ success: true, role });
  const batch = validateAvatarBatch(payload);
  return json(await publishAvatars(batch, createGitHubClient(env, fetchImpl)));
}
