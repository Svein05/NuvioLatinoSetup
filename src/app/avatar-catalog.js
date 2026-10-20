import { CONFIG } from './config.js';
import { createAvatarCatalogStore, getStylesSummary as styles, getFranchisesSummary as franchises,
  filterAvatars as filter } from '../features/avatars/index.js';
import { createAvatarCatalogClient } from '../integrations/github/avatar-catalog.js';
import { avatarImageUrl } from '../integrations/github/avatar-image-url.js';
import { createAvatarCatalogLoader } from '../workflows/load-avatar-catalog.js';
import { createJsonStore } from '../shared/storage/json-store.js';

const relativePrefix = /\/(account|configuration|documentation|modder)(?:\/|$)/.test(window.location.pathname) ? '../' : './';
const catalog = createAvatarCatalogStore({ relativePrefix });
const cache = createJsonStore({
  key: 'nuvio_avatars_tree_cache',
  storage: {
    getItem: key => sessionStorage.getItem(key),
    setItem: (key, value) => sessionStorage.setItem(key, value),
    removeItem: key => sessionStorage.removeItem(key),
  },
  reportWarning: () => console.warn('No se pudo acceder a la caché del catálogo de avatares.'),
});
const client = createAvatarCatalogClient(CONFIG.GITHUB_REPO);
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
