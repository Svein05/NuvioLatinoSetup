import { createEmptyOverview } from './overview-defaults.js';
import { createSessionStore } from '../../features/auth/index.js';

export function createInitialAccountState() {
  return {
    session: null,
    profiles: [],
    selectedProfileId: null,
    activeSection: 'overview',
    hasChosenProfileInSession: false,
    selectedAvatarUrl: null,
    originalAvatarUrl: null,
    mostUsedKeys: null,
    _isLoadingMostUsed: false,
    avatarFilters: {
      style: 'all',
      franchise: 'all',
      query: '',
    },
    overviewData: createEmptyOverview(),
    installedAddons: [],
    originalInstalledAddons: [],
    addonHistory: [],
    _editingAddonIndex: null,
    _deletingAddonIndex: null,
    _aioStreamsDraft: { debrids: {}, validatedKeys: {} },
    manifestCache: new Map(),
    aioAddon: null,
    aioUuid: null,
    aioConfig: null,
    originalAioConfig: null,
    aioPassword: 'NuvioSetupMaster2026',
    aioProtected: false,
    posterEngine: 'default',
    customPosterUrl: '',
    originalPosterEngine: 'default',
    originalCustomPosterUrl: '',
    settings: {
      enrichment_enabled: true,
      ratings_enabled: true,
      tmdb_language: 'es-MX',
      tmdb_api_key: '',
      mdblist_api_key: '',
    },
    originalSettings: {},
    _rawStreamBadgeSettings: null,
    dirty: {
      aiometadata: false,
      settings: false,
      avatar: false,
      addons: false,
    },
    isSaving: false,
    isLoadingProfile: false,
    isLoadingMetadata: false,
    isLoadingAvatars: false,
    loadErrors: {},
    metadataError: '',
    avatarCatalogError: '',
  };
}

export const accountState = createInitialAccountState();

const storage = typeof sessionStorage !== 'undefined' ? sessionStorage : undefined;
export const accountSessionStore = createSessionStore({ key: 'nuvio_account_session_v1', storage });

export function loadSession(state = accountState, store = accountSessionStore) {
  state.session = store.read();
  return state.session;
}

export function saveSession(sessionData, state = accountState, store = accountSessionStore) {
  state.session = sessionData;
  store.write(sessionData);
}

export function clearSession(state = accountState, store = accountSessionStore) {
  state.session = null;
  state.profiles = [];
  state.selectedProfileId = null;
  state.aioConfig = null;
  state.aioUuid = null;
  state.aioProtected = false;
  store.clear();
}

export function updateSaveButtonUI(root = document, state = accountState) {
  const btn = root.querySelector?.('#btnAccountSave');
  const badge = root.querySelector?.('#accountSaveCountBadge');
  if (!btn) return;

  const changedModules = Object.keys(state.dirty).filter(k => state.dirty[k]);
  const hasChanges = changedModules.length > 0;

  if (hasChanges) {
    btn.classList.add('has-changes');
    btn.disabled = Boolean(state.isSaving || state.isLoadingProfile);
    if (badge) {
      badge.textContent = `${changedModules.length}`;
      badge.classList.remove('hidden');
    }
  } else {
    btn.classList.remove('has-changes');
    btn.disabled = state.isSaving;
    if (badge) badge.classList.add('hidden');
  }
}

export function markStateDirty(moduleName, isDirty = true, state = accountState, onDirtyChanged) {
  if (Object.prototype.hasOwnProperty.call(state.dirty, moduleName)) {
    state.dirty[moduleName] = isDirty;
    onDirtyChanged?.();
  }
}
