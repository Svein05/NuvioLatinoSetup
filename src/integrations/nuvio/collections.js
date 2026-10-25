import { createTransport, isSchemaMismatch } from './transport.js';

function parseCollectionsData(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.collections)) return data.collections;
  if (data && typeof data === 'object') return data;
  return null;
}

export async function pushCollections(context) {
  const { profileId, collectionsJson } = context;
  const request = createTransport(context);
  const profId = Number(profileId) || profileId;

  try {
    await request('rpc/sync_push_collections', {
      body: { p_profile_id: profId, p_collections_json: collectionsJson },
    });
    return { success: true, method: 'rpc' };
  } catch (rpcErr) {
    if (!isSchemaMismatch(rpcErr)) throw rpcErr;
    try {
      await request('collections', {
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: collectionsJson,
      });
      return { success: true, method: 'rest_fallback' };
    } catch {
      throw rpcErr;
    }
  }
}

async function fetchCollectionTable(request, table, profId) {
  try {
    const query = new URLSearchParams({
      profile_id: `eq.${profId}`,
      select: '*',
      order: 'updated_at.desc,id.desc',
    });
    const rows = await request(`${table}?${query}`, { method: 'GET' });
    if (Array.isArray(rows) && rows.length > 0) return rows;
  } catch {
    // Continuar al siguiente fallback
  }
  return null;
}

export async function pullCollections(context) {
  const { profileId } = context;
  const request = createTransport(context);
  const profId = Number(profileId) || profileId;

  try {
    const data = await request('rpc/sync_pull_collections', {
      body: { p_profile_id: profId },
    });
    const parsed = parseCollectionsData(data);
    if (parsed) return parsed;
  } catch {
    // Continuar a fallback REST
  }

  const collections = await fetchCollectionTable(request, 'collections', profId);
  if (collections) return collections;

  const profileCollections = await fetchCollectionTable(request, 'profile_collections', profId);
  if (profileCollections) return profileCollections;

  return [];
}
