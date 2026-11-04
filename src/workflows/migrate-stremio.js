import { contentIdentity, mergeMissing } from '../features/migration/index.js';

function libraryPayload(row) {
  return { content_id: row.content_id, content_type: row.content_type || 'movie', name: row.name || row.title || row.content_id,
    poster: row.poster || null, poster_shape: row.poster_shape || 'poster', background: row.background || null,
    description: row.description || '', release_info: row.release_info || '', imdb_rating: row.imdb_rating ?? null,
    genres: Array.isArray(row.genres) ? row.genres : [], addon_base_url: row.addon_base_url || null,
    added_at: Number(row.added_at) };
}

export async function applyStremioMigration(state, { context, log, read, write }) {
  const snapshot = state.migration;
  if (!snapshot) return;
  const profileId = String(context.profileId);
  if (snapshot.targetProfile !== profileId) { snapshot.results = {}; snapshot.targetProfile = profileId; }
  const categories = ['library', 'watched', 'progress'].filter(key => snapshot.selected[key] && snapshot[key].length);
  let failed = false;
  for (const category of categories) {
    try {
      snapshot.results[category] = { status: 'reading' };
      state.notify?.('MIGRATION_UPDATED');
      const existing = await read(context, category);
      const incoming = category === 'progress' ? snapshot.progress.filter(item => !snapshot.selected.watched
        || !snapshot.watched.some(watched => contentIdentity(watched) === contentIdentity(item))) : snapshot[category];
      const missing = mergeMissing(existing, incoming);
      if (missing.length) {
        snapshot.results[category] = { status: 'writing' };
        const payload = category === 'library' ? [...existing, ...missing].map(libraryPayload) : missing;
        if (category === 'library' && payload.some(item => !Number.isFinite(item.added_at))) {
          throw new Error('La biblioteca de Nuvio contiene fechas no compatibles.');
        }
        await write(context, category, payload);
      }
      const verified = await read(context, category);
      const keys = new Set(verified.map(contentIdentity));
      if (incoming.some(item => !keys.has(contentIdentity(item)))) throw new Error('No se pudo verificar la importación completa.');
      snapshot.results[category] = { status: 'confirmed', added: missing.length };
      log?.(`✓ Importación de ${category}: ${missing.length} elementos añadidos.`, 'success');
    } catch {
      snapshot.results[category] = { status: snapshot.results[category]?.status === 'writing' ? 'uncertain' : 'failed' };
      failed = true;
      log?.('Una categoría de Stremio quedó pendiente. El próximo intento comprobará lo que ya se guardó.', 'warning');
    }
    state.notify?.('MIGRATION_UPDATED');
  }
  if (failed) throw new Error('La importación de Stremio quedó incompleta. Revisa el resumen y reintenta para verificar y añadir lo pendiente.');
}
