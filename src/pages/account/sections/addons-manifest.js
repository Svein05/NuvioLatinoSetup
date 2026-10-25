import { safeImageUrl } from '../../../shared/ui/safe-markup.js';

export function normalizeManifestUrl(rawUrl) {
  let url = (rawUrl || '').trim();
  if (/^stremio:\/\//i.test(url)) {
    url = 'https://' + url.slice(10);
  }
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  return url;
}

export function isDuplicateManifestUrl(installedAddons, newUrl, excludeIndex = null) {
  const norm = normalizeManifestUrl(newUrl);
  return (installedAddons || []).some((addon, idx) => {
    if (excludeIndex !== null && idx === excludeIndex) return false;
    const aUrl = normalizeManifestUrl(addon.manifest_url || addon.url);
    return aUrl.toLowerCase() === norm.toLowerCase();
  });
}

export function getAddonFallbackLogo() {
  return '/assets/icons/addon-placeholder.svg';
}

export function getAddonConfigureUrl(addon, info = {}) {
  try {
    const raw = addon.manifest_url || addon.url || '';
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^(https?|stremio):\/\//i.test(raw)) return null;
    const url = new URL(normalizeManifestUrl(raw));
    if (!['http:', 'https:'].includes(url.protocol) || !/\/manifest\.json$/i.test(url.pathname)) return null;
    const known = ['aiometadata', 'aiostreams', 'torrentio', 'animesub', 'opensubtitles', 'cinetorrent', 'torbox', 'stremthru', 'jackettio'];
    const identity = `${url.hostname} ${addon.name || ''}`.toLowerCase();
    if (!addon.configurable && !info?.configurable && !known.some(name => identity.includes(name))) return null;
    url.pathname = url.pathname.replace(/\/manifest\.json$/i, '/configure');
    return url.href;
  } catch { return null; }
}

function manifestLogo(value, url) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try { return safeImageUrl(new URL(value, url).href) || null; }
  catch { return null; }
}

export async function fetchAddonManifestInfo(url, requestJson) {
  const norm = normalizeManifestUrl(url);
  try {
    const data = await requestJson(norm);
    return {
      name: data.name || data.id,
      logo: manifestLogo(data.logo || data.icon, norm),
      description: data.description,
      configurable: Boolean(data.behaviorHints?.configurable || data.behaviorHints?.configurationRequired),
    };
  } catch {
    return null;
  }
}
