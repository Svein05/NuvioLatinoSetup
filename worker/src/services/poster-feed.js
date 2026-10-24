import { isPosterItem, isPosterFeed } from '../../../src/shared/media/poster-feed.js';
import { fetchPosterSources } from '../integrations/tmdb.js';
import { localizePosterSources } from '../integrations/tmdb-artwork.js';

export const POSTER_FEED_KEY = 'poster-feed:v1';

export function normalizePosterSources(sources, now = Date.now()) {
  const ids = new Set();
  const posters = new Set();
  const items = sources.flat().flatMap(item => {
    const value = { id: item.id, mediaType: item.mediaType,
      title: item.title || item.name, posterPath: item.poster_path };
    const key = value.mediaType + ':' + value.id;
    if (item.adult === true || !isPosterItem(value) || ids.has(key) || posters.has(value.posterPath)) return [];
    ids.add(key); posters.add(value.posterPath);
    return [value];
  });
  const feed = { schemaVersion: 1, generatedAt: new Date(now).toISOString(), items };
  if (!isPosterFeed(feed)) throw new Error('Insufficient valid poster feed');
  return feed;
}

export async function refreshPosterFeed(env, { fetchImpl = fetch, now = Date.now } = {}) {
  if (!env.POSTER_FEED_KV?.put) throw new Error('Poster feed storage unavailable');
  const sources = await fetchPosterSources(env.TMDB_READ_ACCESS_TOKEN, fetchImpl);
  const localized = await localizePosterSources(sources, env.TMDB_READ_ACCESS_TOKEN, fetchImpl);
  const feed = normalizePosterSources(localized, now());
  await env.POSTER_FEED_KV.put(POSTER_FEED_KEY, JSON.stringify(feed));
  return { count: feed.items.length, generatedAt: feed.generatedAt };
}
