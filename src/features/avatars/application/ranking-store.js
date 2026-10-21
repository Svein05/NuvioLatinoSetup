import { createJsonStore } from '../../../shared/storage/json-store.js';

export function createAvatarRankingStore({ local, session, now = Date.now, reportWarning = console.warn }) {
  const cache = createJsonStore({ key: 'nuvio_avatar_ranks_cached_top', storage: local, reportWarning });
  const voted = new Set();
  return {
    read: () => cache.read(),
    save(items) {
      cache.write(items);
      try { local.setItem('nuvio_avatar_ranks_cached_ts', String(now())); }
      catch { reportWarning('No se pudo guardar la fecha del ranking.'); }
    },
    hasVoted(key) {
      if (voted.has(key)) return true;
      try { return session.getItem(`nuvio_avatar_voted_${key}`) === 'true'; }
      catch { reportWarning('No se pudo leer el voto de esta sesión.'); return false; }
    },
    confirm(key) {
      voted.add(key);
      try { session.setItem(`nuvio_avatar_voted_${key}`, 'true'); }
      catch { reportWarning('No se pudo guardar el voto de esta sesión.'); }
      cache.clear();
    },
  };
}
