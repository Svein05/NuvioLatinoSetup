const MODDER_SESSION_KEY = 'nuvio_modder_session';

export function getModderSession(storage) {
  try {
    storage ??= globalThis.sessionStorage;
    const raw = storage?.getItem(MODDER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { token: parsed.token || null, email: parsed.email || '' };
  } catch {
    return null;
  }
}

export function saveModderSession({ token, email = '' } = {}, storage) {
  try {
    storage ??= globalThis.sessionStorage;
    storage?.setItem(MODDER_SESSION_KEY, JSON.stringify({ token, email, timestamp: Date.now() }));
  } catch {
    // Ignored
  }
}

export function clearModderSession(storage) {
  try {
    storage ??= globalThis.sessionStorage;
    storage?.removeItem(MODDER_SESSION_KEY);
  } catch {
    // Ignored
  }
}
