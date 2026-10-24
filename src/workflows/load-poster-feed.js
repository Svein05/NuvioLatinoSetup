import { usablePosterFeed } from '../shared/media/poster-feed.js';

const KEY = 'nuvio_poster_feed_v1';

export function createPosterFeedLoader({ read, storage, now = Date.now }) {
  let pending;
  let pendingSignal;
  let memory;
  const cached = () => {
    try { return memory || JSON.parse(storage.getItem(KEY)); } catch { return memory; }
  };
  return async function load({ signal } = {}) {
    const previous = cached();
    const valid = previous && usablePosterFeed(previous.feed, now());
    if (valid && now() >= previous.fetchedAt && now() - previous.fetchedAt < 3600000) return previous.feed;
    if (pending && !pendingSignal?.aborted) return pending;
    const task = read({ signal }).then(feed => {
      if (!usablePosterFeed(feed, now())) throw new Error('Invalid poster snapshot');
      memory = { feed, fetchedAt: now() };
      try { storage.setItem(KEY, JSON.stringify(memory)); } catch { /* Decoration also works without storage. */ }
      return feed;
    }).catch(() => valid ? previous.feed : null).finally(() => { if (pending === task) pending = null; });
    pendingSignal = signal;
    pending = task;
    return task;
  };
}
