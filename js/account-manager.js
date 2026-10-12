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

// Clave segura para sesión bajo demanda en la pestaña actual
const SESSION_KEY = 'nuvio_account_session_v1';

// Estado reactivo local del gestor de cuenta
export const accountState = {
  session: null, // { accessToken, userId, email }
  profiles: [],
  selectedProfileId: null,
  activeSection: 'profiles', // 'profiles' | 'collections' | 'aiometadata' | 'settings'

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
    settings: false
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
  const profile = accountState.profiles.find(p => Number(p.profile_index ?? p.id) === accountState.selectedProfileId);

  // Actualizar UI del perfil activo en la barra lateral
  const activeAvatar = document.getElementById('sidebarActiveAvatar');
  const activeName = document.getElementById('sidebarActiveName');
  if (activeAvatar && profile) activeAvatar.src = profile.avatar_url;
  if (activeName && profile) activeName.textContent = profile.name;

  // Reset de estados dirty ante cambio de perfil
  accountState.dirty = { collections: false, aiometadata: false, settings: false };
  updateSaveButton();

  // Renderizar grid de perfiles
  renderProfilesGrid();

  // Cargar concurrentemente los datos del perfil seleccionado
  await Promise.all([
    loadProfileAddonsAndAio(),
    loadProfileCollections(),
    loadProfileSettings()
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
  const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.collections) ? raw.collections : []);
  if (list.length === 0) return [];

  // Formato 1: Árbol de secciones nativo (usado por Nuvio TV y el RPC sync_push_collections)
  if (list.some(item => Array.isArray(item.folders))) {
    return list.map((sec, sIdx) => ({
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
        coverImageUrl: f.coverImageUrl || '',
        titleLogoUrl: f.titleLogoUrl || '',
        sources: Array.isArray(f.sources) ? f.sources : [],
        catalogSources: Array.isArray(f.catalogSources) ? f.catalogSources : (Array.isArray(f.sources) ? f.sources : [])
      }))
    }));
  }

  // Formato 2: Lista plana de catálogos (/rest/v1/collections)
  return [{
    id: 'user-collections',
    title: 'Mis Colecciones de Nuvio',
    name: 'Mis Colecciones de Nuvio',
    icon: 'fa-solid fa-layer-group',
    pinToTop: true,
    enabled: true,
    folders: list.map((row, idx) => {
      const catId = row.catalog_id || row.id || `row-${idx + 1}`;
      const title = row.name || row.title || `Catálogo ${idx + 1}`;
      const type = row.catalog_type || row.type || 'movie';
      return {
        id: String(catId),
        title: title,
        name: title,
        type: type,
        enabled: row.enabled !== false,
        coverEmoji: '🎬',
        tileShape: 'LANDSCAPE',
        heroBackdropUrl: row.backdrop_url || '',
        coverImageUrl: row.cover_url || '',
        titleLogoUrl: '',
        sources: [{
          catalogId: catId,
          title: title,
          type: type,
          addonId: row.addon_id || 'aio-metadata'
        }],
        catalogSources: [{
          catalogId: catId,
          title: title,
          type: type,
          addonId: row.addon_id || 'aio-metadata'
        }]
      };
    })
  }];
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

async function loadProfileCollections() {
  const profId = accountState.selectedProfileId;
  if (!profId || !accountState.session) return;

  const emptyStateEl = document.getElementById('accountCollectionsEmptyState');
  const miniContainer = document.getElementById('miniNuvioContainer');

  try {
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
    } else {
      accountState.hasUserCollections = false;
      state.collections = [];
      accountState.collections = [];
      accountState.originalCollections = [];

      renderCollectionsEmptyState();
    }

    accountState.dirty.collections = false;
    updateSaveButton();
  } catch (err) {
    console.warn('[AccountManager] Error cargando colecciones reales del perfil:', err);
    renderCollectionsEmptyState();
  }
}

export function renderMiniNuvio() {
  const container = document.getElementById('miniNuvioContainer');
  if (!container) return;

  if (!window.miniNuvioInstance) {
    window.miniNuvioInstance = new MiniNuvio('miniNuvioContainer');
    window.miniNuvioInstance.init();
  } else {
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
  } catch (err) {
    console.warn('[AccountManager] Error cargando ajustes de perfil:', err);
  }
}

// ============================================================
// RENDERIZADO VISUAL DE SECCIONES
// ============================================================

export function renderProfilesGrid() {
  const container = document.getElementById('accountProfilesGrid');
  if (!container) return;

  container.innerHTML = accountState.profiles.map(p => {
    const id = Number(p.profile_index ?? p.id);
    const isSelected = id === Number(accountState.selectedProfileId);
    return `
      <div class="account-profile-box ${isSelected ? 'is-selected' : ''}" data-profile-id="${id}">
        <div class="flex items-center gap-3.5">
          <img src="${p.avatar_url}" alt="${p.name}" class="w-12 h-12 rounded-full border border-white/20 bg-black/40 object-cover shadow-sm">
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-semibold text-white truncate">${p.name}</h4>
            <span class="text-xs text-white/50 font-mono">Espacio #${p.profile_index || id}</span>
          </div>
          ${isSelected ? '<span class="text-xs px-2 py-0.5 rounded-full bg-[#ffd479]/20 text-[#ffd479] font-medium border border-[#ffd479]/30">Activo</span>' : ''}
        </div>
        <div class="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <button type="button" class="btn-select-profile text-white/70 hover:text-white transition-colors" data-id="${id}">
            ${isSelected ? '<i class="fa-solid fa-check text-emerald-400 mr-1"></i> Seleccionado' : 'Seleccionar'}
          </button>
          ${accountState.profiles.length > 1 ? `
            <button type="button" class="btn-delete-profile text-rose-400/70 hover:text-rose-400 transition-colors p-1" data-id="${id}" title="Eliminar Perfil">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Vincular eventos de selección y eliminación
  container.querySelectorAll('.account-profile-box').forEach(box => {
    box.addEventListener('click', (e) => {
      if (e.target.closest('.btn-delete-profile')) return;
      const id = box.dataset.profileId;
      if (id && Number(id) !== Number(accountState.selectedProfileId)) {
        selectProfile(id);
      }
    });
  });

  container.querySelectorAll('.btn-delete-profile').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (confirm(`¿Estás seguro de que deseas eliminar este perfil (#${id})? Esta acción borrará sus addons y colecciones en Nuvio.`)) {
        try {
          await NuvioClient.deleteProfile({
            apiUrl: CONFIG.NUVIO_API_URL,
            apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
            accessToken: accountState.session.accessToken,
            userId: accountState.session.userId,
            profileId: id
          });
          showToast('Perfil eliminado con éxito', 'success');
          await fetchProfiles();
          if (accountState.profiles.length > 0) {
            selectProfile(accountState.profiles[0].profile_index ?? accountState.profiles[0].id);
          }
        } catch (delErr) {
          showToast(`Error al eliminar perfil: ${delErr.message}`, 'error');
        }
      }
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

// ============================================================
// NAVEGACIÓN DE SECCIONES EN LA SIDEBAR
// ============================================================

export function switchSection(sectionId) {
  accountState.activeSection = sectionId;

  // Actualizar botones de la sidebar
  document.querySelectorAll('.account-nav-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.section === sectionId);
  });

  // Mostrar panel correspondiente
  document.querySelectorAll('.account-section-pane').forEach(pane => {
    pane.classList.toggle('is-active', pane.id === `sectionPane-${sectionId}`);
  });

  if (sectionId === 'collections') {
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

  // Inicializar toggles de contraseña en el DOM estático
  setupPasswordToggles();

  // Suscribirse a cambios en colecciones para marcar dirty
  state.subscribe((s, eventType) => {
    if (eventType === 'COLLECTIONS_UPDATED') {
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
      if (accountState.profiles.length > 0) {
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
        if (accountState.profiles.length > 0) {
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

  // 5. Navegación por tabs en la sidebar
  document.querySelectorAll('.account-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      if (section) switchSection(section);
    });
  });

  // 6. Botón de crear perfil
  const btnCreateProfile = document.getElementById('btnCreateProfile');
  if (btnCreateProfile) {
    btnCreateProfile.addEventListener('click', async () => {
      const name = prompt('Nombre del nuevo perfil en Nuvio:');
      if (name && name.trim()) {
        try {
          await NuvioClient.createProfile({
            apiUrl: CONFIG.NUVIO_API_URL,
            apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
            accessToken: accountState.session.accessToken,
            userId: accountState.session.userId,
            name: name.trim()
          });
          showToast('Perfil creado con éxito.', 'success');
          await fetchProfiles();
          renderProfilesGrid();
        } catch (err) {
          showToast(`Error creando perfil: ${err.message}`, 'error');
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
