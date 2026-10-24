export const POSTER_FEED_VERSION = 1;
export const POSTER_FEED_MAX_AGE = 30 * 86400000;

export function isPosterItem(item) {
  return item && Number.isSafeInteger(item.id) && item.id > 0
    && ['movie', 'tv'].includes(item.mediaType)
    && typeof item.title === 'string' && item.title.trim().length > 0 && item.title.length <= 300
    && typeof item.posterPath === 'string' && /^\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(item.posterPath);
}

export function isPosterFeed(feed) {
  if (!feed || feed.schemaVersion !== POSTER_FEED_VERSION || !Number.isFinite(Date.parse(feed.generatedAt))
    || !Array.isArray(feed.items) || feed.items.length < 12 || feed.items.length > 80) return false;
  const ids = new Set();
  const posters = new Set();
  return feed.items.every(item => {
    if (!isPosterItem(item)) return false;
    const key = item.mediaType + ':' + item.id;
    if (!isPosterItem(item) || ids.has(key) || posters.has(item.posterPath)) return false;
    ids.add(key); posters.add(item.posterPath);
    return true;
  });
}

export function usablePosterFeed(feed, now = Date.now()) {
  return isPosterFeed(feed) && Date.parse(feed.generatedAt) <= now + 300000
    && now - Date.parse(feed.generatedAt) <= POSTER_FEED_MAX_AGE;
}
