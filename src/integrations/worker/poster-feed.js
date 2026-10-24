import { requestJson } from '../../shared/http/request-json.js';
import { usablePosterFeed } from '../../shared/media/poster-feed.js';

export async function fetchPosterFeed(baseUrl, { signal } = {}) {
  const feed = await requestJson(baseUrl.replace(/\/$/, '') + '/api/poster-feed', { signal, timeoutMs: 5000 });
  if (!usablePosterFeed(feed)) throw new Error('Invalid poster feed');
  return feed;
}
