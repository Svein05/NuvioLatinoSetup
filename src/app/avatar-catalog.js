import { CONFIG } from './config.js';
import { createAvatarCatalogStore, getStylesSummary as styles, getFranchisesSummary as franchises,
  filterAvatars as filter } from '../features/avatars/index.js';
import { createPublicMetadataClient } from '../integrations/worker/public-metadata.js';
import { loadBundledAvatars } from '../integrations/github/bundled-avatars.js';
import { setImageSourceHashes } from '../shared/media/responsive-image.js';
import { avatarImageUrl } from '../integrations/github/avatar-image-url.js';
import { createAvatarCatalogLoader } from '../workflows/load-avatar-catalog.js';
import { createJsonStore } from '../shared/storage/json-store.js';

const relativePrefix = typeof window !== 'undefined' && /\/(account|configuration|documentation|modder)(?:\/|$)/.test(window.location.pathname) ? '../' : './';
const catalog = createAvatarCatalogStore({ relativePrefix });
const cache = createJsonStore({
  key: 'nuvio_avatars_tree_cache',
  storage: {
    getItem: key => (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null),
    setItem: (key, value) => (typeof sessionStorage !== 'undefined' ? sessionStorage.setItem(key, value) : undefined),
    removeItem: key => (typeof sessionStorage !== 'undefined' ? sessionStorage.removeItem(key) : undefined),
  },
  reportWarning: () => console.warn('No se pudo acceder a la caché del catálogo de avatares.'),
});
const metadata = createPublicMetadataClient(CONFIG.WORKER_API_URL);
const client = {
  snapshot: async options => {
    const data = await metadata.catalog(options);
    setImageSourceHashes(data.hashes);
    return { registry: data.registry, commitSha: data.revision, hashes: data.hashes, source: 'worker' };
  },
  fallback: async signal => {
    const manifest = await loadBundledAvatars(signal);
    return manifest.styles.flatMap(style => style.franchises.map(group => ({ style: style.style, ...group })));
  },
  restore: snapshot => setImageSourceHashes(snapshot.hashes),
};
const loader = createAvatarCatalogLoader({ client, cache, catalog });

export const loadAvatarsCatalog = (forceRefresh = false) => loader.load(forceRefresh);
export const getCompiledAvatars = () => catalog.avatars();
export const getStylesSummary = (avatars = null) => styles(avatars || catalog.avatars());
export const getFranchisesSummary = (style = 'all', avatars = null) => franchises(style, avatars || catalog.avatars());
export const filterAvatars = (criteria, avatars = null) => filter(criteria, avatars || catalog.avatars());
export const resolveAvatarCdnUrl = path => avatarImageUrl(path, CONFIG.GITHUB_REPO, catalog.commitSha());
export function patchAvatarsAfterPublish(operations) {
  const avatars = catalog.patch(operations);
  cache.clear();
  return avatars;
}
