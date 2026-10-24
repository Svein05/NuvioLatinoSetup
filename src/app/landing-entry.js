import { fetchTopAvatarKeys } from './avatar-ranking.js';
import { rankedCarouselPaths } from '../pages/landing/ranked-carousel.js';
import { avatarPaths } from '../pages/landing/avatar-carousel.js';
import { loadAvatarsCatalog, resolveAvatarCdnUrl } from './avatar-catalog.js';
import { loadBundledAvatars } from '../integrations/github/bundled-avatars.js';
import { initAvatarCarousel } from '../pages/landing/avatar-carousel.js';
import { initLandingPresentation } from '../pages/landing/presentation.js';
import { whenDocumentReady } from '../shared/ui/when-document-ready.js';

let dispose;
function initialize() {
  dispose?.();
  const presentation = initLandingPresentation();
  const request = new AbortController();
  let carousel = () => {};
  const ranking = fetchTopAvatarKeys(32);
  Promise.all([loadBundledAvatars(request.signal), ranking]).then(([manifest, entries]) => {
    if (!request.signal.aborted) carousel = initAvatarCarousel(rankedCarouselPaths(avatarPaths(manifest), entries));
  }).catch(() => {}).finally(() => {
    if (request.signal.aborted) return;
    Promise.all([loadAvatarsCatalog(), ranking]).then(([avatars, entries]) => {
      if (request.signal.aborted || !avatars.length) return;
      carousel();
      carousel = initAvatarCarousel(rankedCarouselPaths(avatars.map(avatar => resolveAvatarCdnUrl(avatar.path)), entries));
    }).catch(() => {});
  });
  dispose = () => { request.abort(); presentation(); carousel(); };
}
function suspend() { dispose?.(); }
function restore(event) { if (event.persisted) initialize(); }
whenDocumentReady(initialize);
window.addEventListener('pagehide', suspend);
window.addEventListener('pageshow', restore);
if (import.meta.hot) import.meta.hot.dispose(() => {
  suspend();
  window.removeEventListener('pagehide', suspend);
  window.removeEventListener('pageshow', restore);
});
