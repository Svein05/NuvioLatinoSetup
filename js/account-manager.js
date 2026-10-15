/**
 * Controlador Modular del Gestor de Cuenta y Perfil (/account)
 * Ecosistema Nuvio Metadata Latino & AIOMetadata
 */
import { CONFIG } from './config.js';
import { NuvioClient } from './nuvio-client.js';
import { AIOMetadataClient } from './aiometadata-client.js';
import { state, isAioMetadataAddon } from './state.js';
import { 
  getCompiledAvatars, 
  getStylesSummary, 
  getFranchisesSummary, 
  filterAvatars, 
  formatCharacterName, 
  formatFranchiseName, 
  formatStyleName,
  resolveAvatarCdnUrl,
  loadAvatarsCatalog
} from './avatars-data.js';

// Clave segura para sesión bajo demanda en la pestaña actual
const SESSION_KEY = 'nuvio_account_session_v1';

// Estado reactivo local del gestor de cuenta
export const accountState = {
  session: null, // { accessToken, userId, email }
  profiles: [],
  selectedProfileId: null,
  activeSection: 'overview', // 'overview' | 'avatars' | 'aiometadata' | 'settings'
  hasChosenProfileInSession: false,

  // Avatar del perfil seleccionado y filtros de catálogo
  selectedAvatarUrl: null,
  originalAvatarUrl: null,
  avatarFilters: {
    style: 'all',
    franchise: 'all',
    query: ''
  },

  // Métricas y contenidos de la pestaña Resumen
  overviewData: {
    pluginsCount: 0,
    addonsCount: 0,
    progressCount: 0,
    libraryCount: 0,
    watchedCount: 0,
    currentlyWatching: [],
    recentlyWatched: []
  },

  installedAddons: [],

  // AIOMetadata vinculado y opciones exclusivas del addon
  aioAddon: null,
  aioUuid: null,
  aioConfig: null,
  originalAioConfig: null,
  aioPassword: 'NuvioSetupMaster2026',
  aioProtected: false, // Flag si requiere contraseña personalizada
  posterEngine: 'default', // 'default' | 'betterposter' | 'postersplus' | 'custom_external'
  customPosterUrl: '',

  // Ajustes de Nuvio & Credenciales (TMDB / MDBList)
  settings: {
    enrichment_enabled: true,
    ratings_enabled: true,
    tmdb_language: 'es-MX',
    tmdb_api_key: '',
    mdblist_api_key: ''
  },
  originalSettings: {},
  _rawStreamBadgeSettings: null, // Preservar badges existentes en la TV del usuario sin alterarlos

  // Dirty State Tracker (Rastreo inteligente de cambios para guardar solo lo necesario)
  dirty: {
    aiometadata: false,
    settings: false,
    avatar: false
  },

  isSaving: false
};

// ============================================================
// TOAST NOTIFICATIONS LAT-ADD STYLE
// ============================================================

export function showToast(message, type = 'info') {
  let container = document.getElementById('latToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'latToastContainer';
    container.className = 'fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const iconClass = type === 'success' 
    ? 'fa-solid fa-circle-check text-emerald-400' 
    : (type === 'error' ? 'fa-solid fa-circle-xmark text-rose-400' : 'fa-solid fa-circle-info text-amber-300');

  toast.className = 'lat-toast is-entering';
  toast.innerHTML = `
    <i class="${iconClass}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('is-visible'));

  setTimeout(() => {
    toast.classList.remove('is-visible');
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============================================================
// CONTROLADOR DE ALTERNAR VISIBILIDAD DE CONTRASEÑA ("OJITO")
// ============================================================

export function setupPasswordToggles() {
  document.querySelectorAll('.btn-toggle-key').forEach((btn) => {
    if (btn.dataset.toggleBound === 'true') return;
    btn.dataset.toggleBound = 'true';

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      const icon = btn.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        if (icon) {
          icon.className = 'fa-solid fa-eye-slash text-xs pointer-events-none';
        }
        btn.title = 'Ocultar contraseña';
      } else {
        input.type = 'password';
        if (icon) {
          icon.className = 'fa-solid fa-eye text-xs pointer-events-none';
        }
        btn.title = 'Mostrar contraseña';
      }
    });
  });
}

// ============================================================
// GESTIÓN DE SESIÓN AISLADA (SESSION STORAGE)
// ============================================================

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      accountState.session = JSON.parse(raw);
      return accountState.session;
    }
  } catch (_) {}
  return null;
}

function saveSession(sessionData) {
  accountState.session = sessionData;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  } catch (_) {}
}

function clearSession() {
  accountState.session = null;
  accountState.profiles = [];
  accountState.selectedProfileId = null;
  accountState.aioConfig = null;
  accountState.aioUuid = null;
  accountState.aioProtected = false;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (_) {}
}

// ============================================================
// ACTUALIZACIÓN DEL BOTÓN INTELIGENTE "GUARDAR CAMBIOS"
// ============================================================

export function updateSaveButton() {
  const btn = document.getElementById('btnAccountSave');
  const badge = document.getElementById('accountSaveCountBadge');
  if (!btn) return;

  const changedModules = Object.keys(accountState.dirty).filter(k => accountState.dirty[k]);
  const hasChanges = changedModules.length > 0;

  if (hasChanges) {
    btn.classList.add('has-changes');
    btn.disabled = false;
    if (badge) {
      badge.textContent = `${changedModules.length}`;
      badge.classList.remove('hidden');
    }
  } else {
    btn.classList.remove('has-changes');
    btn.disabled = accountState.isSaving;
    if (badge) badge.classList.add('hidden');
  }
}

export function markDirty(moduleName, isDirty = true) {
  if (accountState.dirty.hasOwnProperty(moduleName)) {
    accountState.dirty[moduleName] = isDirty;
    updateSaveButton();
  }
}

// ============================================================
// CARGA Y CAMBIO DE PERFILES NUVIO
// ============================================================

export async function fetchProfiles() {
  if (!accountState.session?.accessToken) return [];

  const profiles = await NuvioClient.getProfiles({
    apiUrl: CONFIG.NUVIO_API_URL,
    apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
    accessToken: accountState.session.accessToken,
    userId: accountState.session.userId
  });

  accountState.profiles = profiles;
  if (!accountState.selectedProfileId && profiles.length > 0) {
    accountState.selectedProfileId = profiles[0].profile_index ?? profiles[0].id;
  }
  return profiles;
}

export async function selectProfile(profileId) {
  accountState.selectedProfileId = Number(profileId) || profileId;
  accountState.hasChosenProfileInSession = true;
  const profile = accountState.profiles.find(p => Number(p.profile_index ?? p.id) === accountState.selectedProfileId);

  // Actualizar UI del perfil activo en la barra de navegación
  const activeAvatar = document.getElementById('sidebarActiveAvatar');
  const activeName = document.getElementById('sidebarActiveName');
  if (activeAvatar && profile) activeAvatar.src = profile.avatar_url;
  if (activeName && profile) activeName.textContent = profile.name;

  // Actualizar avatar en memoria para la sección de avatares
  accountState.selectedAvatarUrl = profile?.avatar_url || null;
  accountState.originalAvatarUrl = profile?.avatar_url || null;

  // Actualizar popover
  renderProfilePopover();

  // Reset de estados dirty ante cambio de perfil
  accountState.dirty = { aiometadata: false, settings: false, avatar: false };
  updateSaveButton();

  // Respetar la sección actualmente activa o activar Resumen por defecto
  const targetSection = accountState.activeSection || 'overview';
  switchSection(targetSection);

  // Cargar concurrentemente los datos del perfil seleccionado
  await Promise.all([
    loadProfileAddonsAndAio(),
    loadProfileSettings(),
    loadProfileOverview()
  ]);
}

// ============================================================
// CARGA DE ADDONS Y DETECCIÓN AUTOMÁTICA DE AIOMETADATA
// ============================================================

async function loadProfileAddonsAndAio() {
  const profId = accountState.selectedProfileId;
  if (!profId || !accountState.session) return;

  try {
    const addons = await NuvioClient.listAddons({
      apiUrl: CONFIG.NUVIO_API_URL,
      apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
      accessToken: accountState.session.accessToken,
      userId: accountState.session.userId,
      profileId: profId
    });

    accountState.installedAddons = addons;
    if (accountState.overviewData) {
      accountState.overviewData.addonsCount = addons.length;
      const elAddons = document.getElementById('metricAddonsCount');
      if (elAddons) elAddons.textContent = addons.length;
    }

    // Buscar addon de AIOMetadata en la lista instalada
    const aio = addons.find(a => isAioMetadataAddon(a));
    accountState.aioAddon = aio || null;

    if (aio) {
      const url = aio.manifest_url || aio.url || '';
      // Extraer UUID de patrones: /stremio/:uuid/manifest.json o /manifest.json
      const uuidMatch = url.match(/\/stremio\/([a-zA-Z0-9_-]+)\/manifest\.json/i) ||
                        url.match(/\/([a-zA-Z0-9_-]{8,})\/manifest\.json/i);
      if (uuidMatch && uuidMatch[1]) {
        accountState.aioUuid = uuidMatch[1];
        await loadAioConfigByUuid(accountState.aioUuid);
      }
    } else {
      accountState.aioUuid = null;
      accountState.aioConfig = null;
      accountState.aioProtected = false;
      renderAioSection();
    }
  } catch (err) {
    console.warn('[AccountManager] Error cargando addons de perfil:', err);
  }
}

export async function loadAioConfigByUuid(uuid, password = null) {
  if (!uuid) return;
  const statusEl = document.getElementById('aioLoadingStatus');
  if (statusEl) statusEl.textContent = 'Cargando configuración de AIOMetadata...';

  // Determinar contraseña: explícita -> accountState -> wizardSession -> master fallback
  let passToTry = password || accountState.aioPassword;
  if (!passToTry || passToTry === 'NuvioSetupMaster2026') {
    try {
      const rawWizard = sessionStorage.getItem('nuvio_wizard_auth');
      if (rawWizard) {
        const parsed = JSON.parse(rawWizard);
        if (parsed?.aioPassword) passToTry = parsed.aioPassword;
      }
    } catch (_) {}
  }
  if (!passToTry) passToTry = 'NuvioSetupMaster2026';

  try {
    const res = await AIOMetadataClient.loadWithFallbacks(
      CONFIG.AIOMETADATA_INSTANCES,
      uuid,
      passToTry
    );

    accountState.aioUuid = uuid;
    accountState.aioPassword = passToTry;
    accountState.aioProtected = false;
    accountState.aioConfig = JSON.parse(JSON.stringify(res.config));
    accountState.originalAioConfig = JSON.parse(JSON.stringify(res.config));

    // Detectar motor de pósters activo en AIOMetadata
    const cfg = accountState.aioConfig.config || accountState.aioConfig;
    const provider = cfg.posterRatingProvider;
    const customPattern = cfg.customPosterUrlPattern || '';

    if (provider === 'custom') {
      if (customPattern.includes('btttr.cc')) {
        accountState.posterEngine = 'betterposter';
      } else if (customPattern.includes('postersplus.stremio.ru')) {
        accountState.posterEngine = 'postersplus';
      } else if (customPattern) {
        accountState.posterEngine = 'custom_external';
      } else {
        accountState.posterEngine = 'betterposter';
      }
      accountState.customPosterUrl = customPattern;
    } else {
      accountState.posterEngine = 'default';
      accountState.customPosterUrl = customPattern;
    }

    // Hidratar API keys si estaban vacías en los ajustes
    const aioKeys = cfg.apiKeys || {};
    if (aioKeys.tmdb && !accountState.settings.tmdb_api_key) {
      accountState.settings.tmdb_api_key = aioKeys.tmdb;
      accountState.originalSettings.tmdb_api_key = aioKeys.tmdb;
      state.apiKeys.tmdb = aioKeys.tmdb;
    }
    if (aioKeys.mdblist && !accountState.settings.mdblist_api_key) {
      accountState.settings.mdblist_api_key = aioKeys.mdblist;
      accountState.originalSettings.mdblist_api_key = aioKeys.mdblist;
      state.apiKeys.mdblist = aioKeys.mdblist;
    }

    accountState.dirty.aiometadata = false;
    updateSaveButton();
    renderAioSection();
    renderSettingsSection();
    if (accountState.overviewData) renderOverviewSection();
    if (statusEl) statusEl.textContent = 'Configuración sincronizada.';
    if (password) showToast('✓ Addon AIOMetadata desbloqueado y sincronizado.', 'success');
  } catch (err) {
    console.warn('[AccountManager] AIOMetadata load:', err.message);
    const isAuthErr = /401|invalid|password|contraseña/i.test(err.message);
    if (isAuthErr) {
      accountState.aioProtected = true;
      accountState.aioUuid = uuid;
      renderAioSection();
    } else {
      if (statusEl) statusEl.textContent = 'No se pudo cargar la configuración de AIOMetadata.';
      showToast(`AIOMetadata: ${err.message}`, 'warning');
    }
    if (password) throw err;
  }
}

// ============================================================
// CARGA DE AJUSTES DEL PERFIL & PROVEEDORES (TMDB / MDBLIST)
// ============================================================

async function loadProfileSettings() {
  const profId = accountState.selectedProfileId;
  if (!profId || !accountState.session) return;

  try {
    const [blob, credentials] = await Promise.all([
      NuvioClient.pullProfileSettings({
        apiUrl: CONFIG.NUVIO_API_URL,
        apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
        accessToken: accountState.session.accessToken,
        profileId: profId,
        platform: 'tv'
      }).catch(() => null),
      NuvioClient.pullProviderCredentials({
        apiUrl: CONFIG.NUVIO_API_URL,
        apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
        accessToken: accountState.session.accessToken,
        profileId: profId
      }).catch(() => [])
    ]);

    // Extractor multi-envoltura resiliente (features, p_settings_json, settings_json, settings)
    let features = null;
    let rawBlob = blob;
    if (typeof rawBlob === 'string') {
      try { rawBlob = JSON.parse(rawBlob); } catch (_) {}
    }
    if (rawBlob && typeof rawBlob === 'object') {
      let pSettings = rawBlob.p_settings_json || rawBlob.settings_json || rawBlob.p_settings || rawBlob.settings;
      if (typeof pSettings === 'string') {
        try { pSettings = JSON.parse(pSettings); } catch (_) {}
      }
      features = pSettings?.features || rawBlob.features || pSettings || rawBlob;
    } else {
      features = {};
    }
    if (typeof features === 'string') {
      try { features = JSON.parse(features); } catch (_) { features = {}; }
    }

    const tmdb = features.tmdb_settings || features.tmdb || {};
    const mdblist = features.mdblist_settings || features.mdblist || {};
    const streamBadges = features.stream_badge_settings || features.stream_badges || features.badges || null;

    // Preservar internamente los badges originales de Nuvio sin alterarlos
    if (streamBadges) {
      accountState._rawStreamBadgeSettings = streamBadges;
    }

    // 1. Extraer credenciales oficiales de Nuvio (soportando objeto o string JSON)
    const tmdbCred = (credentials || []).find(c => String(c.provider || '').toLowerCase() === 'tmdb');
    const mdblistCred = (credentials || []).find(c => String(c.provider || '').toLowerCase() === 'mdblist');

    const extractCredKey = (cred) => {
      if (!cred) return '';
      let json = cred.credential_json || cred.credentials || cred;
      if (typeof json === 'string') {
        try { json = JSON.parse(json); } catch (_) {}
      }
      if (typeof json === 'object' && json !== null) {
        return json.api_key || json.apiKey || json.key || json.value || '';
      }
      return typeof cred.api_key === 'string' ? cred.api_key : '';
    };

    const credTmdbKey = extractCredKey(tmdbCred);
    const credMdblistKey = extractCredKey(mdblistCred);

    // 2. Extraer del blob de ajustes de Nuvio
    const blobTmdbKey = tmdb.tmdb_api_key?.value || (typeof tmdb.tmdb_api_key === 'string' ? tmdb.tmdb_api_key : '');
    const blobMdblistKey = mdblist.mdblist_api_key?.value || (typeof mdblist.mdblist_api_key === 'string' ? mdblist.mdblist_api_key : '');

    // 3. Extraer de AIOMetadata si ya está cargado
    const aioKeys = accountState.aioConfig?.apiKeys || accountState.aioConfig?.config?.apiKeys || {};
    const aioTmdbKey = aioKeys.tmdb || '';
    const aioMdblistKey = aioKeys.mdblist || '';

    // 4. Claves previas en accountState o state.apiKeys
    const prevTmdbKey = accountState.settings.tmdb_api_key || state.apiKeys.tmdb || '';
    const prevMdblistKey = accountState.settings.mdblist_api_key || state.apiKeys.mdblist || '';

    // Priorizar claves no vacías existentes en cualquiera de las fuentes
    const resolvedTmdbKey = (credTmdbKey || blobTmdbKey || aioTmdbKey || prevTmdbKey || '').trim();
    const resolvedMdblistKey = (credMdblistKey || blobMdblistKey || aioMdblistKey || prevMdblistKey || '').trim();

    accountState.settings = {
      enrichment_enabled: tmdb.tmdb_enabled?.value !== false,
      ratings_enabled: mdblist.mdblist_enabled?.value !== false,
      tmdb_language: tmdb.tmdb_language?.value || 'es-MX',
      tmdb_api_key: resolvedTmdbKey,
      mdblist_api_key: resolvedMdblistKey
    };
    accountState.originalSettings = JSON.parse(JSON.stringify(accountState.settings));
    accountState.dirty.settings = false;

    // Sincronizar también con state.apiKeys para coherencia en todo el ecosistema
    if (resolvedTmdbKey) state.apiKeys.tmdb = resolvedTmdbKey;
    if (resolvedMdblistKey) state.apiKeys.mdblist = resolvedMdblistKey;

    updateSaveButton();
    renderSettingsSection();
    if (accountState.overviewData) renderOverviewSection();
  } catch (err) {
    console.warn('[AccountManager] Error cargando ajustes de perfil:', err);
  }
}

// ============================================================
// RENDERIZADO VISUAL DE SECCIONES
// ============================================================

// ============================================================
// GESTOR DE POPOVER DESPLEGABLE Y MODALES DE PERFILES
// ============================================================

export function setupProfilePopover() {
  const trigger = document.getElementById('btnAccountProfileTrigger');
  const popover = document.getElementById('accountProfilePopover');
  const chevron = document.getElementById('sidebarActiveChevron');

  if (!trigger || !popover || trigger.dataset.bound === 'true') return;
  trigger.dataset.bound = 'true';

  const togglePopover = (forceState = null) => {
    const isCurrentlyHidden = popover.classList.contains('hidden');
    const shouldShow = forceState !== null ? forceState : isCurrentlyHidden;

    if (shouldShow) {
      renderProfilePopover();
      popover.classList.remove('hidden');
      trigger.setAttribute('aria-expanded', 'true');
      if (chevron) chevron.classList.add('rotate-180');
    } else {
      popover.classList.add('hidden');
      trigger.setAttribute('aria-expanded', 'false');
      if (chevron) chevron.classList.remove('rotate-180');
    }
  };

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePopover();
  });

  // Cerrar al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!popover.classList.contains('hidden') && !popover.contains(e.target) && !trigger.contains(e.target)) {
      togglePopover(false);
    }
  });

  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !popover.classList.contains('hidden')) {
      togglePopover(false);
    }
  });
}

export function renderProfilePopover() {
  const list = document.getElementById('popoverProfilesList');
  const countBadge = document.getElementById('popoverProfileCount');
  const addContainer = document.getElementById('popoverAddProfileContainer');
  if (!list) return;

  const profiles = accountState.profiles || [];
  if (countBadge) countBadge.textContent = `${profiles.length}/6`;

  // Control de visibilidad del botón Agregar Perfil (solo si < 6)
  if (addContainer) {
    if (profiles.length >= 6) {
      addContainer.classList.add('hidden');
    } else {
      addContainer.classList.remove('hidden');
    }
  }

  list.innerHTML = profiles.map(p => {
    const id = Number(p.profile_index ?? p.id);
    const isSelected = id === Number(accountState.selectedProfileId);

    return `
      <div class="popover-profile-row ${isSelected ? 'is-active' : ''}" data-profile-id="${id}">
        <div class="flex items-center gap-2.5 min-w-0 flex-1 pointer-events-none">
          <img src="${p.avatar_url}" alt="${p.name}" class="w-7 h-7 rounded-full border border-white/20 bg-black/40 object-cover shrink-0">
          <div class="min-w-0 flex-1">
            <div class="text-xs font-semibold text-white truncate profile-row-name">${p.name}</div>
          </div>
          ${isSelected ? '<i class="fa-solid fa-check text-xs text-[#ffd479] mr-1"></i>' : ''}
        </div>
        <button type="button" class="btn-popover-edit" data-id="${id}" title="Editar perfil">
          <i class="fa-solid fa-pencil text-[11px] pointer-events-none"></i>
        </button>
      </div>
    `;
  }).join('');

  // Eventos de filas
  list.querySelectorAll('.popover-profile-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.btn-popover-edit')) return;
      const id = row.dataset.profileId;
      if (id && Number(id) !== Number(accountState.selectedProfileId)) {
        selectProfile(id);
      }
      const popover = document.getElementById('accountProfilePopover');
      const chevron = document.getElementById('sidebarActiveChevron');
      if (popover) popover.classList.add('hidden');
      if (chevron) chevron.classList.remove('rotate-180');
    });
  });

  list.querySelectorAll('.btn-popover-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const popover = document.getElementById('accountProfilePopover');
      const chevron = document.getElementById('sidebarActiveChevron');
      if (popover) popover.classList.add('hidden');
      if (chevron) chevron.classList.remove('rotate-180');
      openEditProfileModal(id);
    });
  });
}

// Modal "¿Qué perfil quieres gestionar?"
export function showSelectProfilePrompt() {
  const modal = document.getElementById('modalSelectProfilePrompt');
  const grid = document.getElementById('modalProfileCardsGrid');
  if (!modal || !grid) return;

  const profiles = accountState.profiles || [];
  grid.innerHTML = profiles.map(p => {
    const id = Number(p.profile_index ?? p.id);
    const isSelected = id === Number(accountState.selectedProfileId);
    return `
      <div class="p-4 rounded-2xl bg-white/[0.04] border ${isSelected ? 'border-[#ffd479] bg-white/[0.08]' : 'border-white/10'} hover:border-[#ffd479]/60 hover:bg-white/[0.08] transition-all cursor-pointer flex flex-col items-center gap-2.5 group select-none shadow-sm" data-profile-id="${id}">
        <div class="relative">
          <img src="${p.avatar_url}" alt="${p.name}" class="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white/20 group-hover:border-[#ffd479] group-hover:scale-105 transition-all object-cover shadow-lg">
          ${isSelected ? '<span class="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#ffd479] text-black text-[10px] flex items-center justify-center font-bold shadow-md"><i class="fa-solid fa-check"></i></span>' : ''}
        </div>
        <div class="text-center w-full">
          <h4 class="text-xs sm:text-sm font-semibold text-white group-hover:text-[#ffd479] transition-colors truncate max-w-[130px] mx-auto">${p.name}</h4>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('[data-profile-id]').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.profileId;
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      selectProfile(id);
    });
  });

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

export function closeSelectProfilePrompt() {
  const modal = document.getElementById('modalSelectProfilePrompt');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

// Modal Editar Perfil
export function openEditProfileModal(profileId) {
  const modal = document.getElementById('modalEditProfile');
  const targetIdInput = document.getElementById('editProfileTargetId');
  const nameInput = document.getElementById('inputEditProfileName');
  const subEl = document.getElementById('modalEditProfileSub');
  const btnDelete = document.getElementById('btnDeleteProfileInModal');
  if (!modal) return;

  const id = Number(profileId);
  const profile = (accountState.profiles || []).find(p => Number(p.profile_index ?? p.id) === id);
  if (!profile) return;

  if (targetIdInput) targetIdInput.value = id;
  if (nameInput) nameInput.value = profile.name;
  if (subEl) subEl.textContent = 'Personaliza el nombre de tu perfil';

  // Solo permitir eliminar si hay más de 1 perfil en la cuenta
  if (btnDelete) {
    if ((accountState.profiles || []).length <= 1) {
      btnDelete.classList.add('hidden');
    } else {
      btnDelete.classList.remove('hidden');
    }
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (nameInput) setTimeout(() => nameInput.focus(), 50);
}

export function closeEditProfileModal() {
  const modal = document.getElementById('modalEditProfile');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

// Modal Crear Perfil
let createProfileAvatarUrl = null;
let createProfileAvatarFilters = { franchise: 'all', query: '' };

export function openCreateProfileModal() {
  if ((accountState.profiles || []).length >= 6) {
    showToast('Has alcanzado el límite máximo de 6 perfiles en Nuvio.', 'warning');
    return;
  }
  createProfileAvatarUrl = null;
  const preview = document.getElementById('createProfileAvatarPreview');
  if (preview) {
    preview.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=NuevoPerfil';
  }
  const modal = document.getElementById('modalCreateProfile');
  const nameInput = document.getElementById('inputCreateProfileName');
  if (!modal) return;

  if (nameInput) nameInput.value = '';
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (nameInput) setTimeout(() => nameInput.focus(), 50);
}

export function closeCreateProfileModal() {
  const modal = document.getElementById('modalCreateProfile');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

export function openCreateProfileAvatarPicker() {
  const modal = document.getElementById('modalCreateProfileAvatarPicker');
  if (!modal) return;
  createProfileAvatarFilters = { franchise: 'all', query: '' };
  const searchInput = document.getElementById('inputCreateProfileAvatarSearch');
  if (searchInput) searchInput.value = '';
  updateCreateProfileFranchiseTriggerLabel();
  renderCreateProfileAvatarsCatalog();
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

export function closeCreateProfileAvatarPicker() {
  const modal = document.getElementById('modalCreateProfileAvatarPicker');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function updateCreateProfileFranchiseTriggerLabel() {
  const label = document.getElementById('createProfileFranchiseLabel');
  const count = document.getElementById('createProfileFranchiseCount');
  const franchises = getFranchisesSummary('all');
  const cur = franchises.find(f => f.id === createProfileAvatarFilters.franchise) || franchises[0];
  if (label) label.textContent = cur?.name || 'Todas las obras';
  if (count) count.textContent = cur?.count ?? 0;
}

export function renderCreateProfileAvatarsCatalog() {
  const container = document.getElementById('createProfileAvatarsCatalogContainer');
  if (!container) return;

  const filtered = filterAvatars(createProfileAvatarFilters);
  const selectedUrl = createProfileAvatarUrl;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center bg-white/[0.02] border border-white/10 rounded-2xl max-w-md mx-auto my-6 space-y-3">
        <div class="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center mx-auto text-lg">
          <i class="fa-solid fa-magnifying-glass"></i>
        </div>
        <h4 class="text-sm font-semibold text-white">Sin avatares encontrados</h4>
        <p class="text-xs text-white/50">No hay personajes que coincidan con la búsqueda.</p>
      </div>
    `;
    return;
  }

  const renderCard = (av, extraClass = '') => {
    const cdnUrl = resolveAvatarCdnUrl(av.path);
    const isSelected = selectedUrl && (selectedUrl === cdnUrl || selectedUrl === av.path);
    return `
      <div class="netflix-avatar-card ${isSelected ? 'is-selected' : ''} ${extraClass}" 
           data-avatar-path="${av.path}" 
           data-avatar-name="${av.character}" 
           title="${av.character} (${av.franchiseName})">
        <div class="avatar-circle-wrap">
          <img src="${av.path}" alt="${av.character}" class="avatar-card-img" loading="lazy" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=Nuvio'">
          <div class="avatar-selected-badge">
            <i class="fa-solid fa-check"></i>
          </div>
        </div>
        <span class="avatar-card-name-label">${av.character}</span>
      </div>
    `;
  };

  if (createProfileAvatarFilters.query) {
    container.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <span class="text-xs text-white/60 font-medium">Resultados para "<strong class="text-white">${createProfileAvatarFilters.query}</strong>"</span>
          <span class="text-xs text-white/40 font-mono">${filtered.length} avatares</span>
        </div>
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
          ${filtered.map(av => renderCard(av)).join('')}
        </div>
      </div>
    `;
  } else if (createProfileAvatarFilters.franchise === 'all') {
    const groups = new Map();
    for (const av of filtered) {
      if (!groups.has(av.franchise)) {
        groups.set(av.franchise, { name: av.franchiseName, items: [] });
      }
      groups.get(av.franchise).items.push(av);
    }

    const sortedGroups = Array.from(groups.entries()).sort((a, b) => 
      a[1].name.localeCompare(b[1].name, 'es', { sensitivity: 'base' })
    );

    let html = '';
    for (const [fId, group] of sortedGroups) {
      const previewItems = group.items.slice(0, 8);
      const previewCardsHtml = previewItems.map((av, idx) => {
        let responsiveClass = '';
        if (idx === 3) responsiveClass = 'hidden sm:flex';
        else if (idx === 4 || idx === 5) responsiveClass = 'hidden md:flex';
        else if (idx >= 6) responsiveClass = 'hidden lg:flex';
        return renderCard(av, responsiveClass);
      }).join('');

      html += `
        <div class="avatar-collection-block space-y-3.5">
          <div class="flex items-center justify-between pb-3 border-b border-white/[0.06] flex-wrap gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-7 h-7 rounded-lg bg-[#ffd479]/10 border border-[#ffd479]/20 text-[#ffd479] flex items-center justify-center text-xs shrink-0">
                <i class="fa-solid fa-masks-theater"></i>
              </div>
              <div class="min-w-0">
                <h4 class="text-sm font-bold text-white tracking-tight truncate">${group.name}</h4>
                <span class="text-[11px] text-white/40 font-mono">${group.items.length} avatares</span>
              </div>
            </div>
            <button type="button" class="btn-create-profile-open-franchise text-xs text-[#ffd479] hover:underline flex items-center gap-1 cursor-pointer" data-open-franchise="${fId}">
              <span>Ver todos</span>
              <i class="fa-solid fa-arrow-right text-[10px]"></i>
            </button>
          </div>
          <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
            ${previewCardsHtml}
          </div>
        </div>
      `;
    }
    container.innerHTML = html;

    container.querySelectorAll('.btn-create-profile-open-franchise').forEach(btn => {
      btn.addEventListener('click', () => {
        const fId = btn.dataset.openFranchise;
        if (fId) {
          createProfileAvatarFilters.franchise = fId;
          updateCreateProfileFranchiseTriggerLabel();
          renderCreateProfileAvatarsCatalog();
        }
      });
    });
  } else {
    const currentFranchiseName = formatFranchiseName(createProfileAvatarFilters.franchise);
    container.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-white/[0.08] flex-wrap gap-2">
          <button type="button" id="btnCreateProfileBackToAllFranchises" class="text-xs text-[#ffd479] hover:underline flex items-center gap-1.5 cursor-pointer">
            <i class="fa-solid fa-arrow-left text-xs"></i>
            <span>Todas las obras</span>
          </button>
          <h4 class="text-sm font-bold text-white">${currentFranchiseName}</h4>
          <span class="text-xs text-white/40 font-mono">${filtered.length} avatares</span>
        </div>
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
          ${filtered.map(av => renderCard(av)).join('')}
        </div>
      </div>
    `;

    const btnBack = document.getElementById('btnCreateProfileBackToAllFranchises');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        createProfileAvatarFilters.franchise = 'all';
        updateCreateProfileFranchiseTriggerLabel();
        renderCreateProfileAvatarsCatalog();
      });
    }
  }

  // Evento al seleccionar avatar
  container.querySelectorAll('.netflix-avatar-card').forEach(card => {
    card.addEventListener('click', () => {
      const path = card.dataset.avatarPath;
      if (path) {
        createProfileAvatarUrl = resolveAvatarCdnUrl(path);
        const preview = document.getElementById('createProfileAvatarPreview');
        if (preview) preview.src = createProfileAvatarUrl;
        closeCreateProfileAvatarPicker();
      }
    });
  });
}

export function setupProfileModals() {
  // Modal Prompt Who's Watching
  const btnPromptCreate = document.getElementById('btnPromptCreateProfile');
  const btnPromptClose = document.getElementById('btnCloseSelectProfileModal');
  if (btnPromptCreate) {
    btnPromptCreate.addEventListener('click', () => {
      closeSelectProfilePrompt();
      openCreateProfileModal();
    });
  }
  if (btnPromptClose) {
    btnPromptClose.addEventListener('click', closeSelectProfilePrompt);
  }

  // Modal Editar Perfil
  const formEdit = document.getElementById('formEditProfile');
  const btnCloseEdit = document.getElementById('btnCloseEditProfileModal');
  const btnCancelEdit = document.getElementById('btnCancelEditProfile');
  const btnDeleteModal = document.getElementById('btnDeleteProfileInModal');

  if (btnCloseEdit) btnCloseEdit.addEventListener('click', closeEditProfileModal);
  if (btnCancelEdit) btnCancelEdit.addEventListener('click', closeEditProfileModal);

  if (formEdit) {
    formEdit.addEventListener('submit', async (e) => {
      e.preventDefault();
      const targetId = document.getElementById('editProfileTargetId')?.value;
      const newName = document.getElementById('inputEditProfileName')?.value.trim();
      const btnSubmit = document.getElementById('btnSaveEditProfile');

      if (!newName || !targetId) return;

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Guardando...';
      }

      try {
        await NuvioClient.updateProfile({
          apiUrl: CONFIG.NUVIO_API_URL,
          apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
          accessToken: accountState.session.accessToken,
          userId: accountState.session.userId,
          profileId: targetId,
          name: newName
        });

        // Actualizar en memoria local
        const p = accountState.profiles.find(item => Number(item.profile_index ?? item.id) === Number(targetId));
        if (p) p.name = newName;

        if (Number(accountState.selectedProfileId) === Number(targetId)) {
          const activeName = document.getElementById('sidebarActiveName');
          if (activeName) activeName.textContent = newName;
          const currentAvName = document.getElementById('avatarCurrentProfileName');
          if (currentAvName) currentAvName.textContent = newName;
        }

        renderProfilePopover();
        showToast('✓ Nombre de perfil actualizado con éxito.', 'success');
        closeEditProfileModal();
      } catch (err) {
        showToast(`Error actualizando perfil: ${err.message}`, 'error');
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Guardar';
        }
      }
    });
  }

  if (btnDeleteModal) {
    btnDeleteModal.addEventListener('click', async () => {
      const targetId = document.getElementById('editProfileTargetId')?.value;
      if (!targetId) return;

      const targetProf = (accountState.profiles || []).find(p => Number(p.profile_index ?? p.id) === Number(targetId));
      const profName = targetProf ? targetProf.name : 'este perfil';
      if (confirm(`¿Estás seguro de que deseas eliminar el perfil "${profName}"? Se borrarán sus datos y configuraciones en Nuvio.`)) {
        btnDeleteModal.disabled = true;
        btnDeleteModal.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Eliminando...';

        try {
          await NuvioClient.deleteProfile({
            apiUrl: CONFIG.NUVIO_API_URL,
            apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
            accessToken: accountState.session.accessToken,
            userId: accountState.session.userId,
            profileId: targetId
          });

          showToast('✓ Perfil eliminado con éxito.', 'success');
          closeEditProfileModal();

          await fetchProfiles();
          renderProfilePopover();
          if (accountState.profiles.length > 0) {
            selectProfile(accountState.profiles[0].profile_index ?? accountState.profiles[0].id);
          }
        } catch (delErr) {
          showToast(`Error al eliminar perfil: ${delErr.message}`, 'error');
        } finally {
          btnDeleteModal.disabled = false;
          btnDeleteModal.innerHTML = '<i class="fa-regular fa-trash-can mr-1"></i> Eliminar';
        }
      }
    });
  }

  // Modal Crear Perfil y Selector de Avatar
  const formCreate = document.getElementById('formCreateProfile');
  const btnCloseCreate = document.getElementById('btnCloseCreateProfileModal');
  const btnCancelCreate = document.getElementById('btnCancelCreateProfile');
  const btnPopoverAdd = document.getElementById('btnPopoverAddProfile');

  const btnPickAvatar = document.getElementById('btnPickCreateProfileAvatar');
  const btnClosePicker = document.getElementById('btnCloseCreateProfileAvatarPicker');
  const modalPicker = document.getElementById('modalCreateProfileAvatarPicker');
  const btnTriggerFranchises = document.getElementById('btnCreateProfileFranchisesTrigger');
  const inputSearch = document.getElementById('inputCreateProfileAvatarSearch');

  if (btnPickAvatar) {
    btnPickAvatar.addEventListener('click', openCreateProfileAvatarPicker);
  }
  if (btnClosePicker) {
    btnClosePicker.addEventListener('click', closeCreateProfileAvatarPicker);
  }
  if (modalPicker) {
    modalPicker.addEventListener('click', (e) => {
      if (e.target === modalPicker) closeCreateProfileAvatarPicker();
    });
  }
  if (btnTriggerFranchises) {
    btnTriggerFranchises.addEventListener('click', () => {
      openFranchisesModal();
    });
  }
  if (inputSearch) {
    inputSearch.addEventListener('input', (e) => {
      createProfileAvatarFilters.query = e.target.value.trim();
      renderCreateProfileAvatarsCatalog();
    });
  }

  if (btnCloseCreate) btnCloseCreate.addEventListener('click', closeCreateProfileModal);
  if (btnCancelCreate) btnCancelCreate.addEventListener('click', closeCreateProfileModal);
  if (btnPopoverAdd) btnPopoverAdd.addEventListener('click', openCreateProfileModal);

  if (formCreate) {
    formCreate.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('inputCreateProfileName')?.value.trim();
      const btnSubmit = document.getElementById('btnSubmitCreateProfile');

      if (!name) return;

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Creando...';
      }

      try {
        const created = await NuvioClient.createProfile({
          apiUrl: CONFIG.NUVIO_API_URL,
          apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
          accessToken: accountState.session.accessToken,
          userId: accountState.session.userId,
          name: name,
          avatarUrl: createProfileAvatarUrl || null
        });

        showToast('✓ Perfil creado con éxito.', 'success');
        closeCreateProfileModal();

        await fetchProfiles();
        renderProfilePopover();
        const newId = created.profile_index ?? created.id;
        if (newId) {
          selectProfile(newId);
        }
      } catch (createErr) {
        showToast(`Error al crear perfil: ${createErr.message}`, 'error');
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = '<i class="fa-solid fa-plus mr-1"></i> Crear Perfil';
        }
      }
    });
  }
}

// ============================================================
// CARGA Y RENDERIZADO DE LA PESTAÑA RESUMEN (MÉTRICAS Y FILAS TMDB)
// ============================================================

const tmdbDetailsCache = new Map();

async function fetchTmdbMediaDetails(rawItem, apiKey) {
  if (!rawItem) return null;

  // 1. Extraer identificador de contenido priorizando content_id real de Nuvio
  const rawContentId = String(rawItem.content_id || rawItem.video_id || rawItem.item_id || rawItem.media_id || '').trim();
  let imdbId = rawItem.imdb_id || null;
  let tmdbId = rawItem.tmdb_id || null;

  if (rawContentId) {
    if (rawContentId.startsWith('tt')) {
      imdbId = rawContentId.split(':')[0];
    } else if (rawContentId.startsWith('tmdb:')) {
      tmdbId = rawContentId.replace(/^tmdb:/, '').split(':')[0];
    } else if (/^\d+$/.test(rawContentId)) {
      tmdbId = rawContentId;
    } else if (rawContentId.includes(':')) {
      const parts = rawContentId.split(':');
      if (parts[0].startsWith('tt')) imdbId = parts[0];
      else if (parts[0] === 'imdb' && parts[1]?.startsWith('tt')) imdbId = parts[1];
      else if (parts[0] === 'tmdb') tmdbId = parts[1];
    }
  }

  // 2. Determinar tipo de contenido
  let type = String(rawItem.content_type || rawItem.type || rawItem.media_type || '').toLowerCase();
  if (type === 'series' || type === 'tv' || type === 'show' || (rawItem.season !== undefined && rawItem.season !== null)) {
    type = 'tv';
  } else {
    type = 'movie';
  }

  if (!imdbId && !tmdbId) return null;

  const cacheKey = `${type}_${imdbId || tmdbId}`;
  if (tmdbDetailsCache.has(cacheKey)) {
    return tmdbDetailsCache.get(cacheKey);
  }

  let details = null;

  // 3. Consulta a TMDB si se cuenta con API Key
  if (apiKey) {
    try {
      let url = '';
      if (imdbId) {
        url = `https://api.themoviedb.org/3/find/${encodeURIComponent(imdbId)}?api_key=${encodeURIComponent(apiKey)}&external_source=imdb_id&language=es-MX`;
      } else if (tmdbId) {
        url = `https://api.themoviedb.org/3/${type === 'tv' ? 'tv' : 'movie'}/${encodeURIComponent(tmdbId)}?api_key=${encodeURIComponent(apiKey)}&language=es-MX`;
      }

      if (url) {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (imdbId) {
            const results = (data.movie_results || []).concat(data.tv_results || []);
            const match = results[0];
            if (match) {
              details = {
                title: match.title || match.name,
                poster_path: match.poster_path ? `https://image.tmdb.org/t/p/w500${match.poster_path}` : '',
                backdrop_path: match.backdrop_path ? `https://image.tmdb.org/t/p/w780${match.backdrop_path}` : ''
              };
            }
          } else if (data) {
            details = {
              title: data.title || data.name,
              poster_path: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '',
              backdrop_path: data.backdrop_path ? `https://image.tmdb.org/t/p/w780${data.backdrop_path}` : ''
            };
          }
        }
      }
    } catch (tmdbErr) {
      console.warn('[AccountManager] TMDB find:', tmdbErr.message);
    }
  }

  // 4. Fallback con Cinemeta / Metahub si no se obtuvo póster o título completo y hay imdbId
  if (imdbId && (!details || !details.poster_path || !details.title)) {
    try {
      const cinemetaType = type === 'tv' ? 'series' : 'movie';
      const metaRes = await fetch(`https://v3-cinemeta.strem.io/meta/${cinemetaType}/${encodeURIComponent(imdbId)}.json`);
      if (metaRes.ok) {
        const metaJson = await metaRes.json();
        const meta = metaJson?.meta;
        if (meta) {
          details = {
            title: details?.title || meta.name || rawItem.title || 'Contenido Nuvio',
            poster_path: details?.poster_path || meta.poster || `https://images.metahub.space/poster/medium/${imdbId}/img`,
            backdrop_path: details?.backdrop_path || meta.background || ''
          };
        }
      }
    } catch (_) {}

    if (!details?.poster_path) {
      details = {
        title: details?.title || rawItem.title || 'Contenido Nuvio',
        poster_path: `https://images.metahub.space/poster/medium/${imdbId}/img`,
        backdrop_path: details?.backdrop_path || ''
      };
    }
  }

  if (details) {
    tmdbDetailsCache.set(cacheKey, details);
  }
  return details;
}

export async function loadProfileOverview() {
  const profId = accountState.selectedProfileId;
  if (!profId || !accountState.session) return;

  try {
    const [plugins, progressItems, libraryItems, watchedItems] = await Promise.all([
      NuvioClient.listPlugins({
        apiUrl: CONFIG.NUVIO_API_URL,
        apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
        accessToken: accountState.session.accessToken,
        profileId: profId
      }).catch(() => []),
      NuvioClient.pullWatchProgress({
        apiUrl: CONFIG.NUVIO_API_URL,
        apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
        accessToken: accountState.session.accessToken,
        profileId: profId
      }).catch(() => []),
      NuvioClient.pullLibrary({
        apiUrl: CONFIG.NUVIO_API_URL,
        apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
        accessToken: accountState.session.accessToken,
        profileId: profId
      }).catch(() => []),
      NuvioClient.pullWatched({
        apiUrl: CONFIG.NUVIO_API_URL,
        apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
        accessToken: accountState.session.accessToken,
        profileId: profId
      }).catch(() => [])
    ]);

    // 1. Filtrar watchedItems estrictamente por profile_id
    const filteredWatched = (Array.isArray(watchedItems) ? watchedItems : []).filter(item => 
      item && (item.profile_id === undefined || Number(item.profile_id) === Number(profId))
    );

    // 2. Deduplicar watchedItems por content_id y season/episode para conteo exacto de Nuvio (96)
    const seenWatched = new Set();
    const uniqueWatchedItems = [];
    for (const w of filteredWatched) {
      const key = `${w.content_id || ''}_${w.season ?? ''}_${w.episode ?? ''}`;
      if (!seenWatched.has(key)) {
        seenWatched.add(key);
        uniqueWatchedItems.push(w);
      }
    }
    const watchedCount = uniqueWatchedItems.length;

    // 3. Filtrar progressItems para obtener ÚNICAMENTE los contenidos activos en progreso (NO completados)
    const inProgressItems = (Array.isArray(progressItems) ? progressItems : []).filter(item => {
      if (!item) return false;
      if (item.profile_id !== undefined && Number(item.profile_id) !== Number(profId)) return false;

      const pos = Number(item.position || 0);
      const dur = Number(item.duration || 0);
      // Sin reproducción iniciada
      if (pos <= 0) return false;
      // Si la posición superó el 90% de la duración, ya fue completado
      if (dur > 0 && (pos / dur) >= 0.90) return false;

      // Si ya está registrado en watchedItems, ya fue completado
      const alreadyWatched = uniqueWatchedItems.some(w => {
        if (!w || !w.content_id || w.content_id !== item.content_id) return false;
        if (item.season !== undefined && item.season !== null && w.season !== undefined && w.season !== null) {
          return Number(item.season) === Number(w.season) && Number(item.episode) === Number(w.episode);
        }
        return true;
      });
      if (alreadyWatched) return false;

      return true;
    });

    // 4. Deduplicar series para "Actualmente Viendo" para mostrar solo el último episodio activo de cada serie
    const seenShows = new Set();
    const currentlyWatching = [];
    for (const item of inProgressItems) {
      const showKey = item.content_id || item.video_id;
      if (!seenShows.has(showKey)) {
        seenShows.add(showKey);
        currentlyWatching.push(item);
      }
      if (currentlyWatching.length >= 6) break;
    }

    // 5. Métrica de progreso: en Nuvio Sync corresponde a los contenidos en curso (46)
    let progressCount = inProgressItems.length;
    if (progressCount === 0 && Array.isArray(progressItems) && progressItems.length > 0) {
      progressCount = progressItems.totalCount ?? progressItems.length;
    }

    const libraryCount = libraryItems.totalCount !== undefined
      ? libraryItems.totalCount
      : (Array.isArray(libraryItems) ? libraryItems.length : 0);

    const pluginsCount = plugins.totalCount !== undefined
      ? plugins.totalCount
      : (Array.isArray(plugins) ? plugins.length : 0);

    accountState.overviewData = {
      pluginsCount,
      addonsCount: (accountState.installedAddons || []).length,
      progressCount,
      libraryCount,
      watchedCount,
      currentlyWatching,
      recentlyWatched: uniqueWatchedItems.slice(0, 6)
    };

    renderOverviewSection();
  } catch (err) {
    console.warn('[AccountManager] Error cargando métricas de resumen:', err);
  }
}

export async function renderOverviewSection() {
  const data = accountState.overviewData;
  if (!data) return;

  // Actualizar las 5 tarjetas de métricas (coherencia con Nuvio)
  const elPlugins = document.getElementById('metricPluginsCount');
  const elAddons = document.getElementById('metricAddonsCount');
  const elProgress = document.getElementById('metricProgressCount');
  const elLibrary = document.getElementById('metricLibraryCount');
  const elWatched = document.getElementById('metricWatchedCount');

  if (elPlugins) elPlugins.textContent = data.pluginsCount;
  if (elAddons) elAddons.textContent = (accountState.installedAddons || []).length || data.addonsCount;
  if (elProgress) elProgress.textContent = data.progressCount;
  if (elLibrary) elLibrary.textContent = data.libraryCount;
  if (elWatched) elWatched.textContent = data.watchedCount;

  // Condición de seguridad requerida:
  // "si el perfil no tiene el enrichment activado y sin clave tmdb, no pondras las 2 filas, para evitar errores claro"
  const tmdbKey = (accountState.settings.tmdb_api_key || '').trim();
  const isEnrichmentActive = Boolean(accountState.settings.enrichment_enabled);
  const canShowCinemaRows = Boolean(isEnrichmentActive && tmdbKey);

  const cinemaContainer = document.getElementById('overviewCinemaContainer');
  const tmdbNotice = document.getElementById('overviewTmdbNotice');

  if (!canShowCinemaRows) {
    if (cinemaContainer) cinemaContainer.classList.add('hidden');
    if (tmdbNotice) tmdbNotice.classList.remove('hidden');
    return;
  }

  if (cinemaContainer) cinemaContainer.classList.remove('hidden');
  if (tmdbNotice) tmdbNotice.classList.add('hidden');

  // Helper para formatear subtítulo de contenido (Temporada/Episodio o Tipo)
  const formatMediaSubtitle = (item) => {
    let sub = String(item.content_type || item.type || 'Película').toLowerCase();
    if (sub === 'series' || sub === 'tv' || (item.season !== undefined && item.season !== null)) {
      if (item.season !== undefined && item.season !== null && item.episode !== undefined && item.episode !== null) {
        return `T${item.season} : E${item.episode}`;
      }
      return 'Serie';
    }
    return 'Película';
  };

  // Renderizar Fila 1: Actualmente Viendo
  const watchingContainer = document.getElementById('rowCurrentlyWatchingCards');
  if (watchingContainer) {
    if (data.currentlyWatching.length === 0) {
      watchingContainer.innerHTML = `
        <div class="col-span-full py-8 text-center text-xs text-white/40 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <i class="fa-solid fa-play text-white/20 text-lg mb-1 block"></i>
          Sin reproducciones en curso en este perfil.
        </div>
      `;
    } else {
      watchingContainer.innerHTML = '<div class="col-span-full py-4 text-center text-xs text-white/40"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Cargando metadatos en Latino...</div>';

      const cardsHtml = await Promise.all(data.currentlyWatching.map(async (item) => {
        const details = await fetchTmdbMediaDetails(item, tmdbKey);
        const title = details?.title || item.title || item.name || 'Contenido Nuvio';
        const posterUrl = details?.poster_path || item.poster_url || item.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80';
        
        let pct = 40;
        if (item.position && item.duration && item.duration > 0) {
          pct = Math.min(100, Math.max(5, Math.round((item.position / item.duration) * 100)));
        } else if (item.progress && item.duration && item.duration > 0) {
          pct = Math.min(100, Math.max(5, Math.round((item.progress / item.duration) * 100)));
        } else if (item.progress_percentage) {
          pct = Math.min(100, Math.max(5, Number(item.progress_percentage)));
        }

        const subtitle = formatMediaSubtitle(item);

        return `
          <div class="nuvio-cinema-card group select-none">
            <div class="relative w-full aspect-[2/3] overflow-hidden bg-black/60">
              <img src="${posterUrl}" alt="${title}" class="poster-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80'">
              <div class="card-gradient-overlay"></div>
              <div class="card-progress-bar" style="width: ${pct}%"></div>
            </div>
            <div class="p-2.5">
              <h5 class="text-xs font-semibold text-white truncate group-hover:text-[#ffd479] transition-colors" title="${title}">${title}</h5>
              <span class="text-[10px] text-white/40 font-mono">${subtitle}</span>
            </div>
          </div>
        `;
      }));

      watchingContainer.innerHTML = cardsHtml.join('');
    }
  }

  // Renderizar Fila 2: Últimas Vistas
  const watchedContainer = document.getElementById('rowRecentlyWatchedCards');
  if (watchedContainer) {
    if (data.recentlyWatched.length === 0) {
      watchedContainer.innerHTML = `
        <div class="col-span-full py-8 text-center text-xs text-white/40 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <i class="fa-solid fa-check text-white/20 text-lg mb-1 block"></i>
          Sin contenidos marcados como vistos en este perfil.
        </div>
      `;
    } else {
      watchedContainer.innerHTML = '<div class="col-span-full py-4 text-center text-xs text-white/40"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Cargando metadatos en Latino...</div>';

      const cardsHtml = await Promise.all(data.recentlyWatched.map(async (item) => {
        const details = await fetchTmdbMediaDetails(item, tmdbKey);
        const title = details?.title || item.title || item.name || 'Contenido Nuvio';
        const posterUrl = details?.poster_path || item.poster_url || item.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80';
        const subtitle = formatMediaSubtitle(item);

        return `
          <div class="nuvio-cinema-card group select-none">
            <div class="relative w-full aspect-[2/3] overflow-hidden bg-black/60">
              <img src="${posterUrl}" alt="${title}" class="poster-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80'">
              <div class="card-gradient-overlay"></div>
            </div>
            <div class="p-2.5">
              <h5 class="text-xs font-semibold text-white truncate group-hover:text-emerald-300 transition-colors" title="${title}">${title}</h5>
              <span class="text-[10px] text-white/40 font-mono">${subtitle}</span>
            </div>
          </div>
        `;
      }));

      watchedContainer.innerHTML = cardsHtml.join('');
    }
  }
}

// ============================================================
// GESTOR DE AVATARES ESTILO NETFLIX (/account -> Avatares)
// ============================================================

export function resolvePublicAvatarUrl(rawUrl) {
  if (!rawUrl) return '';
  const trimmed = String(rawUrl).trim();
  // Migración automática de enlaces raw.githubusercontent.com hacia jsDelivr CDN
  if (trimmed.includes('raw.githubusercontent.com') && trimmed.includes('/assets/profile_icons/')) {
    const sub = trimmed.split('/assets/profile_icons/')[1];
    if (sub) {
      return `https://cdn.jsdelivr.net/gh/${CONFIG.GITHUB_REPO}@main/assets/profile_icons/${sub}`;
    }
  }
  if (trimmed.includes('assets/profile_icons/')) {
    const subPath = trimmed.split('assets/profile_icons/')[1];
    if (subPath) {
      return `https://cdn.jsdelivr.net/gh/${CONFIG.GITHUB_REPO}@main/assets/profile_icons/${subPath}`;
    }
  }
  if (/^https?:\/\//i.test(trimmed) || /^data:image\//i.test(trimmed)) {
    return trimmed;
  }
  if (typeof window !== 'undefined' && window.location) {
    try {
      return new URL(trimmed, window.location.href).href;
    } catch (_) {}
  }
  return trimmed;
}

export function setNewSelectedAvatar(newUrl) {
  if (!newUrl) return;
  accountState.selectedAvatarUrl = newUrl;

  const isChanged = accountState.selectedAvatarUrl !== accountState.originalAvatarUrl;
  markDirty('avatar', isChanged);

  const preview = document.getElementById('avatarCurrentPreview');
  if (preview) preview.src = newUrl;

  const modifiedBadge = document.getElementById('avatarModifiedBadge');
  if (modifiedBadge) modifiedBadge.classList.toggle('hidden', !isChanged);

  // Actualizar tarjeta seleccionada en el catálogo
  document.querySelectorAll('.netflix-avatar-card').forEach(card => {
    const cardPath = card.dataset.avatarPath;
    const isSelected = cardPath === newUrl || 
      resolvePublicAvatarUrl(cardPath) === resolvePublicAvatarUrl(newUrl);
    card.classList.toggle('is-selected', isSelected);
  });
}

function processUploadedAvatarFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('El archivo seleccionado no es una imagen válida.', 'error');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('La imagen es demasiado pesada (máx 10MB).', 'warning');
    return;
  }

  showToast('Procesando imagen...', 'info');

  const reader = new FileReader();
  reader.onload = (e) => {
    const rawDataUrl = e.target.result;
    const img = new Image();
    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        const size = Math.min(Math.max(img.width, img.height), 256);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        
        const base64Clean = canvas.toDataURL('image/jpeg', 0.85).replace(/^data:image\/[a-z]+;base64,/, '');

        // Subir a hosting público con CORS para obtener URL corta compatible con Nuvio TV (varchar 255)
        let uploadedPublicUrl = null;

        // 1. Intentar ImgBB con múltiples API Keys rotativas
        const imgbbKeys = [
          '6d207e02198a847aa5ad3ac50ce6c452',
          '2b6a9e144a1eb4fc47c5d7999713b192',
          'e647b1c3b17fb3a54b38345c264a78aa'
        ];

        for (const key of imgbbKeys) {
          try {
            const formData = new FormData();
            formData.append('image', base64Clean);
            const uploadRes = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, {
              method: 'POST',
              body: formData
            });

            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              const url = uploadData?.data?.display_url || uploadData?.data?.url;
              if (url && url.startsWith('http')) {
                uploadedPublicUrl = url;
                break;
              }
            }
          } catch (_) {}
        }

        // 2. Fallback: tmpfiles.org
        if (!uploadedPublicUrl) {
          try {
            const blobData = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.85));
            if (blobData) {
              const formData = new FormData();
              formData.append('file', blobData, 'avatar.jpg');
              const tfRes = await fetch('https://tmpfiles.org/api/v1/upload', {
                method: 'POST',
                body: formData
              });
              if (tfRes.ok) {
                const tfData = await tfRes.json();
                if (tfData?.data?.url) {
                  uploadedPublicUrl = tfData.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
                }
              }
            }
          } catch (_) {}
        }

        if (uploadedPublicUrl) {
          setNewSelectedAvatar(uploadedPublicUrl);
          showToast('✓ Imagen subida con éxito y lista para guardar.', 'success');
          return;
        }

        showToast('No se pudo subir automáticamente a la nube. Pega un enlace https:// directo abajo.', 'warning');
        const urlInput = document.getElementById('inputAvatarUrlDirect');
        if (urlInput) urlInput.focus();
      } catch (err) {
        showToast('Error procesando imagen: ' + err.message, 'error');
      }
    };
    img.onerror = () => {
      showToast('Error cargando archivo de imagen.', 'error');
    };
    img.src = rawDataUrl;
  };
  reader.readAsDataURL(file);
}

export function renderAvatarsSection() {
  const profile = (accountState.profiles || []).find(p => Number(p.profile_index ?? p.id) === Number(accountState.selectedProfileId));
  
  // 1. Cabecera: Avatar actual y nombre del perfil
  const preview = document.getElementById('avatarCurrentPreview');
  const nameEl = document.getElementById('avatarCurrentProfileName');
  const modifiedBadge = document.getElementById('avatarModifiedBadge');
  
  const currentAvatarUrl = accountState.selectedAvatarUrl || profile?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=Nuvio';
  if (preview) preview.src = currentAvatarUrl;
  if (nameEl) nameEl.textContent = profile?.name || 'Perfil Nuvio';
  if (modifiedBadge) modifiedBadge.classList.toggle('hidden', !accountState.dirty.avatar);

  // 2. Control de subida de archivo local
  const fileInput = document.getElementById('inputAvatarFileUpload');
  if (fileInput && fileInput.dataset.bound !== 'true') {
    fileInput.dataset.bound = 'true';
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) processUploadedAvatarFile(file);
      fileInput.value = '';
    });
  }

  // 3. Control de enlace URL directo
  const urlInput = document.getElementById('inputAvatarUrlDirect');
  const btnApplyUrl = document.getElementById('btnApplyAvatarUrl');
  if (btnApplyUrl && btnApplyUrl.dataset.bound !== 'true') {
    btnApplyUrl.dataset.bound = 'true';
    const applyUrlAction = () => {
      const val = urlInput?.value?.trim();
      if (!val) {
        showToast('Ingresa un enlace URL de imagen válido.', 'warning');
        return;
      }
      if (!/^https?:\/\//i.test(val) && !/^data:image\//i.test(val)) {
        showToast('El enlace debe comenzar con https:// o http://', 'error');
        return;
      }
      setNewSelectedAvatar(val);
      if (urlInput) urlInput.value = '';
      showToast('✓ Enlace de avatar aplicado. Pulsa "Guardar Cambios".', 'info');
    };

    btnApplyUrl.addEventListener('click', applyUrlAction);
    if (urlInput) {
      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyUrlAction();
        }
      });
    }
  }

  // 4. Buscador en tiempo real de personajes
  const searchInput = document.getElementById('inputAvatarSearch');
  const btnClearSearch = document.getElementById('btnClearAvatarSearch');
  if (searchInput && searchInput.dataset.bound !== 'true') {
    searchInput.dataset.bound = 'true';
    searchInput.addEventListener('input', (e) => {
      accountState.avatarFilters.query = e.target.value;
      if (btnClearSearch) {
        btnClearSearch.classList.toggle('hidden', !e.target.value.trim());
      }
      renderAvatarsCatalog();
    });
  }
  if (btnClearSearch && btnClearSearch.dataset.bound !== 'true') {
    btnClearSearch.dataset.bound = 'true';
    btnClearSearch.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      accountState.avatarFilters.query = '';
      btnClearSearch.classList.add('hidden');
      renderAvatarsCatalog();
    });
  }

  // 5. Renderizar filtros y catálogo
  setupFranchisesModal();
  renderAvatarStylePills();
  renderModalFranchisesList();
  renderAvatarsCatalog();
}

function renderAvatarStylePills() {
  const container = document.getElementById('avatarStyleFilterPills');
  if (!container) return;

  const styles = getStylesSummary();
  container.innerHTML = styles.map(s => {
    const isAct = s.id === accountState.avatarFilters.style;
    return `
      <button type="button" class="avatar-filter-pill ${isAct ? 'is-active' : ''}" data-style-id="${s.id}">
        <span>${s.name}</span>
        <span class="pill-badge">${s.count}</span>
      </button>
    `;
  }).join('');

  container.querySelectorAll('.avatar-filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const sId = btn.dataset.styleId;
      if (sId && sId !== accountState.avatarFilters.style) {
        accountState.avatarFilters.style = sId;
        renderAvatarStylePills();
        renderModalFranchisesList();
        renderAvatarsCatalog();
      }
    });
  });
}

function openFranchisesModal() {
  const modal = document.getElementById('modalAvatarFranchises');
  if (modal) {
    renderModalFranchisesList();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
  }
}

function closeFranchisesModal() {
  const modal = document.getElementById('modalAvatarFranchises');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
  }
}

function setupFranchisesModal() {
  const triggerBtn = document.getElementById('btnOpenFranchisesModal');
  const closeBtn = document.getElementById('btnCloseFranchisesModal');
  const modal = document.getElementById('modalAvatarFranchises');

  if (triggerBtn && triggerBtn.dataset.bound !== 'true') {
    triggerBtn.dataset.bound = 'true';
    triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openFranchisesModal();
    });
  }

  if (closeBtn && closeBtn.dataset.bound !== 'true') {
    closeBtn.dataset.bound = 'true';
    closeBtn.addEventListener('click', closeFranchisesModal);
  }

  if (modal && modal.dataset.bound !== 'true') {
    modal.dataset.bound = 'true';
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeFranchisesModal();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeFranchisesModal();
      }
    });
  }
}

function renderModalFranchisesList() {
  const gridEl = document.getElementById('modalFranchisesListGrid');
  const labelEl = document.getElementById('avatarFranchiseDropdownLabel');
  const countEl = document.getElementById('avatarFranchiseDropdownCount');

  const franchises = getFranchisesSummary(accountState.avatarFilters.style);
  const currentFranchiseId = accountState.avatarFilters.franchise || 'all';
  const activeItem = franchises.find(f => f.id === currentFranchiseId) || franchises[0];

  if (labelEl) labelEl.textContent = activeItem?.name || 'Todas las obras';
  if (countEl) countEl.textContent = activeItem?.count ?? 0;

  if (!gridEl) return;

  gridEl.innerHTML = franchises.map(f => {
    const isAct = f.id === currentFranchiseId;
    return `
      <button type="button" class="modal-franchise-card ${isAct ? 'is-selected' : ''}" data-franchise-id="${f.id}">
        <div class="flex items-center gap-2.5 min-w-0">
          <i class="fa-solid fa-masks-theater text-xs ${isAct ? 'text-[#ffd479]' : 'text-white/40'}"></i>
          <span class="truncate">${f.name}</span>
        </div>
        <span class="pill-badge">${f.count}</span>
      </button>
    `;
  }).join('');

  gridEl.querySelectorAll('.modal-franchise-card').forEach(item => {
    item.addEventListener('click', () => {
      const fId = item.dataset.franchiseId;
      if (fId) {
        accountState.avatarFilters.franchise = fId;
        closeFranchisesModal();
        renderModalFranchisesList();
        renderAvatarsCatalog();
      }
    });
  });
}

function renderAvatarsCatalog() {
  const container = document.getElementById('avatarsCatalogContainer');
  if (!container) return;

  const filtered = filterAvatars(accountState.avatarFilters);
  const activeAvatar = accountState.selectedAvatarUrl || '';
  const activePublic = resolvePublicAvatarUrl(activeAvatar);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center bg-white/[0.02] border border-white/10 rounded-2xl max-w-md mx-auto my-6 space-y-3">
        <div class="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center mx-auto text-lg">
          <i class="fa-solid fa-magnifying-glass"></i>
        </div>
        <h4 class="text-sm font-semibold text-white">Sin avatares encontrados</h4>
        <p class="text-xs text-white/50">No hay personajes que coincidan con la búsqueda o filtro actual.</p>
        <button type="button" id="btnResetAvatarFilters" class="lat-capsule-btn glass text-xs py-2 px-4 text-[#ffd479] border-[#ffd479]/30 hover:border-[#ffd479]/60">
          Restablecer filtros
        </button>
      </div>
    `;

    const btnReset = document.getElementById('btnResetAvatarFilters');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        accountState.avatarFilters = { style: 'all', franchise: 'all', query: '' };
        const searchInput = document.getElementById('inputAvatarSearch');
        const btnClearSearch = document.getElementById('btnClearAvatarSearch');
        if (searchInput) searchInput.value = '';
        if (btnClearSearch) btnClearSearch.classList.add('hidden');
        renderAvatarStylePills();
        renderModalFranchisesList();
        renderAvatarsCatalog();
      });
    }
    return;
  }

  const renderCard = (av, extraClass = '') => {
    const isSelected = av.path === activeAvatar || resolvePublicAvatarUrl(av.path) === activePublic;
    return `
      <div class="netflix-avatar-card ${isSelected ? 'is-selected' : ''} ${extraClass}" 
           data-avatar-path="${av.path}" 
           data-avatar-name="${av.character}" 
           title="${av.character} (${av.franchiseName})">
        <div class="avatar-circle-wrap">
          <img src="${av.path}" alt="${av.character}" class="avatar-card-img" loading="lazy" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=Nuvio'">
          <div class="avatar-selected-badge">
            <i class="fa-solid fa-check"></i>
          </div>
        </div>
        <span class="avatar-card-name-label">${av.character}</span>
      </div>
    `;
  };

  // MODO 1: Búsqueda activa por texto -> Resultados planos instantáneos
  if (accountState.avatarFilters.query) {
    container.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <span class="text-xs text-white/60 font-medium">
            Resultados para "<strong class="text-white">${accountState.avatarFilters.query}</strong>"
          </span>
          <span class="text-xs text-white/40 font-mono">${filtered.length} avatares</span>
        </div>
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
          ${filtered.map(av => renderCard(av)).join('')}
        </div>
      </div>
    `;
  } 
  // MODO 2: Todas las Obras (sin búsqueda) -> Filas infinitas de colecciones con previsualización adaptable
  else if (accountState.avatarFilters.franchise === 'all') {
    const groups = new Map();
    for (const av of filtered) {
      if (!groups.has(av.franchise)) {
        groups.set(av.franchise, { name: av.franchiseName, items: [] });
      }
      groups.get(av.franchise).items.push(av);
    }

    const sortedGroups = Array.from(groups.entries()).sort((a, b) => 
      a[1].name.localeCompare(b[1].name, 'es', { sensitivity: 'base' })
    );

    let html = '';
    for (const [fId, group] of sortedGroups) {
      // Previsualización adaptativa de 1 fila (3 en mobile, 4 en sm, 6 en md, 8 en lg)
      const previewItems = group.items.slice(0, 8);
      const previewCardsHtml = previewItems.map((av, idx) => {
        let responsiveClass = '';
        if (idx === 3) responsiveClass = 'hidden sm:flex';
        else if (idx === 4 || idx === 5) responsiveClass = 'hidden md:flex';
        else if (idx >= 6) responsiveClass = 'hidden lg:flex';
        return renderCard(av, responsiveClass);
      }).join('');

      html += `
        <div class="avatar-collection-block space-y-3.5">
          <div class="flex items-center justify-between pb-3 border-b border-white/[0.06] flex-wrap gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-7 h-7 rounded-lg bg-[#ffd479]/10 border border-[#ffd479]/20 text-[#ffd479] flex items-center justify-center text-xs shrink-0">
                <i class="fa-solid fa-masks-theater"></i>
              </div>
              <div class="min-w-0">
                <h4 class="text-sm font-bold text-white tracking-tight truncate">${group.name}</h4>
                <span class="text-[11px] text-white/40 font-mono">${group.items.length} avatares</span>
              </div>
            </div>
            <button type="button" class="btn-open-avatar-collection" data-open-franchise="${fId}" title="Ver todos los avatares de ${group.name}">
              <span>Abrir colección de avatares</span>
              <i class="fa-solid fa-arrow-right text-[10px]"></i>
            </button>
          </div>
          <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
            ${previewCardsHtml}
          </div>
        </div>
      `;
    }
    container.innerHTML = html;

    // Conectar botones "Abrir colección de avatares"
    container.querySelectorAll('.btn-open-avatar-collection').forEach(btn => {
      btn.addEventListener('click', () => {
        const franchiseId = btn.dataset.openFranchise;
        if (franchiseId) {
          accountState.avatarFilters.franchise = franchiseId;
          renderModalFranchisesList();
          renderAvatarsCatalog();
          const catEl = document.getElementById('avatarsCatalogContainer');
          if (catEl) catEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    });
  } 
  // MODO 3: Colección Única Seleccionada -> Todos los avatares desplegados con botón volver
  else {
    const currentFranchiseName = formatFranchiseName(accountState.avatarFilters.franchise);
    container.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-white/[0.08] flex-wrap gap-2">
          <div class="flex items-center gap-3">
            <button type="button" class="btn-back-all-collections" id="btnBackToAllFranchises" title="Volver a ver todas las colecciones">
              <i class="fa-solid fa-arrow-left text-xs"></i>
              <span>Todas las obras</span>
            </button>
            <div class="h-4 w-px bg-white/10 hidden sm:block"></div>
            <h4 class="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <i class="fa-solid fa-masks-theater text-[#ffd479] text-xs"></i>
              <span>${currentFranchiseName}</span>
            </h4>
          </div>
          <span class="text-xs text-white/40 font-mono">${filtered.length} avatares</span>
        </div>
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
          ${filtered.map(av => renderCard(av)).join('')}
        </div>
      </div>
    `;

    const btnBack = document.getElementById('btnBackToAllFranchises');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        accountState.avatarFilters.franchise = 'all';
        renderModalFranchisesList();
        renderAvatarsCatalog();
      });
    }
  }

  // Eventos de selección de avatar (disponibles en cualquier modo)
  container.querySelectorAll('.netflix-avatar-card').forEach(card => {
    card.addEventListener('click', () => {
      const path = card.dataset.avatarPath;
      if (path) setNewSelectedAvatar(path);
    });
  });
}

export function renderAioSection() {
  const card = document.getElementById('accountAioCard');
  if (!card) return;

  const hasAddon = Boolean(accountState.aioAddon || accountState.aioUuid);

  if (accountState.aioProtected) {
    // Addon protegido con contraseña no predeterminada
    card.innerHTML = `
      <div class="p-5 rounded-2xl bg-white/[0.03] border border-amber-500/30 space-y-4">
        <div class="flex items-center gap-3 text-amber-300">
          <i class="fa-solid fa-shield-halved text-xl"></i>
          <div>
            <h4 class="text-sm font-semibold text-white">Addon AIOMetadata Protegido</h4>
            <span class="text-xs text-white/60">Este addon requiere su contraseña para sincronizar los catálogos en vivo.</span>
          </div>
        </div>

        <div class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200/90 leading-relaxed">
          Ingresa la contraseña que definiste al crear este addon para sincronizar y editar sus opciones.
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label class="text-xs text-white/70 block mb-1 font-medium">UUID del Addon</label>
            <input type="text" id="inputAioUuidPrompt" value="${accountState.aioUuid || ''}" readonly 
                   class="lat-field w-full text-xs font-mono opacity-80 cursor-not-allowed">
          </div>
          <div>
            <label class="text-xs text-white/70 block mb-1 font-medium">Contraseña de AIOMetadata</label>
            <div class="relative">
              <input type="password" id="inputAioPasswordPrompt" placeholder="Tu contraseña de addon" 
                     class="lat-field w-full text-xs font-mono pr-10">
              <button type="button" class="btn-toggle-key absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 transition-colors cursor-pointer z-10" data-target="inputAioPasswordPrompt" title="Mostrar contraseña">
                <i class="fa-solid fa-eye text-xs pointer-events-none"></i>
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2">
          <div id="aioPromptError" class="text-xs text-rose-400 font-medium"></div>
          <button type="button" id="btnUnlockAio" class="lat-capsule-btn solid text-xs py-2 px-5 font-semibold">
            <i class="fa-solid fa-lock-open mr-1.5"></i> Desbloquear & Sincronizar
          </button>
        </div>
      </div>
    `;

    setupPasswordToggles();

    const btnUnlock = document.getElementById('btnUnlockAio');
    const passInput = document.getElementById('inputAioPasswordPrompt');
    const errorEl = document.getElementById('aioPromptError');

    const handleUnlock = async () => {
      const pass = (passInput?.value || '').trim();
      if (!pass) {
        if (errorEl) errorEl.textContent = 'Por favor ingresa la contraseña.';
        passInput?.focus();
        return;
      }
      if (btnUnlock) {
        btnUnlock.disabled = true;
        btnUnlock.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Verificando...';
      }
      try {
        await loadAioConfigByUuid(accountState.aioUuid, pass);
      } catch (e) {
        if (errorEl) errorEl.textContent = 'Contraseña incorrecta. Inténtalo nuevamente.';
      } finally {
        if (btnUnlock) {
          btnUnlock.disabled = false;
          btnUnlock.innerHTML = '<i class="fa-solid fa-lock-open mr-1.5"></i> Desbloquear & Sincronizar';
        }
      }
    };

    if (btnUnlock) btnUnlock.addEventListener('click', handleUnlock);
    if (passInput) passInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); handleUnlock(); }
    });
    return;
  }

  // Addon no protegido o ya desbloqueado
  const uuid = accountState.aioUuid || '';
  const manifestUrl = accountState.aioAddon?.manifest_url || accountState.aioAddon?.url || (uuid ? `${CONFIG.DEFAULT_AIOMETADATA_URL}/stremio/${uuid}/manifest.json` : '');
  const stremioDeepLink = manifestUrl ? `stremio://${manifestUrl.replace(/^https?:\/\//, '')}` : '';
  const currentEngine = accountState.posterEngine || 'default';
  const customUrl = accountState.customPosterUrl || '';
  const catalogsCount = (accountState.aioConfig?.catalogs || accountState.aioConfig?.config?.catalogs || []).length;

  const isCustomExternal = currentEngine === 'custom_external';
  let card1Title = isCustomExternal ? 'Motor Personalizado' : 'Default (Nativo)';
  let card1Sub = isCustomExternal ? 'Motor de pósters externo configurado' : 'TMDB Limpio es-MX (Sin dependencias)';
  let card1ImgSrc = 'https://upload.wikimedia.org/wikipedia/en/3/32/Superman_%282025_film%29_poster.jpg';
  if (isCustomExternal && customUrl) {
    card1ImgSrc = customUrl
      .replace(/\{imdb_id\??\}/gi, 'tt5950044')
      .replace(/\{tmdb_id\??\}/gi, '1061474')
      .replace(/\{stremio_id\??\}|\{id\??\}/gi, 'tt5950044')
      .replace(/\{type\??\}/gi, 'movie');
  }

  card.innerHTML = `
    <div class="space-y-6">
      <!-- 1. Tarjeta de Identidad y Enlaces del Addon -->
      <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2.5">
            <i class="fa-solid fa-wand-magic-sparkles text-emerald-400 text-lg"></i>
            <div>
              <h4 class="text-sm font-semibold text-white">Addon AIOMetadata Vinculado</h4>
              <span class="text-xs text-white/50">${hasAddon ? 'Detectado y activo en este perfil' : 'No detectado en este perfil (Tus colecciones y ajustes funcionan de forma independiente)'}</span>
            </div>
          </div>
          ${uuid ? `
            <span class="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              UUID: ${uuid}
            </span>
          ` : ''}
        </div>

        <!-- Fila de UUID y Contraseña de Edición -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div>
            <label class="text-xs text-white/60 block mb-1">UUID de Configuración</label>
            <div class="flex gap-2">
              <input type="text" id="inputAioUuid" value="${uuid}" placeholder="Ej: a1b2c3d4..." 
                     class="lat-field flex-1 text-xs font-mono">
              <button type="button" id="btnLoadAioByUuid" class="lat-capsule-btn glass text-xs py-1.5 px-3">
                Cargar
              </button>
            </div>
          </div>
          <div>
            <label class="text-xs text-white/60 block mb-1">Contraseña de AIOMetadata</label>
            <div class="relative">
              <input type="password" id="inputAioPassword" value="${accountState.aioPassword}" 
                     class="lat-field w-full text-xs font-mono pr-10">
              <button type="button" class="btn-toggle-key absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 transition-colors cursor-pointer z-10" data-target="inputAioPassword" title="Mostrar contraseña">
                <i class="fa-solid fa-eye text-xs pointer-events-none"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Enlace del Manifiesto -->
        ${manifestUrl ? `
          <div class="pt-2">
            <label class="text-xs text-white/60 block mb-1">Enlace del Manifiesto del Addon</label>
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input type="text" id="inputAioManifestUrl" value="${manifestUrl}" readonly 
                     class="lat-field flex-1 text-xs font-mono select-all bg-black/30">
              <button type="button" id="btnCopyAioManifest" class="lat-capsule-btn glass text-xs py-2 px-3.5 shrink-0 justify-center">
                <i class="fa-regular fa-copy mr-1.5"></i> Copiar
              </button>
              <a href="${stremioDeepLink}" class="lat-capsule-btn solid text-xs py-2 px-3.5 shrink-0 justify-center">
                <i class="fa-solid fa-arrow-up-right-from-square mr-1.5"></i> Abrir Addon
              </a>
            </div>
          </div>
        ` : ''}

        <div id="aioLoadingStatus" class="text-xs text-amber-300 font-mono"></div>
      </div>

      <!-- 2. Motor de Pósters & Calificaciones -->
      <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
        <div>
          <h4 class="text-sm font-semibold text-white flex items-center gap-2">
            <i class="fa-solid fa-film text-[#ffd479]"></i>
            <span>Motor de Carátulas & Calificaciones de AIOMetadata</span>
          </h4>
          <p class="text-xs text-white/60 mt-1">
            Selecciona la apariencia y estilo de carátulas para tus películas y series en todo Nuvio.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <!-- Tarjeta 1: Default o Motor Personalizado Externo -->
          <div id="cardPosterDefault" class="poster-option-card relative p-4 rounded-2xl bg-white/[0.03] border-2 ${(currentEngine === 'default' || isCustomExternal) ? 'border-[#ffd479] bg-[#ffd479]/[0.06] shadow-lg' : 'border-white/10 hover:border-white/20'} cursor-pointer transition-all flex flex-col justify-between gap-3 group">
            <div class="space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-white">${card1Title}</span>
                <div class="w-5 h-5 rounded-full border-2 ${(currentEngine === 'default' || isCustomExternal) ? 'border-[#ffd479] bg-[#ffd479] text-black' : 'border-white/20 text-transparent'} flex items-center justify-center text-[10px]">
                  <i class="fa-solid fa-check"></i>
                </div>
              </div>
              <div class="w-36 aspect-[2/3] mx-auto rounded-xl overflow-hidden bg-black/40 border border-white/10 shadow-md">
                <img src="${card1ImgSrc}" alt="Póster Superman" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='https://upload.wikimedia.org/wikipedia/en/3/32/Superman_%282025_film%29_poster.jpg'">
              </div>
            </div>
            <div class="pt-2 border-t border-white/[0.06] text-center space-y-1.5">
              <span class="text-[10px] text-white/50">${card1Sub}</span>
              ${isCustomExternal ? `
                <div class="pt-1 space-y-1.5 text-left" onclick="event.stopPropagation()">
                  <label class="text-[9px] text-white/40 block font-mono truncate">URL Configurada:</label>
                  <input id="inputCustomExternalUrl" type="text" value="${customUrl}" placeholder="https://..." class="lat-field w-full text-[10px] font-mono">
                  <button type="button" id="btnResetToDefaultTmdb" class="text-[10px] text-[#ffd479] hover:underline flex items-center gap-1 mx-auto pt-0.5">
                    <i class="fa-solid fa-rotate-left text-[9px]"></i>
                    <span>Cambiar a TMDB Limpio</span>
                  </button>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Tarjeta 2: BetterPoster -->
          <div id="cardPosterBetter" class="poster-option-card relative p-4 rounded-2xl bg-white/[0.03] border-2 ${currentEngine === 'betterposter' ? 'border-[#ffd479] bg-[#ffd479]/[0.06] shadow-lg' : 'border-white/10 hover:border-white/20'} cursor-pointer transition-all flex flex-col justify-between gap-3 group">
            <div class="space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-white">BetterPoster</span>
                <div class="w-5 h-5 rounded-full border-2 ${currentEngine === 'betterposter' ? 'border-[#ffd479] bg-[#ffd479] text-black' : 'border-white/20 text-transparent'} flex items-center justify-center text-[10px]">
                  <i class="fa-solid fa-check"></i>
                </div>
              </div>
              <div class="w-36 aspect-[2/3] mx-auto rounded-xl overflow-hidden bg-black/40 border border-white/10 shadow-md">
                <img src="https://btttr.cc/poster/imdb/poster-default/tt5950044.jpg?lang=es-MX&rs=IM" alt="Póster Superman BetterPoster" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
              </div>
            </div>
            <div class="pt-2 border-t border-white/[0.06] space-y-2">
              <a href="https://btttr.cc" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="lat-capsule-btn glass text-[10px] py-1 px-2.5 w-full justify-center">
                <span>Personalizar en btttr.cc</span>
                <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
              </a>
              <button type="button" id="btnToggleCustomBetter" onclick="event.stopPropagation()" class="w-full text-[10px] text-white/60 hover:text-white flex items-center justify-center gap-1">
                <i class="fa-solid fa-sliders text-[9px]"></i>
                <span>URL Propia</span>
              </button>
              <div id="containerCustomBetter" class="${(currentEngine === 'betterposter' && customUrl) ? '' : 'hidden'} pt-1" onclick="event.stopPropagation()">
                <input id="inputCustomBetterUrl" type="text" value="${currentEngine === 'betterposter' ? customUrl : ''}" placeholder="https://btttr.cc/poster/imdb/poster-default/{imdb_id}.jpg?lang=es-MX&rs=IM" class="lat-field w-full text-[10px] font-mono">
              </div>
            </div>
          </div>

          <!-- Tarjeta 3: PostersPlus -->
          <div id="cardPosterPlus" class="poster-option-card relative p-4 rounded-2xl bg-white/[0.03] border-2 ${currentEngine === 'postersplus' ? 'border-[#ffd479] bg-[#ffd479]/[0.06] shadow-lg' : 'border-white/10 hover:border-white/20'} cursor-pointer transition-all flex flex-col justify-between gap-3 group">
            <div class="space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-white">PostersPlus</span>
                <div class="w-5 h-5 rounded-full border-2 ${currentEngine === 'postersplus' ? 'border-[#ffd479] bg-[#ffd479] text-black' : 'border-white/20 text-transparent'} flex items-center justify-center text-[10px]">
                  <i class="fa-solid fa-check"></i>
                </div>
              </div>
              <div class="w-36 aspect-[2/3] mx-auto rounded-xl overflow-hidden bg-black/40 border border-white/10 shadow-md">
                <img src="https://postersplus.stremio.ru/poster?tmdb_id=1061474&imdb_id=tt5950044&stremio_id=tt5950044&type=movie&primary_client=stremio_tv_nuvio&top_gradient=medium&fallback_to_imdb=true&rating_display_mode=3&minimalist_append_mode=3&minimalist_mode_font_size_ratio=0.056&minimalist_mode_font_x_offset=0.065&minimalist_score_out_of_10=true&movie_weights=letterboxd%3A0.99%2Ctrakt%3A0.01&tv_weights=trakt%3A0.80%2Ctomatoes%3A0.20&logo_language=es-mx&logo_priority=native%2Cenglish%2Coriginal%2Cneutral%2Ctext&fallback_bg_style=photoreal&logo_bottom_ratio=0.23&sash_length_ratio=1.20&sash_height_ratio=0.135&badge_display_mode=0" alt="Póster Superman PostersPlus" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
              </div>
            </div>
            <div class="pt-2 border-t border-white/[0.06] space-y-2">
              <a href="https://postersplus.stremio.ru" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="lat-capsule-btn glass text-[10px] py-1 px-2.5 w-full justify-center">
                <span>Personalizar en PostersPlus</span>
                <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
              </a>
              <button type="button" id="btnToggleCustomPlus" onclick="event.stopPropagation()" class="w-full text-[10px] text-white/60 hover:text-white flex items-center justify-center gap-1">
                <i class="fa-solid fa-sliders text-[9px]"></i>
                <span>URL Propia</span>
              </button>
              <div id="containerCustomPlus" class="${(currentEngine === 'postersplus' && customUrl) ? '' : 'hidden'} pt-1" onclick="event.stopPropagation()">
                <input id="inputCustomPlusUrl" type="text" value="${currentEngine === 'postersplus' ? customUrl : ''}" placeholder="https://postersplus.stremio.ru/poster?..." class="lat-field w-full text-[10px] font-mono">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  setupPasswordToggles();

  // Eventos de la sección AIOMetadata
  const btnLoad = document.getElementById('btnLoadAioByUuid');
  const inputUuid = document.getElementById('inputAioUuid');
  const inputPass = document.getElementById('inputAioPassword');
  const btnCopy = document.getElementById('btnCopyAioManifest');

  const inputExt = document.getElementById('inputCustomExternalUrl');
  const btnResetTmdb = document.getElementById('btnResetToDefaultTmdb');

  if (inputExt) {
    inputExt.addEventListener('input', (e) => {
      accountState.customPosterUrl = e.target.value.trim();
      markDirty('aiometadata', true);
    });
  }

  if (btnResetTmdb) {
    btnResetTmdb.addEventListener('click', (e) => {
      e.stopPropagation();
      accountState.posterEngine = 'default';
      accountState.customPosterUrl = '';
      markDirty('aiometadata', true);
      renderAioSection();
    });
  }

  if (btnCopy && manifestUrl) {
    btnCopy.addEventListener('click', () => {
      navigator.clipboard.writeText(manifestUrl).then(() => {
        showToast('✓ Enlace de manifiesto copiado al portapapeles.', 'success');
      }).catch(() => {
        showToast('No se pudo copiar automáticamente.', 'warning');
      });
    });
  }

  if (btnLoad && inputUuid) {
    btnLoad.addEventListener('click', () => {
      const u = inputUuid.value.trim();
      if (inputPass) accountState.aioPassword = inputPass.value.trim() || 'NuvioSetupMaster2026';
      if (u) loadAioConfigByUuid(u, accountState.aioPassword);
    });
  }

  if (inputPass) {
    inputPass.addEventListener('input', () => {
      accountState.aioPassword = inputPass.value.trim() || 'NuvioSetupMaster2026';
      markDirty('aiometadata', true);
    });
  }

  // Selección de motor de pósters
  const cardDef = document.getElementById('cardPosterDefault');
  const cardBet = document.getElementById('cardPosterBetter');
  const cardPlu = document.getElementById('cardPosterPlus');

  if (cardDef) {
    cardDef.addEventListener('click', () => {
      if (accountState.posterEngine !== 'custom_external') {
        accountState.posterEngine = 'default';
        accountState.customPosterUrl = '';
      }
      markDirty('aiometadata', true);
      renderAioSection();
    });
  }

  if (cardBet) {
    cardBet.addEventListener('click', () => {
      accountState.posterEngine = 'betterposter';
      markDirty('aiometadata', true);
      renderAioSection();
    });
  }

  if (cardPlu) {
    cardPlu.addEventListener('click', () => {
      accountState.posterEngine = 'postersplus';
      markDirty('aiometadata', true);
      renderAioSection();
    });
  }

  // Toggles de URLs propias
  const btnToggleBet = document.getElementById('btnToggleCustomBetter');
  const containerBet = document.getElementById('containerCustomBetter');
  const inputBet = document.getElementById('inputCustomBetterUrl');

  if (btnToggleBet && containerBet) {
    btnToggleBet.addEventListener('click', (e) => {
      e.stopPropagation();
      containerBet.classList.toggle('hidden');
    });
  }

  if (inputBet) {
    inputBet.addEventListener('input', (e) => {
      accountState.customPosterUrl = e.target.value.trim();
      markDirty('aiometadata', true);
    });
  }

  const btnTogglePlu = document.getElementById('btnToggleCustomPlus');
  const containerPlu = document.getElementById('containerCustomPlus');
  const inputPlu = document.getElementById('inputCustomPlusUrl');

  if (btnTogglePlu && containerPlu) {
    btnTogglePlu.addEventListener('click', (e) => {
      e.stopPropagation();
      containerPlu.classList.toggle('hidden');
    });
  }

  if (inputPlu) {
    inputPlu.addEventListener('input', (e) => {
      accountState.customPosterUrl = e.target.value.trim();
      markDirty('aiometadata', true);
    });
  }

}

export function renderSettingsSection() {
  const container = document.getElementById('accountSettingsContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Credenciales y Enriquecimiento de Nuvio (TMDB & MDBList) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- 1. TMDB API Key -->
        <div class="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-white flex items-center gap-2">
              <i class="fa-solid fa-film text-amber-300"></i>
              <span>TMDB API Key & Enriquecimiento</span>
            </label>
            <label class="lat-switch" title="Activar/desactivar enriquecimiento oficial">
              <input type="checkbox" id="chkEnrichment" ${accountState.settings.enrichment_enabled ? 'checked' : ''}>
              <span class="lat-switch-track"><span class="lat-switch-thumb"></span></span>
            </label>
          </div>
          <div>
            <label class="text-xs text-white/60 block mb-1">Clave de API TMDB</label>
            <div class="relative">
              <input type="password" id="inputTmdbKey" value="${accountState.settings.tmdb_api_key || ''}" 
                     placeholder="API Key v3 de TMDB" class="lat-field w-full text-xs font-mono pr-10">
              <button type="button" class="btn-toggle-key absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 transition-colors cursor-pointer z-10" data-target="inputTmdbKey" title="Mostrar clave">
                <i class="fa-solid fa-eye text-xs pointer-events-none"></i>
              </button>
            </div>
            <p class="text-[11px] text-white/40 mt-1.5 leading-relaxed">
              Utilizada por Nuvio para sinopsis, actores y pósters oficiales en español latino.
            </p>
          </div>
        </div>

        <!-- 2. MDBList API Key -->
        <div class="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-white flex items-center gap-2">
              <i class="fa-solid fa-star text-amber-400"></i>
              <span>MDBList API Key & Calificaciones</span>
            </label>
            <label class="lat-switch" title="Activar/desactivar calificaciones">
              <input type="checkbox" id="chkRatings" ${accountState.settings.ratings_enabled ? 'checked' : ''}>
              <span class="lat-switch-track"><span class="lat-switch-thumb"></span></span>
            </label>
          </div>
          <div>
            <label class="text-xs text-white/60 block mb-1">Clave de API MDBList</label>
            <div class="relative">
              <input type="password" id="inputMdblistKey" value="${accountState.settings.mdblist_api_key || ''}" 
                     placeholder="API Key de MDBList" class="lat-field w-full text-xs font-mono pr-10">
              <button type="button" class="btn-toggle-key absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 transition-colors cursor-pointer z-10" data-target="inputMdblistKey" title="Mostrar clave">
                <i class="fa-solid fa-eye text-xs pointer-events-none"></i>
              </button>
            </div>
            <p class="text-[11px] text-white/40 mt-1.5 leading-relaxed">
              Proporciona calificaciones agregadas (IMDb, Rotten Tomatoes, Trakt) en las carátulas de Nuvio.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

  setupPasswordToggles();

  const chkE = document.getElementById('chkEnrichment');
  const chkR = document.getElementById('chkRatings');
  const inTmdb = document.getElementById('inputTmdbKey');
  const inMdb = document.getElementById('inputMdblistKey');

  const onSettingsChange = () => {
    if (chkE) accountState.settings.enrichment_enabled = chkE.checked;
    if (chkR) accountState.settings.ratings_enabled = chkR.checked;
    if (inTmdb) accountState.settings.tmdb_api_key = inTmdb.value.trim();
    if (inMdb) accountState.settings.mdblist_api_key = inMdb.value.trim();
    markDirty('settings', true);
  };

  if (chkE) chkE.addEventListener('change', onSettingsChange);
  if (chkR) chkR.addEventListener('change', onSettingsChange);
  if (inTmdb) inTmdb.addEventListener('input', onSettingsChange);
  if (inMdb) inMdb.addEventListener('input', onSettingsChange);
}

export async function saveAllChanges() {
  if (accountState.isSaving) return;
  const changed = Object.keys(accountState.dirty).filter(k => accountState.dirty[k]);
  if (changed.length === 0) {
    showToast('No hay cambios pendientes por guardar.', 'info');
    return;
  }

  accountState.isSaving = true;
  updateSaveButton();
  const btn = document.getElementById('btnAccountSave');
  if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Guardando...';

  try {
    const profId = accountState.selectedProfileId;

    // 0. Guardar Avatar de Perfil si cambió
    if (accountState.dirty.avatar && accountState.selectedAvatarUrl) {
      const avatarUrlToSave = resolvePublicAvatarUrl(accountState.selectedAvatarUrl);
      await NuvioClient.updateProfileAvatar({
        apiUrl: CONFIG.NUVIO_API_URL,
        apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
        accessToken: accountState.session.accessToken,
        userId: accountState.session.userId,
        profileId: profId,
        avatarUrl: avatarUrlToSave
      });

      // Actualizar en el estado local del perfil
      const targetProf = (accountState.profiles || []).find(p => Number(p.profile_index ?? p.id) === Number(profId));
      if (targetProf) {
        targetProf.avatar_url = avatarUrlToSave;
      }
      accountState.originalAvatarUrl = accountState.selectedAvatarUrl;

      // Actualizar avatar en barra lateral y popover
      const sidebarAvatar = document.getElementById('sidebarActiveAvatar');
      if (sidebarAvatar) sidebarAvatar.src = accountState.selectedAvatarUrl;

      renderProfilePopover();
      accountState.dirty.avatar = false;

      const modifiedBadge = document.getElementById('avatarModifiedBadge');
      if (modifiedBadge) modifiedBadge.classList.add('hidden');
    }

    // 1. Guardar Ajustes de Nuvio & Credenciales (TMDB / MDBList)
    if (accountState.dirty.settings) {
      // Regla de Oro: Preservar credenciales existentes si el input está vacío
      const tmdbKeyToSave = (accountState.settings.tmdb_api_key || accountState.originalSettings.tmdb_api_key || '').trim();
      const mdblistKeyToSave = (accountState.settings.mdblist_api_key || accountState.originalSettings.mdblist_api_key || '').trim();

      const profileSettingsPayload = {
        language: 'es-MX',
        tmdb_language: 'es-MX',
        enrichment_enabled: Boolean(accountState.settings.enrichment_enabled),
        ratings_enabled: Boolean(accountState.settings.ratings_enabled),
        tmdb_api_key: tmdbKeyToSave,
        mdblist_api_key: mdblistKeyToSave
      };

      // Preservar badges existentes en la TV del usuario si los tenía configurados
      if (accountState._rawStreamBadgeSettings) {
        profileSettingsPayload.stream_badge_settings = accountState._rawStreamBadgeSettings;
      }

      for (const platform of ['tv', 'mobile', 'desktop']) {
        await NuvioClient.pushProfileSettings({
          apiUrl: CONFIG.NUVIO_API_URL,
          apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
          accessToken: accountState.session.accessToken,
          profileId: profId,
          platform,
          settings: profileSettingsPayload
        }).catch(() => null);
      }

      // Sincronizar credenciales oficiales de proveedores en Nuvio
      const creds = [];
      if (tmdbKeyToSave) {
        creds.push({ provider: 'tmdb', credential_json: { api_key: tmdbKeyToSave } });
      }
      if (mdblistKeyToSave) {
        creds.push({ provider: 'mdblist', credential_json: { api_key: mdblistKeyToSave } });
      }
      if (creds.length > 0) {
        await NuvioClient.pushProviderCredentials({
          apiUrl: CONFIG.NUVIO_API_URL,
          apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
          accessToken: accountState.session.accessToken,
          profileId: profId,
          credentials: creds
        }).catch(() => null);
      }

      accountState.originalSettings = JSON.parse(JSON.stringify(accountState.settings));
      accountState.dirty.settings = false;
    }

    // 3. Guardar AIOMetadata Addon (Motor de Pósters, URLs y Credenciales)
    if (accountState.dirty.aiometadata && accountState.aioUuid && accountState.aioConfig) {
      const tmdbKeyToSave = (accountState.settings.tmdb_api_key || accountState.originalSettings.tmdb_api_key || '').trim();
      const mdblistKeyToSave = (accountState.settings.mdblist_api_key || accountState.originalSettings.mdblist_api_key || '').trim();

      const cfg = accountState.aioConfig.config || accountState.aioConfig;
      if (!cfg.apiKeys) cfg.apiKeys = {};
      if (tmdbKeyToSave) cfg.apiKeys.tmdb = tmdbKeyToSave;
      if (mdblistKeyToSave) cfg.apiKeys.mdblist = mdblistKeyToSave;

      const engine = accountState.posterEngine || 'default';
      if (engine === 'default') {
        cfg.posterRatingProvider = "none";
        cfg.customPosterUrlPattern = "";
        cfg.enableRatingPostersForLibrary = false;
        cfg.usePosterProxy = false;
      } else if (engine === 'betterposter') {
        cfg.posterRatingProvider = "custom";
        cfg.customPosterUrlPattern = (accountState.customPosterUrl || '').trim() ||
          "https://btttr.cc/poster/imdb/poster-default/{imdb_id}.jpg?lang=es-MX&rs=IM";
        cfg.enableRatingPostersForLibrary = true;
        cfg.usePosterProxy = true;
      } else if (engine === 'postersplus') {
        cfg.posterRatingProvider = "custom";
        const tmdbEnc = encodeURIComponent(tmdbKeyToSave);
        const mdbEnc = encodeURIComponent(mdblistKeyToSave);
        const defaultPostersPlusPattern = `https://postersplus.stremio.ru/poster?tmdb_id={tmdb_id?}&imdb_id={imdb_id?}&stremio_id={id}&type={type}&primary_client=stremio_tv_nuvio&tmdb_key=${tmdbEnc}&mdblist_key=${mdbEnc}&top_gradient=medium&fallback_to_imdb=true&rating_display_mode=3&minimalist_append_mode=3&minimalist_mode_font_size_ratio=0.056&minimalist_mode_font_x_offset=0.065&minimalist_score_out_of_10=true&movie_weights=letterboxd%3A0.99%2Ctrakt%3A0.01&tv_weights=trakt%3A0.80%2Ctomatoes%3A0.20&logo_language=es-mx&logo_priority=native%2Cenglish%2Coriginal%2Cneutral%2Ctext&fallback_bg_style=photoreal&logo_bottom_ratio=0.23&sash_length_ratio=1.20&sash_height_ratio=0.135&badge_display_mode=0`;
        cfg.customPosterUrlPattern = (accountState.customPosterUrl || '').trim() || defaultPostersPlusPattern;
        cfg.enableRatingPostersForLibrary = true;
        cfg.usePosterProxy = true;
      } else if (engine === 'custom_external') {
        cfg.posterRatingProvider = "custom";
        cfg.customPosterUrlPattern = (accountState.customPosterUrl || '').trim();
        cfg.enableRatingPostersForLibrary = true;
        cfg.usePosterProxy = true;
      }

      await AIOMetadataClient.updateWithFallbacks(
        CONFIG.AIOMETADATA_INSTANCES,
        accountState.aioUuid,
        {
          password: accountState.aioPassword,
          config: accountState.aioConfig
        }
      );
      accountState.originalAioConfig = JSON.parse(JSON.stringify(accountState.aioConfig));
      accountState.dirty.aiometadata = false;
    }

    showToast('✓ Cambios guardados exitosamente con equivalencia total.', 'success');
  } catch (err) {
    console.error('[AccountManager] Error guardando cambios:', err);
    showToast(`Error al guardar: ${err.message}`, 'error');
  } finally {
    accountState.isSaving = false;
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-1.5"></i><span>Guardar Cambios</span><span id="accountSaveCountBadge" class="hidden ml-1.5 px-2 py-0.5 rounded-full text-[11px] bg-black text-[#ffd479] font-mono font-bold"></span>';
    }
    updateSaveButton();
  }
}

export function setupScrollableTabs() {
  const container = document.querySelector('.account-tabs-pill');
  if (!container || container.dataset.scrollBound === 'true') return;
  container.dataset.scrollBound = 'true';

  // 1. Desplazamiento horizontal con la rueda del ratón
  container.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  // 2. Arrastre fluido con clic del ratón (drag-to-scroll)
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let hasMoved = false;

  container.addEventListener('mousedown', (e) => {
    isDown = true;
    hasMoved = false;
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  });

  window.addEventListener('mouseup', () => {
    isDown = false;
  });

  container.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX);
    if (Math.abs(walk) > 4) {
      hasMoved = true;
      e.preventDefault();
      container.scrollLeft = scrollLeft - walk;
    }
  });

  // Prevenir clics accidentales si el usuario estaba arrastrando la barra
  container.querySelectorAll('.account-nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (hasMoved) {
        e.preventDefault();
        e.stopImmediatePropagation();
        hasMoved = false;
      }
    }, true);
  });
}

// ============================================================
// NAVEGACIÓN DE SECCIONES EN LA SUB-BARRA HORIZONTAL
// ============================================================

export function switchSection(sectionId) {
  accountState.activeSection = sectionId;

  // Actualizar botones de navegación
  let targetBtn = null;
  document.querySelectorAll('.account-nav-btn').forEach(btn => {
    const isAct = btn.dataset.section === sectionId;
    btn.classList.toggle('is-active', isAct);
    if (isAct) targetBtn = btn;
  });

  // Centrar suavemente el botón activo dentro de la cápsula deslizable si desborda
  if (targetBtn && typeof targetBtn.scrollIntoView === 'function') {
    targetBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  // Mostrar panel correspondiente
  document.querySelectorAll('.account-section-pane').forEach(pane => {
    pane.classList.toggle('is-active', pane.id === `sectionPane-${sectionId}`);
  });

  if (sectionId === 'overview') {
    renderOverviewSection();
  } else if (sectionId === 'avatars') {
    renderAvatarsSection();
  } else if (sectionId === 'aiometadata') {
    setupPasswordToggles();
  } else if (sectionId === 'settings') {
    setupPasswordToggles();
  }
}

// ============================================================
// INICIALIZACIÓN GLOBAL DE /cuenta
// ============================================================

export async function initAccountPage() {
  const authView = document.getElementById('accountAuthView');
  const dashboardView = document.getElementById('accountDashboardView');
  const authForm = document.getElementById('accountAuthForm');
  const btnLogout = document.getElementById('btnAccountLogout');
  const btnSave = document.getElementById('btnAccountSave');

  // 1. Inicialización síncrona inmediata de componentes y controles de interfaz (0ms lag)
  setupPasswordToggles();
  setupScrollableTabs();
  setupProfilePopover();
  setupProfileModals();

  // Navegación por tabs en la sub-barra horizontal (registrado de inmediato)
  document.querySelectorAll('.account-nav-btn').forEach(btn => {
    if (!btn.dataset.bound) {
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => {
        const section = btn.dataset.section;
        if (section) switchSection(section);
      });
    }
  });

  // Botón de cerrar sesión
  if (btnLogout && !btnLogout.dataset.bound) {
    btnLogout.dataset.bound = 'true';
    btnLogout.addEventListener('click', () => {
      clearSession();
      if (dashboardView) dashboardView.classList.add('hidden');
      if (authView) authView.classList.remove('hidden');
      showToast('Sesión cerrada correctamente.', 'info');
    });
  }

  // Botón de guardar cambios
  if (btnSave && !btnSave.dataset.bound) {
    btnSave.dataset.bound = 'true';
    btnSave.addEventListener('click', saveAllChanges);
  }

  // Precargar catálogo dinámico de avatares en segundo plano (Live Server crawler o GitHub Tree)
  loadAvatarsCatalog().catch(() => null);

  // 2. Revisar si hay sesión activa en sessionStorage
  const session = loadSession();
  if (session?.accessToken) {
    if (authView) authView.classList.add('hidden');
    if (dashboardView) dashboardView.classList.remove('hidden');

    try {
      await fetchProfiles();
      renderProfilePopover();

      if (accountState.profiles.length > 0) {
        if (!accountState.hasChosenProfileInSession) {
          showSelectProfilePrompt();
        }
        await selectProfile(accountState.profiles[0].profile_index ?? accountState.profiles[0].id);
      }
    } catch (err) {
      showToast(`Error al cargar cuenta: ${err.message}`, 'error');
    }
  } else {
    if (authView) authView.classList.remove('hidden');
    if (dashboardView) dashboardView.classList.add('hidden');
  }

  // 3. Formulario de inicio de sesión
  if (authForm && !authForm.dataset.bound) {
    authForm.dataset.bound = 'true';
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('accountEmail')?.value.trim();
      const password = document.getElementById('accountPassword')?.value;
      const btnSubmit = authForm.querySelector('button[type="submit"]');

      if (!email || !password) {
        showToast('Por favor completa correo y contraseña.', 'error');
        return;
      }

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Iniciando sesión...';
      }

      try {
        const loginData = await NuvioClient.login({
          apiUrl: CONFIG.NUVIO_API_URL,
          apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
          email,
          password
        });

        saveSession({
          accessToken: loginData.accessToken,
          userId: loginData.userId,
          email
        });

        showToast('Sesión iniciada correctamente.', 'success');
        if (authView) authView.classList.add('hidden');
        if (dashboardView) dashboardView.classList.remove('hidden');

        await fetchProfiles();
        renderProfilePopover();

        if (accountState.profiles.length > 0) {
          showSelectProfilePrompt();
          await selectProfile(accountState.profiles[0].profile_index ?? accountState.profiles[0].id);
        }
      } catch (err) {
        showToast(`Error de acceso: ${err.message}`, 'error');
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Iniciar Sesión';
        }
      }
    });
  }
}

// Inicializar automáticamente cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAccountPage);
} else {
  initAccountPage();
}
