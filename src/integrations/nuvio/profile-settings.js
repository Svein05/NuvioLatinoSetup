import { buildSettingsPayload } from './settings-payload.js';
import { createTransport, isSchemaMismatch } from './transport.js';

export async function pushProfileSettings(context) {
  const { profileId, platform = 'tv', settings = {} } = context;
  const request = createTransport(context);
  const settingsBlob = buildSettingsPayload(settings, platform);
  const body = { p_profile_id: Number(profileId) || profileId, p_platform: platform, p_settings_json: settingsBlob };
  try {
    await request('rpc/sync_push_profile_settings_blob', {
      body: { ...body, p_origin_client_id: 'nuvio-setup-web' },
    });
    return { success: true, method: 'rpc' };
  } catch (error) {
    if (!isSchemaMismatch(error)) throw error;
  }
  try {
    await request('rpc/sync_push_profile_settings_blob', { body });
    return { success: true, method: 'rpc_compact' };
  } catch (error) {
    if (!isSchemaMismatch(error)) throw error;
  }
  await request('profile_settings', {
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: { profile_id: body.p_profile_id, platform, settings: settingsBlob },
  });
  return { success: true, method: 'rest_fallback' };
}
