import { PUBLIC_COMPLETIONS_CONFIG } from './completions-config.js';
import { createCompletionStore, mountLiveCounter } from '../features/completions/index.js';
import { createCompletions } from '../workflows/completions.js';
import { requestCounterValue } from '../integrations/completions/counter-endpoint.js';
import { initMobileHeaderMenu } from '../shared/ui/navigation/menu.js';
import { initNavOverflowMonitor } from '../shared/ui/navigation/overflow.js';

// Access storage lazily: privacy settings may throw from the global property's getter.
const storage = name => ({
  getItem: key => (typeof window !== 'undefined' && window[name] ? window[name].getItem(key) : null),
  setItem: (key, value) => (typeof window !== 'undefined' && window[name] ? window[name].setItem(key, value) : undefined),
  removeItem: key => (typeof window !== 'undefined' && window[name] ? window[name].removeItem(key) : undefined),
});
const config = PUBLIC_COMPLETIONS_CONFIG;
const store = createCompletionStore({ local: storage('localStorage'), session: storage('sessionStorage') });
const counter = createCompletions({
  endpoints: [
    { get: config.primaryGet, hit: config.primaryHit },
    { get: config.fallbackGet, hit: config.fallbackHit },
  ],
  readCount: requestCounterValue,
  incrementCount: endpoint => requestCounterValue(endpoint, { increment: true }),
  store,
});
let mounted;
let disposeMenu;
let disposeOverflow;
let started = false;

export function initCompletionsCounterUI() {
  started = true;
  if (mounted) return mounted;
  disposeMenu = initMobileHeaderMenu();
  disposeOverflow = initNavOverflowMonitor();
  mounted = mountLiveCounter({ counter });
  return mounted;
}

export function recordSuccessfulCompletion() {
  return initCompletionsCounterUI().record();
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    mounted?.dispose();
    mounted = null;
    disposeMenu?.();
    disposeOverflow?.();
  });
  window.addEventListener('pageshow', event => { if (event.persisted && started) initCompletionsCounterUI(); });
}
