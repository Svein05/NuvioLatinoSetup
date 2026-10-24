import { scopedMetricsStorage } from '../shared/storage/metrics-scope.js';
import { CONFIG } from './config.js';
import { createCompletionStore, mountLiveCounter, createCompletionIdentity } from '../features/completions/index.js';
import { createCompletions } from '../workflows/completions.js';
import { createWorkerCounter } from '../integrations/completions/worker-counter.js';
import { initMobileHeaderMenu } from '../shared/ui/navigation/menu.js';
import { initNavOverflowMonitor } from '../shared/ui/navigation/overflow.js';

// Access storage lazily: privacy settings may throw from the global property's getter.
const storage = name => scopedMetricsStorage({
  getItem: key => (typeof window !== 'undefined' && window[name] ? window[name].getItem(key) : null),
  setItem: (key, value) => (typeof window !== 'undefined' && window[name] ? window[name].setItem(key, value) : undefined),
  removeItem: key => (typeof window !== 'undefined' && window[name] ? window[name].removeItem(key) : undefined),
});
const store = createCompletionStore({ local: storage('localStorage') });
const transport = createWorkerCounter(CONFIG.WORKER_API_URL, {
  clientId: createCompletionIdentity({ storage: storage('localStorage') }),
});
const counter = createCompletions({
  endpoints: [{ get: 'worker', hit: 'worker' }],
  readCount: transport.read,
  incrementCount: transport.increment,
  store,
});
let mounted;
let disposeMenu;
let disposeOverflow;
let started = false;
let lastResult = counter.snapshot();
const listeners = new Set();
const publish = result => { lastResult = result; listeners.forEach(listener => listener(result)); };

export function subscribeCompletionCount(listener) {
  const alreadyMounted = Boolean(mounted);
  listeners.add(listener);
  initCompletionsCounterUI();
  if (alreadyMounted) listener(lastResult);
  return () => listeners.delete(listener);
}

export function initCompletionsCounterUI() {
  started = true;
  if (mounted) return mounted;
  disposeMenu = initMobileHeaderMenu();
  disposeOverflow = initNavOverflowMonitor();
  mounted = mountLiveCounter({ counter, onUpdate: publish });
  return mounted;
}

export function recordSuccessfulCompletion(completionId) {
  return initCompletionsCounterUI().record(completionId);
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
