import { summarizeKeyValidation } from '../features/metadata/index.js';

export async function validateWizardKeys(snapshot, { validateKey, signal }) {
  signal?.throwIfAborted();
  const names = ['tmdb', 'mdblist', 'rpdb', 'tvdb', 'gemini', 'openrouter'];
  const entries = await Promise.all(names.map(async provider => {
    const key = snapshot.keys[provider];
    if (['gemini', 'openrouter'].includes(provider) && !snapshot.aiEnabled) return [provider, { status: 'skipped', valid: false }];
    if (!key) return [provider, { status: ['tmdb', 'mdblist'].includes(provider) ? 'required' : 'skipped', valid: false }];
    return [provider, await validateKey(provider, key, { signal })];
  }));
  signal?.throwIfAborted();
  return summarizeKeyValidation(snapshot, Object.fromEntries(entries));
}
