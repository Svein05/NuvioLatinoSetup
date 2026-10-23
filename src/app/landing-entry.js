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
  loadBundledAvatars(request.signal).then(manifest => {
    if (!request.signal.aborted) carousel = initAvatarCarousel(manifest);
  }).catch(() => {});
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
