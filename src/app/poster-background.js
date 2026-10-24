import { CONFIG } from './config.js';
import { fetchPosterFeed } from '../integrations/worker/poster-feed.js';
import { createPosterFeedLoader } from '../workflows/load-poster-feed.js';
import { initPosterWall } from '../shared/ui/poster-wall/wall.js';
import { whenDocumentReady } from '../shared/ui/when-document-ready.js';

const storage = name => ({
  getItem: key => window[name].getItem(key),
  setItem: (key, value) => window[name].setItem(key, value),
});
const load = createPosterFeedLoader({ read: options => fetchPosterFeed(CONFIG.WORKER_API_URL, options), storage: storage('localStorage') });
let dispose = () => {};

function start() {
  dispose();
  const root = document.querySelector('[data-poster-wall]');
  if (!root) return;
  const button = document.querySelector('[data-poster-pause-control]');
  const interior = /^\/(account|configuration)(?:\/|$)/.test(window.location.pathname);
  root.dataset.posterTheme = interior ? 'interior' : 'landing';
  let wall = initPosterWall({ root, button, feed: null, storage: storage('sessionStorage') });
  const request = new AbortController();
  dispose = () => { request.abort(); wall(); };
  load({ signal: request.signal }).then(feed => {
    if (!feed || request.signal.aborted) return;
    wall();
    wall = initPosterWall({ root, button, feed, storage: storage('sessionStorage') });
  });
}
whenDocumentReady(start);
window.addEventListener('pagehide', () => dispose());
window.addEventListener('pageshow', event => { if (event.persisted) start(); });
if (import.meta.hot) import.meta.hot.dispose(() => dispose());
