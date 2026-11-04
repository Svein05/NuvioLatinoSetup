import { createTransport } from './transport.js';

const resources = { library: 'library_items', watched: 'watched_items', progress: 'watch_progress' };
const push = { library: 'sync_push_library', watched: 'sync_push_watched_items', progress: 'sync_push_watch_progress' };

/** Read a complete profile-scoped snapshot. Never continue after an incomplete page. */
export async function readMigrationTarget(context, category) {
  if (!resources[category]) throw new Error('Categoría de importación no compatible.');
  const request = createTransport(context);
  const rows = [];
  const pageSize = 500;
  for (let offset = 0; offset < 100000; offset += pageSize) {
    const query = new URLSearchParams({ profile_id: `eq.${context.profileId}`, select: '*',
      order: category === 'library' ? 'content_id.asc' : 'content_id.asc,season.asc.nullsfirst,episode.asc.nullsfirst',
      limit: String(pageSize), offset: String(offset) });
    const { data, headers } = await request(`${resources[category]}?${query}`, {
      method: 'GET', responseMetadata: true, headers: { Prefer: 'count=exact' },
    });
    if (!Array.isArray(data) || data.some(row => !row?.content_id
      || String(row.profile_id) !== String(context.profileId))) throw new Error('No se pudo leer el perfil completo de Nuvio.');
    rows.push(...data);
    const total = headers.get('content-range')?.match(/\/(\d+)$/)?.[1];
    if (total === undefined) throw new Error('Nuvio no confirmó el tamaño completo del perfil.');
    if (rows.length === Number(total)) return rows;
    if (rows.length > Number(total) || data.length !== pageSize) throw new Error('La lectura del perfil de Nuvio quedó incompleta.');
  }
  throw new Error('El perfil de Nuvio supera el límite de importación.');
}

export async function writeMigrationTarget(context, category, items) {
  const parameter = category === 'progress' ? 'p_entries' : 'p_items';
  return createTransport(context)(`rpc/${push[category]}`, {
    body: { p_profile_id: Number(context.profileId), [parameter]: items },
  });
}
