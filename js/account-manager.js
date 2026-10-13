/**
 * Controlador Modular del Gestor de Cuenta y Perfil (/account)
 * Ecosistema Nuvio Metadata Latino & AIOMetadata
 */
import { CONFIG } from './config.js';
import { NuvioClient } from './nuvio-client.js';
import { AIOMetadataClient } from './aiometadata-client.js';
import { state, isAioMetadataAddon } from './state.js';
import { MiniNuvio } from './mini-nuvio.js';
import { BADGE_PACKS, compileUniversalBadgeRules, getBadgePackById } from './badge-packs.js';
import { 
  getCompiledAvatars, 
  getStylesSummary, 
  getFranchisesSummary, 
  filterAvatars, 
  formatCharacterName, 
  formatFranchiseName, 
  formatStyleName 
} from './avatars-data.js';

// Clave segura para sesión bajo demanda en la pestaña actual
const SESSION_KEY = 'nuvio_account_session_v1';

// Estado reactivo local del gestor de cuenta
export const accountState = {
  session: null, // { accessToken, userId, email }
  profiles: [],
  selectedProfileId: null,
  activeSection: 'overview', // 'overview' | 'avatars' | 'collections' | 'aiometadata' | 'settings'
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

  // Colecciones dinámicas reales del perfil del usuario
  collections: [],
  originalCollections: [],
  hasUserCollections: false,
  installedAddons: [],

  // AIOMetadata vinculado y opciones exclusivas del addon
  aioAddon: null,
  aioUuid: null,
  aioConfig: null,
  originalAioConfig: null,
  aioPassword: 'NuvioSetupMaster2026',
  aioProtected: false, // Flag si requiere contraseña personalizada
  posterEngine: 'default', // 'default' | 'betterposter' | 'postersplus'
  customPosterUrl: '',

  // Ajustes de Nuvio, Credenciales & Fusion Badges
  settings: {
    enrichment_enabled: true,
    ratings_enabled: true,
    tmdb_language: 'es-MX',
    tmdb_api_key: '',
    mdblist_api_key: '',
    badgesEnabled: false,
    selectedBadgePack: 'tinted'
  },
  originalSettings: {},

  // Dirty State Tracker (Rastreo inteligente de cambios para guardar solo lo necesario)
  dirty: {
    collections: false,
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
  accountState.collections = [];
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
  accountState.dirty = { collections: false, aiometadata: false, settings: false, avatar: false };
  updateSaveButton();

  // Si ya nos encontramos en la sección de avatares, re-renderizar de inmediato
  if (accountState.activeSection === 'avatars') {
    renderAvatarsSection();
  } else {
    // Activar por defecto la sección Resumen
    switchSection('overview');
  }

  // Cargar concurrentemente los datos del perfil seleccionado
  await Promise.all([
    loadProfileAddonsAndAio(),
    loadProfileCollections(),
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
        accountState.posterEngine = 'betterposter';
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
// NORMALIZACIÓN Y CARGA DINÁMICA DE COLECCIONES DEL USUARIO
// ============================================================

export function normalizeUserCollections(raw) {
  if (!raw) return [];

  let data = raw;

  // 1. Si es un string, deserializar JSON
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (_) { return []; }
  }

  // 2. Si viene envuelto en un objeto contenedor (RPC o wrapper)
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (Array.isArray(data.folders)) {
      data = [data]; // Es una sección sola con folders
    } else {
      const extracted = data.collections_json ?? 
                        data.p_collections_json ?? 
                        data.collections ?? 
                        data.data ?? 
                        data.p_collections ?? 
                        data.content ?? 
                        data.items;
      if (extracted !== undefined) {
        data = extracted;
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch (_) { data = []; }
        }
      }
    }
  }

  // 3. Si es un array, buscar si los elementos son filas de la tabla collections de Supabase (PostgREST)
  // Cada fila de la tabla collections tiene { id, profile_id, collections_json, ... }
  if (Array.isArray(data)) {
    const rowWithCollections = data.find(item => item && typeof item === 'object' && (
      item.collections_json !== undefined ||
      item.p_collections_json !== undefined ||
      (item.collections !== undefined && Array.isArray(item.collections)) ||
      (item.data !== undefined && (Array.isArray(item.data) || typeof item.data === 'string'))
    ));

    if (rowWithCollections) {
      let inner = rowWithCollections.collections_json ??
                  rowWithCollections.p_collections_json ??
                  rowWithCollections.collections ??
                  rowWithCollections.data;
      if (typeof inner === 'string') {
        try { inner = JSON.parse(inner); } catch (_) { inner = []; }
      }
      if (Array.isArray(inner) && inner.length > 0) {
        data = inner;
      }
    }
  }

  if (!Array.isArray(data) || data.length === 0) return [];

  // Formato 1: Árbol de secciones nativo (usado por Nuvio TV y el RPC sync_push_collections)
  // Cada sección contiene un array de 'folders'
  if (data.some(item => item && Array.isArray(item.folders))) {
    return data
      .filter(sec => sec && (Array.isArray(sec.folders) || sec.title || sec.name))
      .map((sec, sIdx) => ({
        id: String(sec.id || `section-${sIdx + 1}`),
        title: sec.title || sec.name || `Sección ${sIdx + 1}`,
        name: sec.name || sec.title || `Sección ${sIdx + 1}`,
        icon: sec.icon || 'fa-solid fa-layer-group',
        pinToTop: sec.pinToTop !== undefined ? sec.pinToTop : true,
        enabled: sec.enabled !== false,
        folders: (sec.folders || []).map((f, fIdx) => ({
          id: String(f.id || `folder-${fIdx + 1}`),
          title: f.title || f.name || `Colección ${fIdx + 1}`,
          name: f.name || f.title || `Colección ${fIdx + 1}`,
          type: f.type || 'movie',
          enabled: f.enabled !== false,
          coverEmoji: f.coverEmoji || '🎬',
          tileShape: f.tileShape || 'LANDSCAPE',
          heroBackdropUrl: f.heroBackdropUrl || f.coverImageUrl || '',
          coverImageUrl: f.coverImageUrl || f.heroBackdropUrl || '',
          titleLogoUrl: f.titleLogoUrl || '',
          sources: Array.isArray(f.sources) ? f.sources : [],
          catalogSources: Array.isArray(f.catalogSources) ? f.catalogSources : (Array.isArray(f.sources) ? f.sources : [])
        }))
      }));
  }

  // Formato 2: Lista de carpetas sueltas (folders con sources pero sin sección contenedora)
  if (data.some(item => item && (Array.isArray(item.sources) || Array.isArray(item.catalogSources) || item.coverImageUrl))) {
    return [{
      id: 'user-collections',
      title: 'Mis Colecciones de Nuvio',
      name: 'Mis Colecciones de Nuvio',
      icon: 'fa-solid fa-layer-group',
      pinToTop: true,
      enabled: true,
      folders: data.map((f, fIdx) => ({
        id: String(f.id || `folder-${fIdx + 1}`),
        title: f.title || f.name || `Colección ${fIdx + 1}`,
        name: f.name || f.title || `Colección ${fIdx + 1}`,
        type: f.type || 'movie',
        enabled: f.enabled !== false,
        coverEmoji: f.coverEmoji || '🎬',
        tileShape: f.tileShape || 'LANDSCAPE',
        heroBackdropUrl: f.heroBackdropUrl || f.coverImageUrl || '',
        coverImageUrl: f.coverImageUrl || f.heroBackdropUrl || '',
        titleLogoUrl: f.titleLogoUrl || '',
        sources: Array.isArray(f.sources) ? f.sources : [],
        catalogSources: Array.isArray(f.catalogSources) ? f.catalogSources : (Array.isArray(f.sources) ? f.sources : [])
      }))
    }];
  }

  // Formato 3: Lista plana de catálogos individuales válidos (con catalog_id o name legítimo que NO sea 'Catálogo 1')
  const validCatalogs = data.filter(r => r && (r.catalog_id || (r.name && !/^catálogo\s*\d+$/i.test(r.name)) || (r.title && !/^catálogo\s*\d+$/i.test(r.title))));
  if (validCatalogs.length > 0) {
    return [{
      id: 'user-collections',
      title: 'Mis Colecciones de Nuvio',
      name: 'Mis Colecciones de Nuvio',
      icon: 'fa-solid fa-layer-group',
      pinToTop: true,
      enabled: true,
      folders: validCatalogs.map((row, idx) => {
        const catId = row.catalog_id || row.id || `row-${idx + 1}`;
        const title = row.name || row.title || `Colección ${idx + 1}`;
        const type = row.catalog_type || row.type || 'movie';
        return {
          id: String(catId),
          title: title,
          name: title,
          type: type,
          enabled: row.enabled !== false && row.is_active !== false,
          coverEmoji: '🎬',
          tileShape: row.tile_shape || 'LANDSCAPE',
          heroBackdropUrl: row.backdrop_url || row.heroBackdropUrl || row.cover_url || '',
          coverImageUrl: row.cover_url || row.coverImageUrl || row.backdrop_url || '',
          titleLogoUrl: row.title_logo_url || row.titleLogoUrl || '',
          sources: Array.isArray(row.sources) ? row.sources : [{
            catalogId: catId,
            title: title,
            type: type,
            addonId: row.addon_id || 'aio-metadata'
          }],
          catalogSources: Array.isArray(row.catalogSources) ? row.catalogSources : [{
            catalogId: catId,
            title: title,
            type: type,
            addonId: row.addon_id || 'aio-metadata'
          }]
        };
      })
    }];
  }

  // Si no contiene colecciones válidas, retornar vacío para que active el Empty State
  return [];
}

function renderCollectionsEmptyState() {
  const emptyStateEl = document.getElementById('accountCollectionsEmptyState');
  const miniContainer = document.getElementById('miniNuvioContainer');
  if (!emptyStateEl) return;

  if (miniContainer) miniContainer.classList.add('hidden');
  emptyStateEl.classList.remove('hidden');

  emptyStateEl.innerHTML = `
    <div class="p-8 text-center bg-white/[0.03] border border-white/10 rounded-2xl space-y-4 max-w-xl mx-auto my-6">
      <div class="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center mx-auto text-xl">
        <i class="fa-solid fa-layer-group"></i>
      </div>
      <div>
        <h4 class="text-base font-semibold text-white">Sin Colecciones Registradas</h4>
        <p class="text-xs text-white/60 mt-1 max-w-md mx-auto">
          Este perfil no tiene colecciones configuradas en Nuvio. Puedes importar la plantilla base de Metadata Latino o agregar tus propias filas.
        </p>
      </div>
      <div class="flex items-center justify-center gap-3 pt-2">
        <button type="button" id="btnImportDefaultTemplates" class="lat-capsule-btn glass text-xs py-2 px-4 text-[#ffd479] border-[#ffd479]/30 hover:border-[#ffd479]/60">
          <i class="fa-solid fa-file-import mr-1.5"></i> Cargar Plantilla Metadata Latino
        </button>
      </div>
    </div>
  `;

  const btnImport = document.getElementById('btnImportDefaultTemplates');
  if (btnImport) {
    btnImport.addEventListener('click', async () => {
      btnImport.disabled = true;
      btnImport.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Cargando plantilla...';
      try {
        await state.loadTemplates();
        accountState.collections = JSON.parse(JSON.stringify(state.collections));
        accountState.originalCollections = [];
        accountState.hasUserCollections = true;
        markDirty('collections', true);

        emptyStateEl.classList.add('hidden');
        if (miniContainer) miniContainer.classList.remove('hidden');

        state.notify('COLLECTIONS_UPDATED');
        renderMiniNuvio();
        showToast('✓ Plantilla cargada. Pulsa "Guardar Cambios" para inyectarla en Nuvio.', 'success');
      } catch (e) {
        showToast(`Error al cargar plantilla: ${e.message}`, 'error');
        btnImport.disabled = false;
        btnImport.innerHTML = '<i class="fa-solid fa-file-import mr-1.5"></i> Cargar Plantilla Metadata Latino';
      }
    });
  }
}

let isInternalUpdating = false;

async function loadProfileCollections() {
  const profId = accountState.selectedProfileId;
  if (!profId || !accountState.session) return;

  const emptyStateEl = document.getElementById('accountCollectionsEmptyState');
  const miniContainer = document.getElementById('miniNuvioContainer');

  try {
    isInternalUpdating = true;
    // 1. Obtener colecciones sincronizadas reales directamente de Nuvio (sin forzar plantilla estática)
    const rawCollections = await NuvioClient.pullCollections({
      apiUrl: CONFIG.NUVIO_API_URL,
      apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
      accessToken: accountState.session.accessToken,
      profileId: profId
    });

    const parsed = normalizeUserCollections(rawCollections);

    if (parsed.length > 0) {
      accountState.hasUserCollections = true;
      state.collections = parsed;
      accountState.collections = JSON.parse(JSON.stringify(parsed));
      accountState.originalCollections = JSON.parse(JSON.stringify(parsed));

      if (emptyStateEl) emptyStateEl.classList.add('hidden');
      if (miniContainer) miniContainer.classList.remove('hidden');

      state.notify('COLLECTIONS_UPDATED');
      renderMiniNuvio();

      const totalCols = parsed.length;
      if (accountState.overviewData) accountState.overviewData.collectionsCount = totalCols;
      const elCol = document.getElementById('metricCollectionsCount');
      if (elCol) elCol.textContent = totalCols;
    } else {
      accountState.hasUserCollections = false;
      state.collections = [];
      accountState.collections = [];
      accountState.originalCollections = [];

      if (accountState.overviewData) accountState.overviewData.collectionsCount = 0;
      const elCol = document.getElementById('metricCollectionsCount');
      if (elCol) elCol.textContent = 0;

      renderCollectionsEmptyState();
    }

    accountState.dirty.collections = false;
    updateSaveButton();
  } catch (err) {
    console.warn('[AccountManager] Error cargando colecciones reales del perfil:', err);
    renderCollectionsEmptyState();
  } finally {
    isInternalUpdating = false;
  }
}

export function renderMiniNuvio() {
  const container = document.getElementById('miniNuvioContainer');
  if (!container) return;

  if (!window.miniNuvioInstance) {
    window.miniNuvioInstance = new MiniNuvio('miniNuvioContainer');
    window.miniNuvioInstance.init();
  } else {
    window.miniNuvioInstance.focusedFolder = null;
    window.miniNuvioInstance.render();
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

    const features = blob?.features || blob?.settings?.features || blob?.p_settings?.features || blob || {};
    const tmdb = features.tmdb_settings || features.tmdb || {};
    const mdblist = features.mdblist_settings || features.mdblist || {};
    const streamBadges = features.stream_badge_settings || {};

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

    // 5. Detectar Fusion Badges en Nuvio
    const rawBadgeRules = streamBadges.stream_badge_rules?.value || streamBadges.stream_badge_rules || '';
    const hasBadges = Boolean(rawBadgeRules && String(rawBadgeRules).trim().length > 10 && rawBadgeRules !== 'null');

    let detectedPack = 'tinted';
    if (rawBadgeRules) {
      const lower = String(rawBadgeRules).toLowerCase();
      if (lower.includes('glow')) detectedPack = 'glow';
      else if (lower.includes('solid')) detectedPack = 'solid';
      else if (lower.includes('clear')) detectedPack = 'clear';
      else if (lower.includes('tinted')) detectedPack = 'tinted';
    }

    accountState.settings = {
      enrichment_enabled: tmdb.tmdb_enabled?.value !== false,
      ratings_enabled: mdblist.mdblist_enabled?.value !== false,
      tmdb_language: tmdb.tmdb_language?.value || 'es-MX',
      tmdb_api_key: resolvedTmdbKey,
      mdblist_api_key: resolvedMdblistKey,
      badgesEnabled: hasBadges,
      selectedBadgePack: detectedPack
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
export function openCreateProfileModal() {
  if ((accountState.profiles || []).length >= 6) {
    showToast('Has alcanzado el límite máximo de 6 perfiles en Nuvio.', 'warning');
    return;
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

  // Modal Crear Perfil
  const formCreate = document.getElementById('formCreateProfile');
  const btnCloseCreate = document.getElementById('btnCloseCreateProfileModal');
  const btnCancelCreate = document.getElementById('btnCancelCreateProfile');
  const btnPopoverAdd = document.getElementById('btnPopoverAddProfile');

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
          name: name
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

    const calcCollectionsCount = () => {
      if (Array.isArray(accountState.collections) && accountState.collections.length > 0) {
        return accountState.collections.length;
      }
      return 0;
    };

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
      if (currentlyWatching.length >= 5) break;
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
      collectionsCount: calcCollectionsCount(),
      watchedCount,
      currentlyWatching,
      recentlyWatched: uniqueWatchedItems.slice(0, 5)
    };

    renderOverviewSection();
  } catch (err) {
    console.warn('[AccountManager] Error cargando métricas de resumen:', err);
  }
}

export async function renderOverviewSection() {
  const data = accountState.overviewData;
  if (!data) return;

  // Actualizar las 6 tarjetas de métricas (coherencia 100% con SYNC DATA de Nuvio)
  const elPlugins = document.getElementById('metricPluginsCount');
  const elAddons = document.getElementById('metricAddonsCount');
  const elProgress = document.getElementById('metricProgressCount');
  const elLibrary = document.getElementById('metricLibraryCount');
  const elCollections = document.getElementById('metricCollectionsCount');
  const elWatched = document.getElementById('metricWatchedCount');

  if (elPlugins) elPlugins.textContent = data.pluginsCount;
  if (elAddons) elAddons.textContent = (accountState.installedAddons || []).length || data.addonsCount;
  if (elProgress) elProgress.textContent = data.progressCount;
  if (elLibrary) elLibrary.textContent = data.libraryCount;
  if (elCollections) {
    let colCount = data.collectionsCount;
    if (colCount === undefined && Array.isArray(accountState.collections)) {
      colCount = accountState.collections.length;
    }
    elCollections.textContent = colCount ?? 0;
  }
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
  if (/^https?:\/\//i.test(trimmed) || /^data:image\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.includes('assets/profile_icons/')) {
    const subPath = trimmed.split('assets/profile_icons/')[1];
    if (subPath) {
      return `https://raw.githubusercontent.com/${CONFIG.GITHUB_REPO}/main/assets/profile_icons/${subPath}`;
    }
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

  const reader = new FileReader();
  reader.onload = (e) => {
    const rawDataUrl = e.target.result;
    const img = new Image();
    img.onload = () => {
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
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setNewSelectedAvatar(optimizedDataUrl);
        showToast('✓ Imagen personalizada cargada. Pulsa "Guardar Cambios".', 'info');
      } catch (_) {
        setNewSelectedAvatar(rawDataUrl);
        showToast('✓ Imagen personalizada cargada. Pulsa "Guardar Cambios".', 'info');
      }
    };
    img.onerror = () => {
      setNewSelectedAvatar(rawDataUrl);
      showToast('✓ Imagen personalizada cargada. Pulsa "Guardar Cambios".', 'info');
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
  renderAvatarStylePills();
  renderAvatarFranchisePills();
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
        renderAvatarFranchisePills();
        renderAvatarsCatalog();
      }
    });
  });
}

function renderAvatarFranchisePills() {
  const container = document.getElementById('avatarFranchiseFilterPills');
  if (!container) return;

  const franchises = getFranchisesSummary(accountState.avatarFilters.style);
  container.innerHTML = franchises.map(f => {
    const isAct = f.id === accountState.avatarFilters.franchise;
    return `
      <button type="button" class="avatar-filter-pill ${isAct ? 'is-active' : ''}" data-franchise-id="${f.id}">
        <span>${f.name}</span>
        <span class="pill-badge">${f.count}</span>
      </button>
    `;
  }).join('');

  container.querySelectorAll('.avatar-filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const fId = btn.dataset.franchiseId;
      if (fId && fId !== accountState.avatarFilters.franchise) {
        accountState.avatarFilters.franchise = fId;
        renderAvatarFranchisePills();
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
        renderAvatarFranchisePills();
        renderAvatarsCatalog();
      });
    }
    return;
  }

  const renderCard = (av) => {
    const isSelected = av.path === activeAvatar || resolvePublicAvatarUrl(av.path) === activePublic;
    return `
      <div class="netflix-avatar-card ${isSelected ? 'is-selected' : ''}" 
           data-avatar-path="${av.path}" 
           data-avatar-name="${av.character}" 
           title="${av.character} (${av.franchiseName})">
        <img src="${av.path}" alt="${av.character}" class="avatar-card-img" loading="lazy" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=Nuvio'">
        <div class="avatar-card-name-overlay">${av.character}</div>
        <div class="avatar-selected-badge">
          <i class="fa-solid fa-check"></i>
        </div>
      </div>
    `;
  };

  // Si no hay filtro de franquicia y no hay búsqueda activa, agrupar por obras tipo Netflix
  if (accountState.avatarFilters.franchise === 'all' && !accountState.avatarFilters.query) {
    const groups = new Map();
    for (const av of filtered) {
      if (!groups.has(av.franchise)) {
        groups.set(av.franchise, { name: av.franchiseName, items: [] });
      }
      groups.get(av.franchise).items.push(av);
    }

    let html = '';
    for (const [fId, group] of groups.entries()) {
      html += `
        <div class="space-y-3">
          <div class="flex items-center justify-between pb-1 border-b border-white/[0.06]">
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              <i class="fa-solid fa-masks-theater text-[#ffd479] text-xs"></i>
              <span>${group.name}</span>
            </h4>
            <span class="text-xs text-white/40 font-mono">${group.items.length} avatares</span>
          </div>
          <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
            ${group.items.map(renderCard).join('')}
          </div>
        </div>
      `;
    }
    container.innerHTML = html;
  } else {
    // Modo filtrado plano
    container.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center justify-between pb-1 border-b border-white/[0.06]">
          <span class="text-xs text-white/50 font-medium">Mostrando ${filtered.length} avatares</span>
        </div>
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
          ${filtered.map(renderCard).join('')}
        </div>
      </div>
    `;
  }

  // Eventos de selección de avatar
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

  card.innerHTML = `
    <div class="space-y-6">
      <!-- 1. Tarjeta de Identidad y Enlaces del Addon -->
      <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2.5">
            <i class="fa-solid fa-wand-magic-sparkles text-emerald-400 text-lg"></i>
            <div>
              <h4 class="text-sm font-semibold text-white">Addon AIOMetadata Vinculado</h4>
              <span class="text-xs text-white/50">${hasAddon ? 'Detectado y activo en este perfil' : 'No detectado en este perfil'}</span>
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
          <!-- Tarjeta 1: Default (Limpio) -->
          <div id="cardPosterDefault" class="poster-option-card relative p-4 rounded-2xl bg-white/[0.03] border-2 ${currentEngine === 'default' ? 'border-[#ffd479] bg-[#ffd479]/[0.06] shadow-lg' : 'border-white/10 hover:border-white/20'} cursor-pointer transition-all flex flex-col justify-between gap-3 group">
            <div class="space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-white">Default (Nativo)</span>
                <div class="w-5 h-5 rounded-full border-2 ${currentEngine === 'default' ? 'border-[#ffd479] bg-[#ffd479] text-black' : 'border-white/20 text-transparent'} flex items-center justify-center text-[10px]">
                  <i class="fa-solid fa-check"></i>
                </div>
              </div>
              <div class="w-36 aspect-[2/3] mx-auto rounded-xl overflow-hidden bg-black/40 border border-white/10 shadow-md">
                <img src="https://upload.wikimedia.org/wikipedia/en/3/32/Superman_%282025_film%29_poster.jpg" alt="Póster Superman Original" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
              </div>
            </div>
            <div class="pt-2 border-t border-white/[0.06] text-center">
              <span class="text-[10px] text-white/50">TMDB Limpio es-MX (Sin dependencias)</span>
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

      <!-- 3. Sincronización de Catálogos con Colecciones de Nuvio -->
      <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-white">Catálogos de AIOMetadata sincronizados:</span>
            <span class="text-xs font-mono text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              ${catalogsCount} activos
            </span>
          </div>
          <p class="text-xs text-white/50">
            Al sincronizar, AIOMetadata activará en segundo plano exactamente los catálogos correspondientes a tus colecciones de Nuvio.
          </p>
        </div>
        <button type="button" id="btnSyncAioWithCollections" class="lat-capsule-btn glass text-xs py-2 px-4 shrink-0 font-medium">
          <i class="fa-solid fa-arrows-rotate text-[#ffd479] mr-1.5"></i> Sincronizar con Colecciones
        </button>
      </div>
    </div>
  `;

  setupPasswordToggles();

  // Eventos de la sección AIOMetadata
  const btnLoad = document.getElementById('btnLoadAioByUuid');
  const inputUuid = document.getElementById('inputAioUuid');
  const inputPass = document.getElementById('inputAioPassword');
  const btnCopy = document.getElementById('btnCopyAioManifest');
  const btnSync = document.getElementById('btnSyncAioWithCollections');

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
      accountState.posterEngine = 'default';
      accountState.customPosterUrl = '';
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

  // Sincronizar catálogos con colecciones activas del perfil
  if (btnSync) {
    btnSync.addEventListener('click', () => {
      if (!accountState.aioConfig) {
        showToast('Primero carga la configuración del addon AIOMetadata.', 'warning');
        return;
      }

      const activeCatalogIds = new Set();
      (accountState.collections || []).forEach(sec => {
        if (sec.enabled === false) return;
        (sec.folders || []).forEach(f => {
          if (f.enabled === false) return;
          (f.catalogSources || f.sources || []).forEach(s => {
            if (s && s.catalogId) activeCatalogIds.add(s.catalogId);
          });
          if (f.id) activeCatalogIds.add(f.id);
        });
      });

      const cfg = accountState.aioConfig.config || accountState.aioConfig;
      const currentCatalogs = cfg.catalogs || [];
      let matchedCount = 0;

      currentCatalogs.forEach(cat => {
        const isAct = activeCatalogIds.has(cat.id);
        cat.showInHome = false;
        cat.enableRatingPosters = (accountState.posterEngine !== 'default');
        if (isAct) matchedCount++;
      });

      markDirty('aiometadata', true);
      renderAioSection();
      showToast(`✓ Catálogos alineados con ${matchedCount} filas activas de tus colecciones. Pulsa "Guardar Cambios".`, 'success');
    });
  }
}

export function renderSettingsSection() {
  const container = document.getElementById('accountSettingsContainer');
  if (!container) return;

  const isBadgesActive = Boolean(accountState.settings.badgesEnabled);
  const selectedPackId = accountState.settings.selectedBadgePack || 'tinted';

  container.innerHTML = `
    <div class="space-y-6">
      <!-- 1. Credenciales y Enriquecimiento de Nuvio -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-white flex items-center gap-2">
              <i class="fa-solid fa-film text-amber-300"></i> TMDB API Key & Enriquecimiento
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
            <p class="text-[11px] text-white/40 mt-1">
              Utilizada por Nuvio para sinopsis, actores y pósters oficiales en español latino.
            </p>
          </div>
        </div>

        <div class="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-white flex items-center gap-2">
              <i class="fa-solid fa-star text-amber-400"></i> MDBList API Key & Calificaciones
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
            <p class="text-[11px] text-white/40 mt-1">
              Proporciona calificaciones agregadas (IMDb, Rotten Tomatoes, Trakt) en las carátulas de Nuvio.
            </p>
          </div>
        </div>
      </div>

      <!-- 2. Fusion Badges de Nuvio (Stream Badges) -->
      <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 class="text-sm font-semibold text-white flex items-center gap-2">
              <i class="fa-solid fa-layer-group text-indigo-400"></i>
              <span>Fusion Badges de Nuvio (Stream Badges)</span>
            </h4>
            <p class="text-xs text-white/60 mt-0.5">
              Inyecta insignias híbridas personalizadas en el reproductor de Nuvio (resolución, audio, códec y subtítulos).
            </p>
          </div>
          <label class="lat-switch" title="Activar/desactivar Fusion Badges en Nuvio">
            <input type="checkbox" id="chkBadgesEnabled" ${isBadgesActive ? 'checked' : ''}>
            <span class="lat-switch-track"><span class="lat-switch-thumb"></span></span>
          </label>
        </div>

        <!-- Selector de Packs de Badges -->
        <div id="badgesPackSelectorContainer" class="${isBadgesActive ? '' : 'hidden'} pt-2 space-y-3">
          <label class="text-xs text-white/70 block font-medium">Paquete de Diseño de Badges</label>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            ${BADGE_PACKS.map(pack => {
              const isSelected = pack.id === selectedPackId;
              const resSection = (pack.sections || []).find(s => s.id === 'gr');
              const previewBadges = (resSection?.items || []).slice(0, 3);
              return `
                <div class="badge-pack-card p-3.5 rounded-xl border-2 ${isSelected ? 'border-indigo-400 bg-indigo-500/[0.08] shadow-md' : 'border-white/10 bg-white/[0.02] hover:border-white/20'} cursor-pointer transition-all flex flex-col justify-between gap-3 group" data-pack-id="${pack.id}">
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-semibold text-white truncate">${pack.name}</span>
                      <div class="w-4 h-4 rounded-full border-2 ${isSelected ? 'border-indigo-400 bg-indigo-400 text-black' : 'border-white/20 text-transparent'} flex items-center justify-center text-[9px] shrink-0">
                        <i class="fa-solid fa-check"></i>
                      </div>
                    </div>
                    <p class="text-[10px] text-white/50 line-clamp-2 leading-relaxed">${pack.description}</p>
                  </div>
                  <div class="pt-2 border-t border-white/[0.06] flex items-center gap-1.5 overflow-x-hidden">
                    ${previewBadges.map(item => `
                      <img src="${item.img}" alt="${item.name}" class="h-4 w-auto object-contain shrink-0" onerror="this.style.display='none'">
                    `).join('')}
                  </div>
                </div>
              `;
            }).join('')}
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
  const chkBadges = document.getElementById('chkBadgesEnabled');

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

  if (chkBadges) {
    chkBadges.addEventListener('change', () => {
      accountState.settings.badgesEnabled = chkBadges.checked;
      markDirty('settings', true);
      renderSettingsSection();
    });
  }

  container.querySelectorAll('.badge-pack-card').forEach(cardEl => {
    cardEl.addEventListener('click', () => {
      const pId = cardEl.dataset.packId;
      if (pId) {
        accountState.settings.selectedBadgePack = pId;
        markDirty('settings', true);
        renderSettingsSection();
      }
    });
  });
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

    // 1. Guardar Colecciones de Nuvio si cambiaron
    if (accountState.dirty.collections) {
      const synchronizedCollections = (accountState.collections || [])
        .filter(sec => sec.enabled !== false && (sec.folders || []).some(f => f.enabled !== false))
        .map(sec => ({
          ...sec,
          pinToTop: sec.pinToTop !== undefined ? sec.pinToTop : true,
          folders: (sec.folders || []).filter(f => f.enabled !== false)
        }));

      await NuvioClient.pushCollections({
        apiUrl: CONFIG.NUVIO_API_URL,
        apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
        accessToken: accountState.session.accessToken,
        profileId: profId,
        collectionsJson: synchronizedCollections
      });

      accountState.dirty.collections = false;
    }

    // 2. Guardar Ajustes de Nuvio, Credenciales & Fusion Badges
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

      if (accountState.settings.badgesEnabled) {
        const selectedPack = getBadgePackById(accountState.settings.selectedBadgePack) || BADGE_PACKS[0];
        const activeIds = ['gr', 'gq', 'gv', 'ga', 'gc', 'ge', 'glang', 'gsub', 'gst', 'gs', 'gms'];
        const orderIds = ['gr', 'gq', 'gv', 'ga', 'gc', 'ge', 'glang', 'gsub', 'gst', 'gs', 'gms'];
        let compiled = { groups: [], filters: [] };
        try {
          compiled = await compileUniversalBadgeRules(selectedPack, activeIds, orderIds);
        } catch (compileErr) {
          console.warn('[AccountManager] Error compilando badges:', compileErr);
        }

        const badgeRulesJson = {
          imports: [
            {
              sourceUrl: 'custom://nuvio-badges-latino',
              filters: compiled.filters,
              groups: compiled.groups,
              isActive: true
            }
          ]
        };

        profileSettingsPayload.stream_badge_settings = {
          stream_badge_rules: { type: 'string', value: JSON.stringify(badgeRulesJson) },
          show_file_size_badges: { type: 'boolean', value: true },
          stream_badge_placement: { type: 'string', value: 'BOTTOM' },
          show_addon_logo: { type: 'boolean', value: false }
        };
      } else {
        profileSettingsPayload.stream_badge_settings = {
          stream_badge_rules: { type: 'string', value: '' },
          stream_badge_placement: { type: 'string', value: 'BOTTOM' },
          show_file_size_badges: { type: 'boolean', value: false },
          show_addon_logo: { type: 'boolean', value: false }
        };
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
  } else if (sectionId === 'collections') {
    renderMiniNuvio();
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

  // Inicializar toggles de contraseña, scroll de pestañas, popover y modales de perfil
  setupPasswordToggles();
  setupScrollableTabs();
  setupProfilePopover();
  setupProfileModals();

  // Suscribirse a cambios en colecciones para marcar dirty (solo cuando el usuario realiza cambios interactivos)
  state.subscribe((s, eventType) => {
    if (eventType === 'COLLECTIONS_UPDATED' && !isInternalUpdating) {
      markDirty('collections', true);
    }
  });

  // 1. Revisar si hay sesión activa en sessionStorage
  const session = loadSession();
  if (session?.accessToken) {
    if (authView) authView.classList.add('hidden');
    if (dashboardView) dashboardView.classList.remove('hidden');

    try {
      // Cargar plantillas en segundo plano sin bloquear la lectura del perfil real
      state.loadTemplates().catch(() => null);
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

  // 2. Formulario de inicio de sesión
  if (authForm) {
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

        // Cargar plantillas en segundo plano sin bloquear la lectura del perfil real
        state.loadTemplates().catch(() => null);
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

  // 3. Botón de cerrar sesión
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      clearSession();
      if (dashboardView) dashboardView.classList.add('hidden');
      if (authView) authView.classList.remove('hidden');
      showToast('Sesión cerrada correctamente.', 'info');
    });
  }

  // 4. Botón de guardar cambios
  if (btnSave) {
    btnSave.addEventListener('click', saveAllChanges);
  }

  // 5. Navegación por tabs en la sub-barra horizontal
  document.querySelectorAll('.account-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      if (section) switchSection(section);
    });
  });
}

// Inicializar automáticamente cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAccountPage);
} else {
  initAccountPage();
}
