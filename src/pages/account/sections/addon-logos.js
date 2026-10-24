import { safeImageUrl } from '../../../shared/ui/safe-markup.js';

async function readLogo(url, { requestJson, signal }) {
  try {
    const manifest = await requestJson(url, { signal, timeoutMs: 4000 });
    if (typeof manifest?.logo !== 'string' || !manifest.logo.trim()) return null;
    return safeImageUrl(new URL(manifest.logo, url).href) || null;
  } catch { return null; }
}

/** Enrich the rendered view only; manifest logos must never dirty a profile. */
export function hydrateAddonLogos({ root, cache, requestJson, signal }) {
  if (!cache || !requestJson) return;
  root.querySelectorAll('#accountAddonsListContainer img[data-addon-manifest]').forEach(image => {
    const url = image.dataset.addonManifest;
    if (!/^https?:\/\//i.test(url)) return;
    if (!cache.has(url)) cache.set(url, readLogo(url, { requestJson, signal }));
    Promise.resolve(cache.get(url)).then(logo => {
      if (logo && !signal?.aborted && image.isConnected && image.dataset.addonManifest === url) image.src = logo;
    });
  });
}
