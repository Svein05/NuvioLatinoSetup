export function normalizeManifestUrl(rawUrl) {
  let url = (rawUrl || '').trim();
  if (url.startsWith('stremio://')) {
    url = 'https://' + url.slice(10);
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
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

export function getAddonFallbackLogo(rawUrl, name) {
  const seed = encodeURIComponent(name || 'Addon');
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}`;
}

export async function fetchAddonManifestInfo(url, requestJson) {
  const norm = normalizeManifestUrl(url);
  try {
    const data = await requestJson(norm);
    return {
      name: data.name,
      logo: data.logo,
      description: data.description,
      configurable: Boolean(data.behaviorHints?.configurable),
    };
  } catch {
    return null;
  }
}
