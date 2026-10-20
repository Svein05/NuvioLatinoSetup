import { createTransport, isSchemaMismatch } from './transport.js';

export async function getSyncOwner(context) {
  const { userId } = context;
  const request = createTransport(context);

  try {
    const data = await request('rpc/get_sync_owner', { body: {} });
    if (typeof data === 'string' && data.length > 5) return data;
    if (Array.isArray(data) && typeof data[0] === 'string') return data[0];
    if (data?.owner_id) return data.owner_id;
  } catch (error) {
    if (!isSchemaMismatch(error)) throw error;
  }
  return userId;
}

export async function listAddons(context) {
  const { userId, profileId } = context;
  const request = createTransport(context);
  const ownerId = await getSyncOwner(context) || userId;

  const profId = Number(profileId) || profileId;
  const query = new URLSearchParams({
    select: '*',
    user_id: `eq.${ownerId}`,
    profile_id: `eq.${profId}`,
    order: 'sort_order.asc,created_at.asc',
  });

  const data = await request(`addons?${query}`, { method: 'GET' });
  if (!Array.isArray(data)) throw new Error('Nuvio no devolvió una lista de addons válida.');
  return data;
}
