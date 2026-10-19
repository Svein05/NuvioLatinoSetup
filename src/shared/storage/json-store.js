/** Small storage boundary; callers own validation and never put secrets in warnings. */
export function createJsonStore({ key, storage, reportWarning = console.warn }) {
  function clear() {
    try { storage.removeItem(key); return true; }
    catch { reportWarning('No se pudo limpiar la sesión local.'); return false; }
  }
  return {
    read() {
      try {
        const raw = storage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        reportWarning('No se pudo leer la sesión local.');
        clear();
        return null;
      }
    },
    write(value) {
      try { storage.setItem(key, JSON.stringify(value)); return true; }
      catch { reportWarning('No se pudo conservar la sesión en esta pestaña.'); return false; }
    },
    clear,
  };
}
