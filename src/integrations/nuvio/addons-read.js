import { createTransport } from './transport.js';

export async function getSyncOwner(context) {
  const { userId } = context;
  const request = createTransport(context);

  try {
    const data = await request('rpc/get_sync_owner', { body: {} });
    if (typeof data === 'string' && data.length > 5) return data;
    if (Array.isArray(data) && typeof data[0] === 'string') return data[0];
    if (data?.owner_id) return data.owner_id;
  } catch {
    // Retornar fallback a userId
  }
  return userId;
}

export async function listAddons(context) {
  const { userId, profileId } = context;
  const request = createTransport(context);
  let ownerId = userId;
  try {
    ownerId = await getSyncOwner(context);
  } catch {
    // Usar userId si getSyncOwner falla
  }

  const profId = Number(profileId) || profileId;
  const query = new URLSearchParams({
    select: '*',
    user_id: `eq.${ownerId}`,
    profile_id: `eq.${profId}`,
    order: 'sort_order.asc,created_at.asc',
  });

  try {
    const data = await request(`addons?${query}`, { method: 'GET' });
    if (Array.isArray(data)) return data;
  } catch {
    // Retornar lista vacía ante error
  }
  return [];
}
