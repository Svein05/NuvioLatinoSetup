import { createTransport } from './transport.js';

export async function listPlugins(context) {
  const { profileId } = context;
  const profId = Number(profileId) || profileId;
  const request = createTransport(context);

  try {
    const data = await request('rpc/sync_pull_plugins', { body: { p_profile_id: profId } });
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.plugins)) return data.plugins;
  } catch {
    // Continuar a REST
  }

  try {
    const query = new URLSearchParams({ profile_id: `eq.${profId}`, select: '*' });
    const rows = await request(`plugins?${query}`, { method: 'GET' });
    if (Array.isArray(rows)) return rows;
  } catch {
    // Retornar vacío ante fallo
  }

  return [];
}
