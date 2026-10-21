import { createTransport, isSchemaMismatch } from './transport.js';
import { normalizeProfile } from './profile-mapping.js';

class ProfilePayloadError extends Error {}

function profilesFrom(data) {
  const items = Array.isArray(data) ? data : data?.profiles;
  if (!Array.isArray(items)) throw new ProfilePayloadError('Nuvio devolvió perfiles con un formato inválido.');
  return items.map(normalizeProfile);
}

function canReadTable(error, signal) {
  if (signal?.aborted) return false;
  if ([400, 401, 403, 429].includes(error.status)) return isSchemaMismatch(error);
  return error instanceof ProfilePayloadError || isSchemaMismatch(error) || error.status >= 500
    || ['TypeError', 'TimeoutError', 'SyntaxError'].includes(error.cause?.name);
}

export async function readProfiles(context) {
  const request = createTransport(context);
  try {
    const profiles = profilesFrom(await request('rpc/sync_pull_profiles', { body: {} }));
    if (profiles.length) return profiles;
  } catch (error) { if (!canReadTable(error, context.signal)) throw error; }
  if (!context.userId) throw new Error('Falta la cuenta para consultar perfiles por REST.');
  const query = new URLSearchParams({ user_id: `eq.${context.userId}`, select: '*' });
  return profilesFrom(await request(`profiles?${query}`, { method: 'GET' }));
}
