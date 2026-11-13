/** Reserved UI-only credentials must never reach external providers or provisioning. */
export const isDemoCode = value => /^NUVIO-DEMO-/i.test(String(value || '').trim());
export const demoScenario = value => String(value || '').trim().toUpperCase().replace(/^NUVIO-DEMO-/, '');
export const isDemoSetup = state => Object.values(state.apiKeys || {}).some(isDemoCode)
  || Boolean(state.stremio?.session?.demo)
  || Object.values(state.connections?.accounts || {}).some(account => account.demo || isDemoCode(account.tokenId))
  || Object.values(state.connections?.drafts || {}).some(isDemoCode);
export const DEMO_LOCK_MESSAGE = 'Demostración: completa la configuración solo con conexiones y claves reales.';

export function assertRealSetup(state) {
  if (isDemoSetup(state)) throw new Error(DEMO_LOCK_MESSAGE);
}

export function demoDelay(signal, milliseconds = 650) {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, milliseconds);
    signal?.addEventListener('abort', abort, { once: true });
  });
}

export async function demoKeyVerdict(key, signal) {
  await demoDelay(signal, demoScenario(key) === 'SLOW' ? 3500 : 650);
  const scenario = demoScenario(key);
  return { valid: ['OK', 'SLOW'].includes(scenario), status: ['OK', 'SLOW'].includes(scenario) ? 'valid'
    : scenario === 'ERROR' ? 'unavailable' : 'invalid', demo: true };
}
