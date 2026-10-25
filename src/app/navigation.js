import { initNavIndicator } from '../shared/ui/navigation/indicator.js';
import { initImageFallbacks } from '../shared/ui/image-fallbacks.js';

let dispose;
function initialize() {
  dispose?.();
  const indicator = initNavIndicator(), images = initImageFallbacks();
  dispose = () => { indicator(); images(); };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
else initialize();
window.addEventListener('pagehide', () => dispose?.());
window.addEventListener('pageshow', event => { if (event.persisted) initialize(); });
