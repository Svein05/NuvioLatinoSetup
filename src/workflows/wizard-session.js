import { createJsonStore } from '../shared/storage/json-store.js';
import { sanitizeSession, sessionExpired } from '../features/auth/index.js';

/** Preserve navigation context while stripping all password fields from legacy snapshots. */
function sanitizeWizardSnapshot(value, now) {
  const auth = sanitizeSession(value?.auth);
  if (!auth || sessionExpired(auth, now)) return null;
  return {
    auth: { ...auth, isAuthenticated: true },
    profiles: Array.isArray(value.profiles) ? value.profiles : [],
    selectedProfileId: value.selectedProfileId ?? null,
    selectedProfileName: typeof value.selectedProfileName === 'string' ? value.selectedProfileName : '',
    newlyCreatedProfileIds: Array.isArray(value.newlyCreatedProfileIds) ? value.newlyCreatedProfileIds.map(String) : [],
    maxUnlockedStep: Number.isInteger(value.maxUnlockedStep) ? Math.min(7, Math.max(2, value.maxUnlockedStep)) : 2,
    currentStep: Number.isInteger(value.currentStep) ? Math.min(7, Math.max(2, value.currentStep)) : 2,
  };
}

export function createWizardSessionStore({ now = Date.now, ...options }) {
  const store = createJsonStore(options);
  return {
    read() {
      const value = sanitizeWizardSnapshot(store.read(), now());
      if (!value) { store.clear(); return null; }
      store.write(value);
      return value;
    },
    write(snapshot) {
      const value = sanitizeWizardSnapshot(snapshot, now());
      return value ? store.write(value) : false;
    },
    clear: store.clear,
  };
}
