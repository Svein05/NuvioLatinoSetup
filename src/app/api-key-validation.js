import { validateProviderKey } from '../integrations/metadata-providers/validate-key.js';
import { validateWizardKeys } from '../workflows/validate-wizard-keys.js';
import { isDemoCode, demoKeyVerdict } from '../shared/demo/setup.js';

export function verifyWizardApiKeys(snapshot, signal) {
  return validateWizardKeys(snapshot, { validateKey: (provider, key, options) => isDemoCode(key)
    ? demoKeyVerdict(key, options.signal) : validateProviderKey(provider, key, options), signal });
}
