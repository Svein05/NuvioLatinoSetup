import { createTransport, isSchemaMismatch } from './transport.js';

const resources = {
  progress: {
    rpc: 'sync_pull_watch_progress', table: 'watch_progress', field: 'progress', order: 'last_watched',
    parameters: { p_limit: 100, p_since_last_watched: '1970-01-01T00:00:00Z' },
  },
  watched: {
    rpc: 'sync_pull_watched_items', table: 'watched_items', field: 'watched', order: 'watched_at',
    parameters: { p_page: 1, p_page_size: 100 },
  },
  library: { rpc: 'sync_pull_library', table: 'library_items', field: 'library', parameters: {} },
};

function scopedItems(data, profileId, field) {
  const items = Array.isArray(data) ? data : (data?.items ?? data?.[field]);
  if (!Array.isArray(items)) throw new Error('Nuvio devolvió un historial con formato inválido.');
  return items.filter(item => item && (
    item.profile_id === undefined || String(item.profile_id) === String(profileId)
  ));
}

function historyResult(data, profileId, field, total) {
  const items = scopedItems(data, profileId, field);
  const source = Array.isArray(data) ? data : (data.items ?? data[field]);
  const mixed = source.some(item => item?.profile_id !== undefined && String(item.profile_id) !== String(profileId));
  const totalCount = mixed ? items.length : (total ?? data?.total ?? data?.total_count ?? data?.count ?? items.length);
  return { items, totalCount };
}

export async function readProfileHistory(context, kind) {
  const resource = resources[kind];
  if (!resource) throw new Error('Tipo de historial no soportado.');
  const request = createTransport(context);
  const profileId = Number(context.profileId) || context.profileId;
  try {
    const data = await request(`rpc/${resource.rpc}`, {
      body: { p_profile_id: profileId, ...resource.parameters },
    });
    return historyResult(data, profileId, resource.field);
  } catch (error) {
    if (!isSchemaMismatch(error)) throw error;
  }
  const query = new URLSearchParams({ profile_id: `eq.${profileId}`, select: '*', limit: '100' });
  if (resource.order) query.set('order', `${resource.order}.desc`);
  const { data, headers } = await request(`${resource.table}?${query}`, {
    method: 'GET', responseMetadata: true, headers: { Prefer: 'count=exact' },
  });
  const total = headers.get('content-range')?.match(/\/(\d+)$/)?.[1];
  return historyResult(data, profileId, resource.field, total === undefined ? undefined : Number(total));
}

// Legacy UI reads totalCount from an array. Keep that boundary out of the new model.
export async function legacyHistory(context, kind) {
  const { items, totalCount } = await readProfileHistory(context, kind);
  return Object.assign(items, { totalCount });
}
