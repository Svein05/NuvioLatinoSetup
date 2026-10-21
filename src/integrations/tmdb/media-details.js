import { requestJson } from '../../shared/http/request-json.js';
import { mediaIdentity } from './media-identity.js';

function tmdbUrl({ imdbId, tmdbId, type }, apiKey) {
  const query = new URLSearchParams({ api_key: apiKey, language: 'es-MX' });
  if (imdbId) {
    query.set('external_source', 'imdb_id');
    return `https://api.themoviedb.org/3/find/${encodeURIComponent(imdbId)}?${query}`;
  }
  return `https://api.themoviedb.org/3/${type}/${encodeURIComponent(tmdbId)}?${query}`;
}

function normalizeTmdb(data, imdbId) {
  const match = imdbId ? [...(data.movie_results || []), ...(data.tv_results || [])][0] : data;
  if (!match) return null;
  return {
    title: match.title || match.name,
    poster_path: match.poster_path ? `https://image.tmdb.org/t/p/w500${match.poster_path}` : '',
    backdrop_path: match.backdrop_path ? `https://image.tmdb.org/t/p/w780${match.backdrop_path}` : '',
  };
}

async function readTmdb(identity, apiKey, dependencies) {
  if (!apiKey) return null;
  try {
    const data = await requestJson(tmdbUrl(identity, apiKey), { fetchImpl: dependencies.fetchImpl });
    if (!data || typeof data !== 'object') throw new Error('Invalid metadata response');
    return normalizeTmdb(data, identity.imdbId);
  } catch {
    dependencies.reportWarning('TMDB no pudo completar la lectura de metadatos; se intentará el respaldo público.');
    return null;
  }
}

async function readCinemeta(identity, item, details, dependencies) {
  const { imdbId, type } = identity;
  let result = details;
  try {
    const category = type === 'tv' ? 'series' : 'movie';
    const data = await requestJson(`https://v3-cinemeta.strem.io/meta/${category}/${encodeURIComponent(imdbId)}.json`, {
      fetchImpl: dependencies.fetchImpl,
    });
    if (data?.meta) result = {
      title: details?.title || data.meta.name || item.title || 'Contenido Nuvio',
      poster_path: details?.poster_path || data.meta.poster || `https://images.metahub.space/poster/medium/${imdbId}/img`,
      backdrop_path: details?.backdrop_path || data.meta.background || '',
    };
  } catch {
    dependencies.reportWarning('Cinemeta no pudo completar la lectura de metadatos; se usará el póster de respaldo.');
  }
  if (!result?.poster_path) result = {
    title: result?.title || item.title || 'Contenido Nuvio',
    poster_path: `https://images.metahub.space/poster/medium/${imdbId}/img`,
    backdrop_path: result?.backdrop_path || '',
  };
  return result;
}

/** Read-only metadata resolver. Cache belongs to this instance; credentials never enter logs. */
export function createMediaDetailsResolver({ fetchImpl = fetch, reportWarning = console.warn } = {}) {
  const cache = new Map();
  const dependencies = { fetchImpl, reportWarning };
  return async function resolveMediaDetails(item, apiKey) {
    if (!item) return null;
    const identity = mediaIdentity(item);
    if (!identity.imdbId && !identity.tmdbId) return null;
    const key = `${identity.type}_${identity.imdbId || identity.tmdbId}`;
    if (cache.has(key)) return cache.get(key);
    let details = await readTmdb(identity, apiKey, dependencies);
    if (identity.imdbId && (!details?.poster_path || !details?.title)) {
      details = await readCinemeta(identity, item, details, dependencies);
    }
    if (details) cache.set(key, details);
    return details;
  };
}
