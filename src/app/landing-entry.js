import { initLandingPresentation } from '../pages/landing/presentation.js';
import { whenDocumentReady } from '../shared/ui/when-document-ready.js';

let dispose;
function initialize() {
  dispose?.();
  dispose = initLandingPresentation();
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
