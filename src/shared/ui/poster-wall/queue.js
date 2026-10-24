const KEY = 'nuvio_poster_queue_v2';
const identity = item => item.mediaType + ':' + item.id;

export function createPosterQueue(items, { storage } = {}) {
  const byId = new Map(items.map(item => [identity(item), item]));
  let saved;
  try { saved = JSON.parse(storage?.getItem(KEY)); } catch { /* Private browsing is supported. */ }
  let remaining = Array.isArray(saved?.remaining) ? [...new Set(saved.remaining)].filter(id => byId.has(id)) : [];
  let recent = Array.isArray(saved?.recent) ? saved.recent.filter(id => byId.has(id)).slice(-12) : [];
  return {
    next() {
      if (!remaining.length) remaining = [...byId.keys()];
      let index = remaining.findIndex(id => !recent.includes(id));
      if (index < 0) index = Math.max(0, remaining.findIndex(id => !recent.slice(-2).includes(id)));
      const [id] = remaining.splice(index, 1);
      recent = [...recent, id].slice(-Math.min(12, Math.max(1, items.length - 2)));
      try { storage?.setItem(KEY, JSON.stringify({ remaining, recent })); } catch { /* Use memory only. */ }
      return byId.get(id);
    },
  };
}
