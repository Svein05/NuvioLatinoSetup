/** Canonical import identity deliberately retains configured URL paths and query strings. */
export function addonUrl(value) {
  try {
    const url = new URL(String(value || '').replace(/^stremio:\/\//i, 'https://'));
    if (url.protocol !== 'https:' || url.username || url.password || !url.pathname.endsWith('/manifest.json')) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}

export function contentIdentity(item) {
  return [item.content_type, item.content_id, item.season ?? '', item.episode ?? ''].join('|');
}

export function mergeMissing(existing, incoming, identity = contentIdentity) {
  const keys = new Set(existing.map(identity));
  return incoming.filter(item => {
    const key = identity(item);
    if (keys.has(key)) return false;
    keys.add(key);
    return true;
  });
}

export function episodeIdentity(id, videoId) {
  const match = String(videoId || '').match(/^(tt\d+):(\d+):(\d+)$/);
  if (!match || match[1] !== id || Number(match[3]) < 1) return null;
  return { season: Number(match[2]), episode: Number(match[3]) };
}
