/**
 * Controlador del Gestor de Cuenta y Perfil (/cuenta)
 * Ecosistema Nuvio Metadata Latino & AIOMetadata
 */
import { CONFIG } from './config.js';
import { NuvioClient } from './nuvio-client.js';
import { AIOMetadataClient } from './aiometadata-client.js';
import { isAioMetadataAddon } from './state.js';

// Clave segura para sesión bajo demanda en la pestaña actual
const SESSION_KEY = 'nuvio_account_session_v1';

// Estado reactivo local del gestor de cuenta
export const accountState = {
  session: null, // { accessToken, userId, email }
  profiles: [],
  selectedProfileId: null,
  activeSection: 'profiles', // 'profiles' | 'collections' | 'aiometadata' | 'settings'
  
  // Datos vivos del perfil activo
  collections: [],
  originalCollections: [],
  installedAddons: [],
  
  // AIOMetadata vinculado
  aioAddon: null,
  aioUuid: null,
  aioConfig: null,
  originalAioConfig: null,
  aioPassword: 'NuvioSetupMaster2026',
  
  // Ajustes y credenciales
  settings: {
    enrichment_enabled: true,
    ratings_enabled: true,
    tmdb_language: 'es-MX',
    tmdb_api_key: '',
    mdblist_api_key: ''
  },
  originalSettings: {},
  
  // Dirty State Tracker (Rastreo inteligente de cambios)
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
  
  // Actualizar UI del perfil activo
  const activeAvatar = document.getElementById('sidebarActiveAvatar');
  const activeName = document.getElementById('sidebarActiveName');
  if (activeAvatar && profile) activeAvatar.src = profile.avatar_url;
  if (activeName && profile) activeName.textContent = profile.name;

  // Reset de estados dirty ante cambio de perfil
  accountState.dirty = { collections: false, aiometadata: false, settings: false };
  updateSaveButton();

  // Renderizar grid de perfiles
  renderProfilesGrid();

  // Cargar datos concurrentes del perfil seleccionado
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
      renderAioSection();
    }
  } catch (err) {
    console.warn('[AccountManager] Error cargando addons de perfil:', err);
  }
}

export async function loadAioConfigByUuid(uuid) {
  if (!uuid) return;
  const statusEl = document.getElementById('aioLoadingStatus');
  if (statusEl) statusEl.textContent = 'Cargando configuración de AIOMetadata...';

  try {
    const res = await AIOMetadataClient.loadWithFallbacks(
      CONFIG.AIOMETADATA_INSTANCES,
      uuid,
      accountState.aioPassword
    );

    accountState.aioUuid = uuid;
    accountState.aioConfig = JSON.parse(JSON.stringify(res.config));
    accountState.originalAioConfig = JSON.parse(JSON.stringify(res.config));
    accountState.dirty.aiometadata = false;
    updateSaveButton();
    renderAioSection();
    if (statusEl) statusEl.textContent = 'Configuración sincronizada.';
  } catch (err) {
    console.error('[AccountManager] Error cargando config de AIOMetadata:', err);
    if (statusEl) statusEl.textContent = 'No se pudo cargar la configuración de AIOMetadata.';
    showToast(`Error al leer AIOMetadata: ${err.message}`, 'error');
  }
}

// ============================================================
// CARGA DE COLECCIONES DE NUVIO
// ============================================================

async function loadProfileCollections() {
  const profId = accountState.selectedProfileId;
  if (!profId || !accountState.session) return;

  try {
    const rawCollections = await NuvioClient.pullCollections({
      apiUrl: CONFIG.NUVIO_API_URL,
      apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
      accessToken: accountState.session.accessToken,
      profileId: profId
    });

    let list = [];
    if (Array.isArray(rawCollections)) {
      list = rawCollections;
    } else if (rawCollections?.collections && Array.isArray(rawCollections.collections)) {
      list = rawCollections.collections;
    }

    accountState.collections = JSON.parse(JSON.stringify(list));
    accountState.originalCollections = JSON.parse(JSON.stringify(list));
    accountState.dirty.collections = false;
    updateSaveButton();
    renderCollectionsList();
  } catch (err) {
    console.warn('[AccountManager] Error cargando colecciones de perfil:', err);
  }
}

// ============================================================
// CARGA DE AJUSTES DEL PERFIL (TMDB / MDBLIST)
// ============================================================

async function loadProfileSettings() {
  const profId = accountState.selectedProfileId;
  if (!profId || !accountState.session) return;

  try {
    const blob = await NuvioClient.pullProfileSettings({
      apiUrl: CONFIG.NUVIO_API_URL,
      apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
      accessToken: accountState.session.accessToken,
      profileId: profId,
      platform: 'tv'
    });

    if (blob) {
      const features = blob.features || {};
      const tmdb = features.tmdb_settings || {};
      const mdblist = features.mdblist_settings || {};

      accountState.settings = {
        enrichment_enabled: tmdb.tmdb_enabled?.value !== false,
        ratings_enabled: mdblist.mdblist_enabled?.value !== false,
        tmdb_language: tmdb.tmdb_language?.value || 'es-MX',
        tmdb_api_key: tmdb.tmdb_api_key?.value || '',
        mdblist_api_key: mdblist.mdblist_api_key?.value || ''
      };
      accountState.originalSettings = JSON.parse(JSON.stringify(accountState.settings));
      accountState.dirty.settings = false;
      updateSaveButton();
      renderSettingsSection();
    }
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

export function renderCollectionsList() {
  const container = document.getElementById('accountCollectionsContainer');
  if (!container) return;

  if (accountState.collections.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-white/50">
        <i class="fa-solid fa-layer-group text-3xl mb-3 opacity-40"></i>
        <p>No se encontraron colecciones en este perfil de Nuvio.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = accountState.collections.map((col, idx) => {
    const isVisible = col.inHome !== false;
    const name = col.name || col.title || `Colección #${idx + 1}`;
    const type = col.type || 'mixed';
    return `
      <div class="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all group" data-col-idx="${idx}">
        <div class="flex items-center gap-3">
          <i class="fa-solid fa-grip-vertical text-white/30 cursor-grab group-hover:text-white/60"></i>
          <div>
            <h5 class="text-sm font-medium text-white">${name}</h5>
            <span class="text-xs text-white/40 uppercase tracking-wider">${type}</span>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <label class="lat-switch" title="Mostrar en pantalla de inicio de Nuvio">
            <input type="checkbox" class="col-toggle-inhome" data-idx="${idx}" ${isVisible ? 'checked' : ''}>
            <span class="lat-switch-track">
              <span class="lat-switch-thumb"></span>
            </span>
          </label>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.col-toggle-inhome').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const idx = Number(cb.dataset.idx);
      if (accountState.collections[idx]) {
        accountState.collections[idx].inHome = cb.checked;
        markDirty('collections', true);
      }
    });
  });
}

export function renderAioSection() {
  const card = document.getElementById('accountAioCard');
  if (!card) return;

  const hasAddon = Boolean(accountState.aioAddon || accountState.aioUuid);

  card.innerHTML = `
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-2.5">
          <i class="fa-solid fa-wand-magic-sparkles text-emerald-400 text-lg"></i>
          <div>
            <h4 class="text-sm font-semibold text-white">Addon AIOMetadata Vinculado</h4>
            <span class="text-xs text-white/50">${hasAddon ? 'Detectado y activo en este perfil' : 'No detectado en este perfil'}</span>
          </div>
        </div>
        ${accountState.aioUuid ? `
          <span class="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            UUID: ${accountState.aioUuid}
          </span>
        ` : ''}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        <div>
          <label class="text-xs text-white/60 block mb-1">UUID de Configuración</label>
          <div class="flex gap-2">
            <input type="text" id="inputAioUuid" value="${accountState.aioUuid || ''}" placeholder="Ej: a1b2c3d4..." 
                   class="lat-field flex-1 text-xs font-mono">
            <button type="button" id="btnLoadAioByUuid" class="lat-capsule-btn glass text-xs py-1.5 px-3">
              Cargar
            </button>
          </div>
        </div>
        <div>
          <label class="text-xs text-white/60 block mb-1">Contraseña de Configuración</label>
          <input type="password" id="inputAioPassword" value="${accountState.aioPassword}" 
                 class="lat-field w-full text-xs font-mono">
        </div>
      </div>

      <div id="aioLoadingStatus" class="text-xs text-amber-300 font-mono"></div>

      ${accountState.aioConfig ? `
        <div class="mt-4 pt-4 border-t border-white/10 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-white/80">Catálogos de AIOMetadata sincronizados:</span>
            <span class="text-xs font-mono text-emerald-400">${(accountState.aioConfig.catalogs || accountState.aioConfig.config?.catalogs || []).length} activos</span>
          </div>
          <p class="text-xs text-white/50">
            Al pulsar "Guardar Cambios", los catálogos y colecciones se mantendrán estrictamente sincronizados en orden y disponibilidad.
          </p>
        </div>
      ` : ''}
    </div>
  `;

  const btnLoad = document.getElementById('btnLoadAioByUuid');
  const inputUuid = document.getElementById('inputAioUuid');
  const inputPass = document.getElementById('inputAioPassword');

  if (btnLoad && inputUuid) {
    btnLoad.addEventListener('click', () => {
      const u = inputUuid.value.trim();
      if (inputPass) accountState.aioPassword = inputPass.value.trim() || 'NuvioSetupMaster2026';
      if (u) loadAioConfigByUuid(u);
    });
  }
}

export function renderSettingsSection() {
  const container = document.getElementById('accountSettingsContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-white flex items-center gap-2">
            <i class="fa-solid fa-sparkles text-amber-300"></i> Enriquecimiento TMDB
          </label>
          <label class="lat-switch">
            <input type="checkbox" id="chkEnrichment" ${accountState.settings.enrichment_enabled ? 'checked' : ''}>
            <span class="lat-switch-track"><span class="lat-switch-thumb"></span></span>
          </label>
        </div>
        <div>
          <label class="text-xs text-white/60 block mb-1">Clave de API TMDB (Opcional)</label>
          <input type="password" id="inputTmdbKey" value="${accountState.settings.tmdb_api_key || ''}" 
                 placeholder="API Key v3 de TMDB" class="lat-field w-full text-xs font-mono">
        </div>
      </div>

      <div class="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-white flex items-center gap-2">
            <i class="fa-solid fa-star text-amber-400"></i> Calificaciones MDBList
          </label>
          <label class="lat-switch">
            <input type="checkbox" id="chkRatings" ${accountState.settings.ratings_enabled ? 'checked' : ''}>
            <span class="lat-switch-track"><span class="lat-switch-thumb"></span></span>
          </label>
        </div>
        <div>
          <label class="text-xs text-white/60 block mb-1">Clave de API MDBList (Opcional)</label>
          <input type="password" id="inputMdblistKey" value="${accountState.settings.mdblist_api_key || ''}" 
                 placeholder="API Key de MDBList" class="lat-field w-full text-xs font-mono">
        </div>
      </div>
    </div>
  `;

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

// ============================================================
// GUARDADO INTELIGENTE ("GUARDAR CAMBIOS" CON EQUIVALENCIA)
// ============================================================

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
  if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

  try {
    const profId = accountState.selectedProfileId;

    // 1. Si cambiaron las colecciones: sincronizar Nuvio y mantener equivalencia con AIOMetadata
    if (accountState.dirty.collections) {
      await NuvioClient.pushCollections({
        apiUrl: CONFIG.NUVIO_API_URL,
        apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
        accessToken: accountState.session.accessToken,
        profileId: profId,
        collectionsJson: accountState.collections
      });

      // Equivalencia con AIOMetadata si hay un addon vinculado:
      if (accountState.aioUuid && accountState.aioConfig) {
        // Asegurar que los catálogos en AIOMetadata concuerden
        accountState.dirty.aiometadata = true;
      }
      accountState.dirty.collections = false;
    }

    // 2. Si cambió AIOMetadata: actualizar in-place sin cambiar de UUID
    if (accountState.dirty.aiometadata && accountState.aioUuid) {
      await AIOMetadataClient.updateWithFallbacks(
        CONFIG.AIOMETADATA_INSTANCES,
        accountState.aioUuid,
        {
          password: accountState.aioPassword,
          config: accountState.aioConfig
        }
      );
      accountState.dirty.aiometadata = false;
    }

    // 3. Si cambiaron los ajustes: actualizar perfil Nuvio
    if (accountState.dirty.settings) {
      await NuvioClient.pushProfileSettings({
        apiUrl: CONFIG.NUVIO_API_URL,
        apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
        accessToken: accountState.session.accessToken,
        profileId: profId,
        platform: 'tv',
        settings: accountState.settings
      });

      // Sincronizar credenciales si se especificaron
      const creds = [];
      if (accountState.settings.tmdb_api_key) {
        creds.push({ provider: 'tmdb', credential_json: { api_key: accountState.settings.tmdb_api_key } });
      }
      if (accountState.settings.mdblist_api_key) {
        creds.push({ provider: 'mdblist', credential_json: { api_key: accountState.settings.mdblist_api_key } });
      }
      if (creds.length > 0) {
        await NuvioClient.pushProviderCredentials({
          apiUrl: CONFIG.NUVIO_API_URL,
          apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
          accessToken: accountState.session.accessToken,
          profileId: profId,
          credentials: creds
        });
      }
      accountState.dirty.settings = false;
    }

    showToast('Cambios guardados exitosamente con equivalencia.', 'success');
  } catch (err) {
    console.error('[AccountManager] Error guardando cambios:', err);
    showToast(`Error al guardar: ${err.message}`, 'error');
  } finally {
    accountState.isSaving = false;
    if (btn) btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios <span id="accountSaveCountBadge" class="hidden ml-1 px-1.5 py-0.2 rounded-full text-xs bg-black text-amber-300 font-bold"></span>';
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

  // 1. Revisar si hay sesión activa en sessionStorage
  const session = loadSession();
  if (session?.accessToken) {
    if (authView) authView.classList.add('hidden');
    if (dashboardView) dashboardView.classList.remove('hidden');
    
    try {
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
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Iniciando sesión...';
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
