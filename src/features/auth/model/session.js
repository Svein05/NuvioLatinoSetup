function tokenExpiry(token) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const text = atob(payload.replaceAll('-', '+').replaceAll('_', '/'));
    const value = JSON.parse(text).exp;
    return Number.isFinite(value) && value > 0 ? value * 1000 : null;
  } catch { return null; }
}

/** Whitelist persisted session fields; passwords and provider credentials are never copied. */
export function sanitizeSession(value) {
  if (!value || typeof value.accessToken !== 'string' || !value.accessToken
    || typeof value.userId !== 'string' || !value.userId) return null;
  const expiresAt = Number.isFinite(value.expiresAt) && value.expiresAt > 0
    ? value.expiresAt : tokenExpiry(value.accessToken);
  return { accessToken: value.accessToken, userId: value.userId,
    email: typeof value.email === 'string' ? value.email : '', ...(expiresAt ? { expiresAt } : {}) };
}

export function sessionExpired(session, now) {
  return Boolean(session?.expiresAt && session.expiresAt <= now);
}
