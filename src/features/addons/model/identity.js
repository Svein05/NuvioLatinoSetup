function addonUrl(addon) {
  try {
    return new URL(addon.url || addon.manifest_url || '');
  } catch {
    return null;
  }
}

/** Compare transport identity without changing case-sensitive paths or tokens. */
export function manifestIdentity(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    url.hash = '';
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.href;
  } catch {
    return value.replace(/\/+$/, '');
  }
}

export function isSameManifest(first, second) {
  const identity = manifestIdentity(first);
  return Boolean(identity) && identity === manifestIdentity(second);
}

export function isAioStreamsAddon(addon) {
  if (!addon) return false;
  const name = String(addon.name || '').toLowerCase();
  const hostname = addonUrl(addon)?.hostname || '';
  return name.includes('aiostreams') || hostname.includes('aiostreams');
}

export function isAioMetadataAddon(addon, instances = []) {
  if (!addon || isAioStreamsAddon(addon)) return false;
  const name = String(addon.name || '').toLowerCase().trim();
  if (name.includes('aiometadata') || name === 'aiometa') return true;
  const hostname = addonUrl(addon)?.hostname;
  if (!hostname) return false;
  return instances.some(instance => {
    try {
      return new URL(instance).hostname === hostname;
    } catch {
      return false;
    }
  });
}
