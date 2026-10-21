import { createJsonStore } from '../../../shared/storage/json-store.js';
import { sanitizeSession, sessionExpired } from '../model/session.js';

export function createSessionStore({ now = Date.now, ...options }) {
  const store = createJsonStore(options);
  function read() {
    const session = sanitizeSession(store.read());
    if (!session || sessionExpired(session, now())) { store.clear(); return null; }
    store.write(session);
    return session;
  }
  return {
    read,
    write(value) {
      const session = sanitizeSession(value);
      return session && !sessionExpired(session, now()) ? store.write(session) : false;
    },
    clear: store.clear,
  };
}
