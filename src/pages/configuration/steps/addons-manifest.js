import { getAddonFallbackLogo } from './addons-view.js';

export function cleanManifestUrl(manifestUrl) {
  if (!manifestUrl) return '';
  let cleanUrl = String(manifestUrl).trim();
  if (cleanUrl.startsWith('stremio://')) cleanUrl = 'https://' + cleanUrl.slice(10);
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) cleanUrl = 'https://' + cleanUrl;
  if (!cleanUrl.includes('.json') && !cleanUrl.endsWith('manifest.json')) {
    cleanUrl = cleanUrl.replace(/\/+$/, '') + '/manifest.json';
  }
  return cleanUrl;
}

export async function fetchManifestInfo(manifestUrl, cache = new Map()) {
  const cleanUrl = cleanManifestUrl(manifestUrl);
  if (!cleanUrl) return null;
  if (cache.has(cleanUrl)) return cache.get(cleanUrl);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(cleanUrl, { signal: controller.signal, headers: { Accept: 'application/json' } });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    const info = { name: data.name || data.id || null, logo: data.logo || data.icon || null, description: data.description || null };
    cache.set(cleanUrl, info);
    return info;
  } catch {
    return null;
  }
}

export async function enrichProfileAddons(addons, { cache = new Map(), onUpdate } = {}) {
  const missing = (addons || []).filter(a => !a.logo && (a.manifest_url || a.url));
  if (!missing.length) return;

  let changed = false;
  await Promise.allSettled(missing.map(async addon => {
    const url = addon.manifest_url || addon.url;
    const fallback = getAddonFallbackLogo(url, addon.name);
    if (fallback && !addon.logo) { addon.logo = fallback; changed = true; }
    const info = await fetchManifestInfo(url, cache);
    if (info?.logo && addon.logo !== info.logo) { addon.logo = info.logo; changed = true; }
    if (info?.name && (!addon.name || addon.name.startsWith('Addon '))) { addon.name = info.name; changed = true; }
  }));

  if (changed) onUpdate?.();
}
