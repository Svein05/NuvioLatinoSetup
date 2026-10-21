import { requestJson } from '../../shared/http/request-json.js';

const providers = {
  tmdb: key => ({ url: `https://api.themoviedb.org/3/authentication?api_key=${encodeURIComponent(key)}`,
    accepted: data => typeof data?.success === 'boolean' ? data.success : undefined }),
  mdblist: key => ({ url: `https://api.mdblist.com/user?apikey=${encodeURIComponent(key)}`,
    accepted: data => Number.isInteger(data?.user_id) && typeof data.username === 'string' ? true : undefined }),
  rpdb: key => ({ url: `https://api.ratingposterdb.com/${encodeURIComponent(key)}/isValid`,
    accepted: data => typeof data?.valid === 'boolean' ? data.valid : undefined }),
  tvdb: key => ({ url: 'https://api4.thetvdb.com/v4/login', options: {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apikey: key }),
  }, accepted: data => data?.status === 'success' && typeof data.data?.token === 'string' ? true : undefined }),
  gemini: key => ({ url: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
    accepted: data => Array.isArray(data?.models) ? true : undefined }),
  openrouter: key => ({ url: 'https://openrouter.ai/api/v1/key', options: { headers: { Authorization: `Bearer ${key}` } },
    accepted: data => typeof data?.data?.label === 'string' || typeof data?.data?.is_free_tier === 'boolean' ? true : undefined }),
};

/** Return only a verification verdict, never provider responses containing user data or tokens. */
export async function validateProviderKey(provider, key, { fetchImpl = fetch, signal } = {}) {
  signal?.throwIfAborted();
  if (!providers[provider]) throw new Error('Proveedor de validación desconocido.');
  if (!key) return { status: 'skipped', valid: false };
  const { url, options, accepted } = providers[provider](key);
  try {
    const data = await requestJson(url, { ...options, fetchImpl, signal, timeoutMs: 6000 });
    signal?.throwIfAborted();
    const verdict = accepted(data);
    return { valid: verdict === true, status: verdict === true ? 'valid' : verdict === false ? 'invalid' : 'unverifiable' };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { valid: false, status: [401, 403].includes(error.status) ? 'invalid' : 'unverifiable', httpStatus: error.status };
  }
}
