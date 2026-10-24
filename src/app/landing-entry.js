import './poster-background.js';
import { fetchAvatarRankingSummary } from './avatar-ranking.js';
import { subscribeCompletionCount } from './completions.js';
import { rankedCarouselPaths } from '../pages/landing/ranked-carousel.js';
import { avatarPaths } from '../pages/landing/avatar-carousel.js';
import { loadAvatarsCatalog, resolveAvatarCdnUrl } from './avatar-catalog.js';
import { loadBundledAvatars } from '../integrations/github/bundled-avatars.js';
import { initAvatarCarousel } from '../pages/landing/avatar-carousel.js';
import { initLandingPresentation } from '../pages/landing/presentation.js';
import { initLandingMetrics } from '../pages/landing/metrics.js';
import { whenDocumentReady } from '../shared/ui/when-document-ready.js';

let dispose;
function initialize() {
  dispose?.();
  const presentation = initLandingPresentation();
  const request = new AbortController();
  let carousel = () => {};
  const ranking = fetchAvatarRankingSummary(32, { signal: request.signal });
  const metrics = initLandingMetrics({ subscribe: subscribeCompletionCount, ranking });
  Promise.all([loadBundledAvatars(request.signal), ranking]).then(([manifest, summary]) => {
    if (!request.signal.aborted) carousel = initAvatarCarousel(rankedCarouselPaths(avatarPaths(manifest), summary.items));
  }).catch(() => {}).finally(() => {
    if (request.signal.aborted) return;
    Promise.all([loadAvatarsCatalog(), ranking]).then(([avatars, summary]) => {
      if (request.signal.aborted || !avatars.length) return;
      carousel();
      carousel = initAvatarCarousel(rankedCarouselPaths(avatars.map(avatar => resolveAvatarCdnUrl(avatar.path)), summary.items));
    }).catch(() => {});
  });
  dispose = () => { request.abort(); presentation(); metrics(); carousel(); };
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
