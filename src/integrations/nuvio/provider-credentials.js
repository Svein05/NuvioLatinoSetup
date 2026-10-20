import { createTransport, isSchemaMismatch } from './transport.js';

function sanitizeCredentials(credentials) {
  return (Array.isArray(credentials) ? credentials : [])
    .map(c => ({
      provider: String(c?.provider || '').trim().toLowerCase(),
      credential_json: c?.credential_json && typeof c.credential_json === 'object' ? c.credential_json : {},
    }))
    .filter(c => c.provider && Object.keys(c.credential_json).length > 0);
}

async function pushCredentialsRest(request, profId, valid) {
  for (const cred of valid) {
    await request('provider_credentials', {
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: { profile_id: profId, provider: cred.provider, credential_json: cred.credential_json },
    });
  }
  return { success: true, method: 'rest_fallback', count: valid.length };
}

export async function pushProviderCredentials(context) {
  const { profileId, credentials = [] } = context;
  const profId = Number(profileId) || profileId;
  const valid = sanitizeCredentials(credentials);
  if (valid.length === 0) return { success: true, count: 0 };

  const request = createTransport(context);
  const payload = { p_profile_id: profId, p_credentials: valid, p_origin_client_id: 'nuvio-setup-web' };

  try {
    await request('rpc/sync_push_provider_credentials', { body: payload });
    return { success: true, method: 'rpc', count: valid.length };
  } catch (error) {
    if (!isSchemaMismatch(error)) throw error;
    try {
      await request('rpc/sync_seed_provider_credentials', { body: payload });
      return { success: true, method: 'rpc_seed', count: valid.length };
    } catch (error) {
      if (!isSchemaMismatch(error)) throw error;
      return pushCredentialsRest(request, profId, valid);
    }
  }
}

export async function pullProviderCredentials(context) {
  const { profileId } = context;
  const profId = Number(profileId) || profileId;
  const request = createTransport(context);

  try {
    const data = await request('rpc/sync_pull_provider_credentials', { body: { p_profile_id: profId } });
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.credentials)) return data.credentials;
    throw new Error('Nuvio devolvió credenciales con un formato inválido.');
  } catch (error) {
    if (!isSchemaMismatch(error)) throw error;
  }

  const rows = await request(`provider_credentials?profile_id=eq.${encodeURIComponent(profId)}&select=*`, { method: 'GET' });
  if (Array.isArray(rows)) return rows;

  throw new Error('Nuvio devolvió credenciales con un formato inválido.');
}
