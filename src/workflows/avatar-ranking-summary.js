import { completeAvatarRanking } from '../features/avatars/index.js';

const validTotal = total => Number.isSafeInteger(total) && total >= 0;

/** One public read shared by the landing carousel and usage metric. */
export function createAvatarSummaryLoader({ read, store }) {
  let pending;
  let pendingSignal;
  return function load(limit = 32, options = {}) {
    if (pending && !pendingSignal?.aborted) return pending;
    const task = read(limit, options).then(data => {
      store.save(data.items);
      if (validTotal(data.totalUsage)) store.saveSummary({ totalUsage: data.totalUsage });
      const cached = store.readSummary();
      const totalUsage = validTotal(data.totalUsage) ? data.totalUsage : validTotal(cached?.totalUsage) ? cached.totalUsage : null;
      return { items: completeAvatarRanking(data.items, limit), totalUsage,
        source: validTotal(data.totalUsage) ? 'network' : totalUsage === null ? 'unavailable' : 'cache' };
    }).catch(error => {
      options.signal?.throwIfAborted();
      const saved = store.readSummary();
      return { items: completeAvatarRanking(store.read(), limit),
        totalUsage: validTotal(saved?.totalUsage) ? saved.totalUsage : null,
        source: validTotal(saved?.totalUsage) ? 'cache' : 'unavailable', error: error.name };
    }).finally(() => { if (pending === task) pending = null; });
    pendingSignal = options.signal;
    pending = task;
    return task;
  };
}
