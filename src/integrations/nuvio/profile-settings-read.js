import { createTransport, isSchemaMismatch } from './transport.js';

function extractSettingsObject(rows) {
  if (Array.isArray(rows) && rows.length > 0) {
    return rows[0].settings || rows[0].settings_json || rows[0];
  }
  return null;
}

export async function pullProfileSettings(context) {
  const { profileId, platform = 'tv' } = context;
  const profId = Number(profileId) || profileId;
  const request = createTransport(context);

  try {
    const data = await request('rpc/sync_pull_profile_settings_blob', {
      body: { p_profile_id: profId, p_platform: platform },
    });
    if (data) return data;
    return null;
  } catch (error) {
    if (!isSchemaMismatch(error)) throw error;
  }

  try {
    const query = new URLSearchParams({
      profile_id: `eq.${profId}`,
      platform: `eq.${platform}`,
      select: '*',
      order: 'updated_at.desc,id.desc',
    });
    const rows = await request(`profile_settings?${query}`, { method: 'GET' });
    const settings = extractSettingsObject(rows);
    if (settings) return settings;
  } catch (error) {
    if (!isSchemaMismatch(error)) throw error;
  }

  const queryAll = new URLSearchParams({
    profile_id: `eq.${profId}`, select: '*', order: 'updated_at.desc,id.desc',
  });
  const rowsAll = await request(`profile_settings?${queryAll}`, { method: 'GET' });
  return extractSettingsObject(rowsAll);
}
