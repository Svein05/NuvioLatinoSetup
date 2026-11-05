import { addonUrl, episodeIdentity, mergeMissing } from './identity.js';
import { createTaskScheduler } from '../../shared/async/task-scheduler.js';

function sourceDate(value) {
  const date = Date.parse(value);
  return Number.isFinite(date) && date > 0 && date <= Date.now() + 300000 ? date : null;
}

function normalizeAddons(items, omitted, isMetadataAddon) {
  const addons = items.flatMap(item => {
    const url = addonUrl(item.transportUrl);
    const name = String(item.manifest?.name || 'Addon').slice(0, 150);
    if (!url || isMetadataAddon({ name, manifest_url: url })) {
      omitted.push({ category: 'addons', title: name, reason: url ? 'AIOMetadata se configura desde el asistente.' : 'Enlace de addon no compatible.' });
      return [];
    }
    let logo = null;
    try {
      const candidate = new URL(item.manifest?.logo, url);
      if (item.manifest?.logo && candidate.protocol === 'https:' && !candidate.username && !candidate.password) logo = candidate.href;
    } catch { /* A missing image does not exclude a compatible addon. */ }
    return [{ name, logo, manifest_url: url, url, enabled: true, selected: true }];
  });
  return mergeMissing([], addons, item => item.url);
}

async function convertItem(item, snapshot, options) {
  const title = String(item.name || item._id || 'Sin título').slice(0, 300);
  const omit = reason => snapshot.omitted.push({ category: 'library', title, reason });
  if (!/^tt\d+$/.test(item._id) || !['movie', 'series'].includes(item.type)) {
    omit('Identificador o tipo de contenido sin equivalencia segura.');
    return;
  }
  const base = { content_id: item._id, content_type: item.type, title };
  const state = item.state || {};
  const modified = sourceDate(item._mtime);
  const lastWatched = sourceDate(state.lastWatched);
  if (!item.removed && !item.temp) {
    if (modified) snapshot.library.push({ ...base, name: title, added_at: sourceDate(item._ctime) || modified,
      poster: /^https:\/\//.test(item.poster || '') ? item.poster : null, poster_shape: 'poster' });
    else omit('La biblioteca no incluye una fecha de origen válida.');
  }
  const episode = item.type === 'series' ? episodeIdentity(item._id, state.video_id) : {};
  if (state.timeOffset > 0 && state.duration > state.timeOffset && lastWatched && episode
    && Number.isSafeInteger(state.timeOffset) && Number.isSafeInteger(state.duration)) {
    snapshot.progress.push({ ...base, ...episode, video_id: state.video_id || item._id,
      progress_key: item.type === 'series' ? `${item._id}_s${episode.season}e${episode.episode}` : item._id,
      position: state.timeOffset, duration: state.duration, last_watched: lastWatched });
  } else if (state.timeOffset > 0) omit('El progreso no incluye episodio, duración o fecha verificables.');
  if (item.type === 'movie' && (state.timesWatched > 0 || state.flaggedWatched > 0) && lastWatched) {
    snapshot.watched.push({ ...base, season: null, episode: null, watched_at: lastWatched });
  }
  if (item.type === 'series' && state.watched) {
    if (!lastWatched) { omit('Los episodios vistos no incluyen una fecha de estado válida.'); return; }
    try {
      const videos = await options.readWatched(item, options);
      const episodes = videos.map(id => episodeIdentity(item._id, id)).filter(Boolean);
      snapshot.watched.push(...episodes.map(identity => ({ ...base, ...identity, watched_at: lastWatched })));
    } catch {
      options.signal?.throwIfAborted();
      omit('No se pudo verificar la lista de episodios vistos.');
    }
  }
}

export async function normalizeStremioSnapshot(source, options = {}) {
  if (source.library.length > 20000 || source.addons.length > 500) throw new Error('La cuenta supera el límite de importación.');
  const snapshot = { addons: [], library: [], progress: [], watched: [], omitted: [], selected: {
    addons: true, library: true, progress: true, watched: true,
  }, results: {} };
  snapshot.addons = normalizeAddons(source.addons, snapshot.omitted, options.isMetadataAddon);
  const schedule = createTaskScheduler(3);
  await Promise.all(source.library.map(item => schedule(async () => {
    options.signal?.throwIfAborted();
    await convertItem(item, snapshot, options);
  })));
  for (const category of ['library', 'progress', 'watched']) snapshot[category] = mergeMissing([], snapshot[category]);
  return snapshot;
}
