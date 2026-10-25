import { safeImageUrl } from '../../../shared/ui/safe-markup.js';
import { fetchAddonManifestInfo, getAddonConfigureUrl } from './addons-manifest.js';

async function readLogo(url, { requestJson, signal }) {
  try {
    return await fetchAddonManifestInfo(url, target => requestJson(target, { signal, timeoutMs: 4000 }));
  } catch { return null; }
}

/** Enrich the rendered view only; manifest logos must never dirty a profile. */
export function hydrateAddonLogos({ root, cache, requestJson, signal }) {
  if (!cache || !requestJson) return;
  root.querySelectorAll('#accountAddonsListContainer img[data-addon-manifest]').forEach(image => {
    const url = image.dataset.addonManifest;
    if (!/^https?:\/\//i.test(url)) return;
    if (!cache.has(url)) cache.set(url, readLogo(url, { requestJson, signal }));
    Promise.resolve(cache.get(url)).then(info => {
      if (!info || signal?.aborted || !image.isConnected || image.dataset.addonManifest !== url) return;
      const logo = safeImageUrl(info.logo);
      if (logo && image.getAttribute('src') !== logo) image.src = logo;
      const link = image.closest('.account-addon-card')?.querySelector('[data-addon-configure]');
      const configure = getAddonConfigureUrl({ manifest_url: url }, info);
      if (link && configure) { link.href = configure; link.hidden = false; }
    });
  });
}
