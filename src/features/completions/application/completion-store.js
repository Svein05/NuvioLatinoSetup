import { isCompletionCount } from '../model/count.js';

/** Cache confirmed totals and per-execution acknowledgements, never session-wide locks. */
export function createCompletionStore({ local, reportWarning = console.warn }) {
  let memory;
  const acknowledged = new Set();
  const access = (method, key, value) => {
    try { return local[method](key, value); }
    catch { reportWarning('No se pudo acceder al almacenamiento del contador.'); return null; }
  };
  const save = count => {
    memory = Math.max(memory ?? count, count);
    access('setItem', 'nuvio_completions_cached_count', String(memory));
  };
  return {
    snapshot() {
      const raw = access('getItem', 'nuvio_completions_cached_count');
      const count = memory ?? (raw === null || raw.trim() === '' ? null : Number(raw));
      return isCompletionCount(count) ? { count, source: 'cache' } : { count: null, source: 'unavailable' };
    },
    save,
    recorded: id => acknowledged.has(id) || access('getItem', 'completion:' + id) === 'confirmed',
    confirm(count, id) {
      save(count);
      acknowledged.add(id);
      access('setItem', 'completion:' + id, 'confirmed');
    },
  };
}
