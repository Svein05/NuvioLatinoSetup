function configuredAccounts(value) {
  if (!value) return null;
  let items;
  try { items = JSON.parse(value); }
  catch { items = value.split(','); }
  if (!Array.isArray(items) || items.some(item => typeof item !== 'string')) return [];
  return items.map(item => item.trim().toLowerCase()).filter(Boolean);
}

/** Shared passwords authorize a role; a submitted email does not prove individual identity. */
export function sharedAccess(password, email, env) {
  if (typeof password !== 'string' || !password) return null;
  if (env.ADMIN_PASSWORD && password === env.ADMIN_PASSWORD) return 'admin';
  if (!env.MODDER_PASSWORD || password !== env.MODDER_PASSWORD) return null;
  const allowed = configuredAccounts(env.MODDER_ACCOUNTS);
  if (!allowed) return 'modder';
  return typeof email === 'string' && allowed.includes(email.trim().toLowerCase()) ? 'modder' : null;
}
