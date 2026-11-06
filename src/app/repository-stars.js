import { CONFIG } from './config.js';
import { createPublicMetadataClient } from '../integrations/worker/public-metadata.js';
import { createRepositoryStars } from '../workflows/load-repository-stars.js';
import { createJsonStore } from '../shared/storage/json-store.js';
import { mountRepositoryStars } from '../shared/ui/navigation/repository-stars.js';

let dispose;
function initialize() {
  const store = createJsonStore({
    key: 'nuvio_github_stars_cache',
    storage: {
      getItem: key => localStorage.getItem(key),
      setItem: (key, value) => localStorage.setItem(key, value),
      removeItem: key => localStorage.removeItem(key),
    },
    reportWarning: () => console.warn('No se pudo acceder a la caché de estrellas de GitHub.'),
  });
  const stars = createRepositoryStars({ readCount: createPublicMetadataClient(CONFIG.WORKER_API_URL).stars, store });
  dispose = mountRepositoryStars(stars);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
else initialize();
window.addEventListener('pagehide', () => dispose?.());
window.addEventListener('pageshow', event => { if (event.persisted) initialize(); });
