import { validateProviderKey } from '../integrations/metadata-providers/validate-key.js';
import { validateWizardKeys } from '../workflows/validate-wizard-keys.js';

export function verifyWizardApiKeys(snapshot, signal) {
  return validateWizardKeys(snapshot, { validateKey: validateProviderKey, signal });
}
