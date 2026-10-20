import { BASELINE_COUNT, RECORD_WINDOW_MS, isCompletionCount } from '../model/count.js';

const KEYS = {
  count: 'nuvio_completions_cached_count', timestamp: 'nuvio_completions_cached_ts',
  recorded: 'nuvio_completion_recorded_token', session: 'nuvio_completion_session_recorded',
  pending: 'nuvio_completion_pending_token',
};

function access(storage, reportWarning) {
  return {
    get(key) {
      try { return storage.getItem(key); }
      catch { reportWarning('No se pudo leer el almacenamiento del contador.'); return null; }
    },
    set(key, value) {
      try { storage.setItem(key, String(value)); }
      catch { reportWarning('No se pudo guardar el almacenamiento del contador.'); }
    },
    remove(key) {
      try { storage.removeItem(key); }
      catch { reportWarning('No se pudo limpiar el almacenamiento del contador.'); }
    },
  };
}

function recent(value, now) {
  if (!value) return false;
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && now >= timestamp && now - timestamp < RECORD_WINDOW_MS;
}

/** Own the existing cache/token format; dependencies never read browser globals. */
export function createCompletionStore({ local, session, now = Date.now, reportWarning = console.warn }) {
  const persistent = access(local, reportWarning);
  const temporary = access(session, reportWarning);
  let memory;
  return {
    snapshot() {
      if (memory !== undefined) return { count: memory, source: 'cache' };
      const raw = persistent.get(KEYS.count);
      const count = raw === null || raw.trim() === '' ? NaN : Number(raw);
      return isCompletionCount(count) ? { count, source: 'cache' }
        : { count: BASELINE_COUNT, source: 'estimate' };
    },
    save(count) {
      memory = count;
      persistent.set(KEYS.count, count);
      persistent.set(KEYS.timestamp, now());
    },
    recorded: () => temporary.get(KEYS.session) === 'true' || recent(persistent.get(KEYS.recorded), now()),
    pending: () => recent(persistent.get(KEYS.pending), now()),
    begin: () => persistent.set(KEYS.pending, now()),
    release: () => persistent.remove(KEYS.pending),
    confirm(count) {
      memory = count;
      persistent.set(KEYS.count, count);
      persistent.set(KEYS.timestamp, now());
      temporary.set(KEYS.session, 'true');
      persistent.set(KEYS.recorded, now());
      persistent.remove(KEYS.pending);
    },
  };
}
