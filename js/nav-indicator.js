// Compatibility entry for pages still importing the legacy path.
import { initNavIndicator } from '../src/shared/ui/navigation/indicator.js';
export { initNavIndicator };
let dispose;
function initialize() { dispose?.(); dispose = initNavIndicator(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
else initialize();
window.addEventListener('pagehide', () => dispose?.());
window.addEventListener('pageshow', event => { if (event.persisted) initialize(); });
