import { CONFIG } from './config.js';
import { fetchPosterFeed } from '../integrations/worker/poster-feed.js';
import { createPosterFeedLoader } from '../workflows/load-poster-feed.js';
import { initPosterWall } from '../shared/ui/poster-wall/wall.js';
import { savePosterWall } from '../shared/ui/poster-wall/continuity.js';
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
  const interior = /^\/(account|configuration)(?:\/|$)/.test(window.location.pathname);
  root.dataset.posterTheme = interior ? 'interior' : 'landing';
  let wall = initPosterWall({ root, feed: null, storage: storage('sessionStorage') });
  const request = new AbortController();
  dispose = preserve => { request.abort(); wall(preserve); };
  load({ signal: request.signal }).then(feed => {
    if (request.signal.aborted) return;
    if (!feed) return;
    wall(true);
    wall = initPosterWall({ root, feed, storage: storage('sessionStorage') });
  });
}
whenDocumentReady(start);
const save = () => {
  const root = document.querySelector('[data-poster-wall]');
  if (root) savePosterWall(root, storage('sessionStorage'));
};
window.addEventListener('pageswap', save);
window.addEventListener('pagehide', () => {
  save();
  const root = document.querySelector('[data-poster-wall].is-ready');
  if (root) root.dataset.posterRestored = 'true';
  dispose(true);
  dispose = () => {};
});
window.addEventListener('pageshow', event => { if (event.persisted) start(); });
if (import.meta.hot) import.meta.hot.dispose(() => dispose());
