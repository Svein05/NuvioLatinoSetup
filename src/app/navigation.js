import { initNavIndicator } from '../shared/ui/navigation/indicator.js';
import { initImageFallbacks } from '../shared/ui/image-fallbacks.js';
import { initDeferredImages } from '../shared/media/deferred-images.js';

let dispose;
function initialize() {
  dispose?.();
  const indicator = initNavIndicator(), images = initImageFallbacks();
  const deferred = initDeferredImages();
  dispose = () => { indicator(); images(); deferred(); };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
else initialize();
window.addEventListener('pagehide', () => dispose?.());
window.addEventListener('pageshow', event => { if (event.persisted) initialize(); });
