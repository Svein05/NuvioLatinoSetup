/**
 * Modder Assets Uploader & Catalog Manager - Nuvio Latino
 * Gestión integral para colaboradores:
 * 1. Subida por lote con conversión universal a WebP y commit atómico en GitHub.
 * 2. Exploración, previsualización, edición, reemplazo y borrado de assets existentes.
 */

import { CONFIG } from './config.js';
import { 
  loadAvatarsCatalog, 
  getCompiledAvatars,
  getStylesSummary, 
  getFranchisesSummary,
  filterAvatars,
  resolveAvatarCdnUrl,
  formatStyleName,
  formatFranchiseName,
  formatCharacterName
} from './avatars-data.js';

const MODDER_SESSION_KEY = 'nuvio_modder_session';

// Estado reactivo local del uploader y gestor
export const modderState = {
  token: null,
  email: null,
  activeTab: 'upload', // 'upload' | 'manage'
  
  // Estado del uploader por lote
  selectedStyle: '',
  selectedFranchise: '',
  isNewStyle: false,
  isNewFranchise: false,
  filesQueue: [],
  isConverting: false,
  isUploading: false,
  uploadProgress: '',

  // Estado del gestor de catálogo existente (Colecciones y Detalle)
  catalogFilters: {
    style: 'all',
    franchise: 'all',
    query: ''
  },
  activeCollection: null, // Obra activa { id, franchise, franchiseName, avatars: [], availableStyles: [] }
  detailActiveStyle: null, // null = todos los estilos; 'NetflixStyle' | 'IconsStyle' | 'MangaStyle'
  detailSearchQuery: '',  // Búsqueda interna dentro de la colección abierta
  selectedAvatarForEdit: null,
  editReplacementWebp: null // { blob, base64, previewUrl, size }
};

// Pila de Cambios Pendientes (Staging) y Sobreescrituras Locales (Undo Stack)
export const stagedState = {
  // Historial cronológico de cambios atómicos (cada elemento cuenta como 1 cambio para el modder):
  // - BATCH_UPLOAD: { type: 'BATCH_UPLOAD', id, style, franchise, files: [...] }
  // - UPDATE_AVATAR: { type: 'UPDATE_AVATAR', id, avatarId, avatar, oldFilename, newFilename, newCharacterName, newBase64, isReplacing, previousOverride }
  // - DELETE_AVATAR: { type: 'DELETE_AVATAR', id, avatarId, avatar, previousOverride }
  history: [],

  // Sobreescrituras activas para reflejar en el catálogo: avatarId -> { isDeleted, isModified, previewImgUrl, newCharacterName, newFilename, newBase64 }
  avatarOverrides: new Map()
};

// ============================================================
// CONVERSIÓN UNIVERSAL A WEBP (.png, .jpg, .svg, .webp -> .webp)
// ============================================================

/**
 * Convierte cualquier formato de imagen a .webp mediante HTML5 Canvas en el cliente
 * @param {File} file Archivo original
 * @param {number} quality Calidad WebP (0 a 1, por defecto 0.90)
 * @returns {Promise<{ blob: Blob, base64: string, webpSize: number, previewUrl: string }>}
 */
export async function convertToWebp(file, quality = 0.90) {
  return new Promise((resolve, reject) => {
    const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
    const img = new Image();
    let objectUrl = '';

    if (isSvg) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else {
      objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
    }

    img.onload = () => {
      try {
        const width = img.naturalWidth || 512;
        const height = img.naturalHeight || 512;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Fondo transparente limpio
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error(`No se pudo generar WebP para ${file.name}`));
            return;
          }

          const readerBlob = new FileReader();
          readerBlob.onloadend = () => {
            const dataUrl = readerBlob.result;
            const base64 = dataUrl.split(',')[1];
            resolve({
              blob,
              base64,
              webpSize: blob.size,
              previewUrl: URL.createObjectURL(blob)
            });
          };
          readerBlob.onerror = reject;
          readerBlob.readAsDataURL(blob);
        }, 'image/webp', quality);
      } catch (err) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error(`Error al decodificar la imagen: ${file.name}`));
    };
  });
}

export function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getStyleDisplayName(styleId) {
  if (styleId === 'NetflixStyle') return 'Netflix Style';
  if (styleId === 'IconsStyle') return 'Icons Style';
  if (styleId === 'MangaStyle') return 'Manga Style';
  return formatStyleName(styleId) || styleId;
}

// ============================================================
// GESTIÓN DE SESIÓN Y AUTENTICACIÓN
// ============================================================

export function getModderSession() {
  try {
    const raw = sessionStorage.getItem(MODDER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { token: parsed.token || null, email: parsed.email || '' };
  } catch (_) {
    return null;
  }
}

export function saveModderSession(token, email = '') {
  modderState.token = token;
  modderState.email = email;
  try {
    sessionStorage.setItem(MODDER_SESSION_KEY, JSON.stringify({ token, email, timestamp: Date.now() }));
  } catch (_) {}
}

export function clearModderSession() {
  modderState.token = null;
  modderState.email = null;
  try {
    sessionStorage.removeItem(MODDER_SESSION_KEY);
  } catch (_) {}
}

export async function verifyPassword(password, email = '') {
  const endpoint = `${CONFIG.WORKER_API_URL.replace(/\/+$/, '')}/api/verify-auth`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, email })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Credenciales de Modder no válidas.');
  }
  return await res.json();
}

// ============================================================
// SISTEMA DE NOTIFICACIONES TOAST & ACTUALIZACIÓN REACTIVA UI
// ============================================================

export function showModderToast(message, type = 'info') {
  let toastContainer = document.getElementById('modderToastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'modderToastContainer';
    toastContainer.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bgClass = type === 'success' 
    ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-300' 
    : type === 'error'
    ? 'bg-rose-950/95 border-rose-500/50 text-rose-300'
    : 'bg-zinc-900/95 border-white/20 text-white';

  toast.className = `p-3.5 rounded-xl border backdrop-blur-md shadow-2xl text-xs flex items-center gap-2.5 transition-all transform translate-y-4 opacity-0 pointer-events-auto ${bgClass}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check text-emerald-400' : type === 'error' ? 'fa-triangle-exclamation text-rose-400' : 'fa-info-circle text-amber-300'} text-sm shrink-0"></i>
    <span class="flex-1 font-medium">${message}</span>
  `;

  toastContainer.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-4', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

export function updateStagedUI() {
  const totalChanges = stagedState.history.length;
  const btnUndo = document.getElementById('btnUndoChange');
  const btnSave = document.getElementById('btnSaveAllChanges');
  const undoBadge = document.getElementById('undoCountBadge');
  const stagedBadge = document.getElementById('stagedCountBadge');
  const uploadStatusText = document.getElementById('uploadStatusText');

  // 1. Botón Deshacer
  if (btnUndo) {
    if (totalChanges === 0) {
      btnUndo.disabled = true;
      btnUndo.classList.add('opacity-40', 'cursor-not-allowed');
      btnUndo.classList.remove('opacity-100', 'cursor-pointer');
      if (undoBadge) undoBadge.classList.add('hidden');
      btnUndo.title = 'No hay cambios para deshacer';
    } else {
      btnUndo.disabled = false;
      btnUndo.classList.remove('opacity-40', 'cursor-not-allowed');
      btnUndo.classList.add('opacity-100', 'cursor-pointer');
      if (undoBadge) {
        undoBadge.textContent = String(totalChanges);
        undoBadge.classList.remove('hidden');
      }

      const last = stagedState.history[stagedState.history.length - 1];
      let desc = 'último cambio';
      if (last.type === 'BATCH_UPLOAD') desc = `lote (${last.files.length} avatares de ${last.franchise})`;
      else if (last.type === 'UPDATE_AVATAR') desc = `edición de "${last.avatar.character}"`;
      else if (last.type === 'DELETE_AVATAR') desc = `eliminación de "${last.avatar.character}"`;
      btnUndo.title = `Deshacer ${desc}`;
    }
  }

  // 2. Botón Guardar Cambios
  if (btnSave) {
    if (totalChanges === 0) {
      btnSave.disabled = true;
      btnSave.classList.add('opacity-40', 'cursor-not-allowed');
      btnSave.classList.remove('opacity-100', 'cursor-pointer', 'bg-emerald-400', 'text-black', 'hover:bg-emerald-300');
      if (stagedBadge) stagedBadge.classList.add('hidden');
      btnSave.title = 'No hay cambios pendientes por guardar';
    } else {
      btnSave.disabled = false;
      btnSave.classList.remove('opacity-40', 'cursor-not-allowed');
      btnSave.classList.add('opacity-100', 'cursor-pointer', 'bg-emerald-400', 'text-black', 'hover:bg-emerald-300');
      if (stagedBadge) {
        stagedBadge.textContent = String(totalChanges);
        stagedBadge.classList.remove('hidden');
      }
      btnSave.title = `Publicar todos los ${totalChanges} cambio(s) en 1 solo commit de GitHub`;
    }
  }

  // 3. Texto informativo
  if (uploadStatusText) {
    if (modderState.filesQueue.length > 0) {
      uploadStatusText.innerHTML = `<span class="text-white/80 font-medium">${modderState.filesQueue.length} imagen(es) lista(s).</span>`;
    } else if (totalChanges > 0) {
      uploadStatusText.innerHTML = `<span class="text-amber-300 font-medium"><i class="fa-solid fa-clock-rotate-left mr-1"></i> Tienes ${totalChanges} cambio(s) acumulado(s). Pulsa 'Guardar Cambios' arriba a la derecha.</span>`;
    } else {
      uploadStatusText.textContent = 'Añade este lote a la lista de cambios pendientes para guardarlo junto con tus otras ediciones.';
    }
  }
}

// ============================================================
// VISIBILIDAD CONDICIONAL DE PASOS EN SUBIDA
// ============================================================

export function updateStep2Visibility() {
  const step2 = document.getElementById('stepDropzoneCard');
  if (!step2) return;

  const styleSelected = Boolean(modderState.selectedStyle);
  let franchiseSelected = false;

  if (modderState.isNewFranchise) {
    const input = document.getElementById('inputNewFranchise');
    franchiseSelected = Boolean(input && input.value.trim().length > 0);
  } else {
    franchiseSelected = Boolean(modderState.selectedFranchise && modderState.selectedFranchise !== '__NEW__');
  }

  if (styleSelected && franchiseSelected) {
    step2.classList.remove('hidden');
  } else {
    step2.classList.add('hidden');
    if (modderState.filesQueue.length === 0) {
      document.getElementById('queueSection')?.classList.add('hidden');
    }
  }
}

// ============================================================
// POBLADO DE SELECTS Y FILTROS
// ============================================================

export async function populateSelects(forceRefresh = false) {
  await loadAvatarsCatalog(forceRefresh);
  const allStyles = getStylesSummary() || [];
  const styles = allStyles.filter(s => s.id !== 'all');
  const franchises = (getFranchisesSummary() || []).filter(f => f.id !== 'all');

  // 1. Selects del cargador por lote
  const styleSelect = document.getElementById('selectStyle');
  const franchiseSelect = document.getElementById('selectFranchise');

  if (styleSelect) {
    styleSelect.innerHTML = `
      <option value="">-- Selecciona un estilo --</option>
      ${styles.map(s => `<option value="${s.id}">${s.name} (${s.count} avatares)</option>`).join('')}
    `;
  }

  if (franchiseSelect) {
    franchiseSelect.innerHTML = `
      <option value="">-- Selecciona una franquicia / obra --</option>
      ${franchises.map(f => `<option value="${f.id}">${f.name} (${f.count} avatares)</option>`).join('')}
      <option value="__NEW__">➕ Crear nueva franquicia...</option>
    `;
  }

  // 2. Selects del explorador de catálogo existente
  const manageStyleSelect = document.getElementById('manageStyleSelect');
  const manageFranchiseSelect = document.getElementById('manageFranchiseSelect');

  if (manageStyleSelect) {
    manageStyleSelect.innerHTML = `
      <option value="all" ${modderState.catalogFilters.style === 'all' ? 'selected' : ''}>Todos los estilos (${getCompiledAvatars().length})</option>
      ${styles.map(s => `
        <option value="${s.id}" ${modderState.catalogFilters.style === s.id ? 'selected' : ''}>
          ${s.name} (${s.count})
        </option>
      `).join('')}
    `;
  }

  if (manageFranchiseSelect) {
    const franchisesFiltered = getFranchisesSummary(modderState.catalogFilters.style);
    manageFranchiseSelect.innerHTML = franchisesFiltered.map(f => `
      <option value="${f.id}" ${modderState.catalogFilters.franchise === f.id ? 'selected' : ''}>
        ${f.name} (${f.count})
      </option>
    `).join('');
  }

  const totalBadge = document.getElementById('manageTotalBadge');
  if (totalBadge) {
    const all = getCompiledAvatars();
    totalBadge.textContent = `${all.length}`;
  }

  updateStep2Visibility();
}

// ============================================================
// RENDERIZADO DE LA COLA DE SUBIDA POR LOTE
// ============================================================

export function renderQueue() {
  const container = document.getElementById('queueContainer');
  const queueSection = document.getElementById('queueSection');
  const countBadge = document.getElementById('queueCountBadge');
  const btnSubmit = document.getElementById('btnSubmitBatch');

  if (!container) return;

  if (modderState.filesQueue.length === 0) {
    if (queueSection) queueSection.classList.add('hidden');
    if (btnSubmit) btnSubmit.disabled = true;
    return;
  }

  if (queueSection) queueSection.classList.remove('hidden');
  if (btnSubmit) btnSubmit.disabled = false;
  if (countBadge) countBadge.textContent = `${modderState.filesQueue.length}`;

  const currentFranchise = getActiveFranchiseName();
  const currentStyle = getActiveStyleName();

  container.innerHTML = modderState.filesQueue.map((item, index) => {
    const savings = item.originalSize > 0 
      ? Math.round(((item.originalSize - item.webpSize) / item.originalSize) * 100) 
      : 0;
    const savingsBadge = savings > 0 
      ? `<span class="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">-${savings}%</span>`
      : `<span class="text-[10px] text-white/50 font-mono">WebP</span>`;

    const rawCharName = (item.characterName || (item.fileName ? item.fileName.replace(/\.webp$/i, '') : 'avatar')).trim().replace(/\.webp$/i, '');
    const finalFilename = `${rawCharName}.webp`;

    return `
      <div class="lat-card p-3 sm:p-4 flex flex-row items-start sm:items-center gap-3 sm:gap-4 relative group" data-queue-id="${item.id}">
        <div class="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
          <img src="${item.previewUrl}" alt="${finalFilename}" class="w-full h-full object-cover">
        </div>

        <div class="flex-1 min-w-0 text-left space-y-1.5">
          <div class="flex flex-wrap items-center justify-between gap-1">
            <span class="text-[11px] sm:text-xs text-white/50 truncate max-w-[130px] sm:max-w-[200px]" title="${item.originalName}">
              Original: ${item.originalName}
            </span>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="text-[10px] sm:text-[11px] font-mono text-white/60">
                ${formatBytes(item.originalSize)} ➔ <strong class="text-emerald-400">${formatBytes(item.webpSize)}</strong>
              </span>
              ${savingsBadge}
            </div>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <label class="text-[10px] sm:text-[11px] text-white/60 shrink-0 font-medium">Nombre:</label>
            <div class="flex items-center gap-1 flex-1 min-w-0">
              <input type="text" 
                     value="${rawCharName}" 
                     class="lat-field text-xs py-1 px-2 flex-1 min-w-0 font-mono input-character-name" 
                     data-index="${index}"
                     placeholder="ej: Asta_Demon">
              <span class="text-[10px] sm:text-xs font-mono text-white/40 shrink-0 px-2 py-1 bg-white/[0.05] border border-white/10 rounded-lg">.webp</span>
            </div>
          </div>

          <div class="text-[10px] font-mono text-white/40 truncate">
            Destino: <span class="text-amber-300/80 font-mono queue-destination-path" data-index="${index}">profile_icons/${currentStyle || 'Estilo'}/${currentFranchise || 'Obra'}/${finalFilename}</span>
          </div>
        </div>

        <button type="button" 
                class="btn-remove-item p-1.5 sm:p-2 text-white/40 hover:text-rose-400 transition-colors cursor-pointer shrink-0 self-center"
                data-index="${index}"
                title="Eliminar de la cola">
          <i class="fa-solid fa-trash-can text-sm"></i>
        </button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.input-character-name').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      if (modderState.filesQueue[idx]) {
        let val = e.target.value.trim().replace(/\.webp$/i, '');
        modderState.filesQueue[idx].characterName = val;
        let cleanFileName = val ? `${val}.webp` : 'avatar.webp';
        modderState.filesQueue[idx].fileName = cleanFileName;

        const destSpan = container.querySelector(`.queue-destination-path[data-index="${idx}"]`);
        if (destSpan) {
          destSpan.textContent = `profile_icons/${getActiveStyleName() || 'Estilo'}/${getActiveFranchiseName() || 'Obra'}/${cleanFileName}`;
        }
      }
    });
  });

  container.querySelectorAll('.btn-remove-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(btn.dataset.index, 10);
      modderState.filesQueue.splice(idx, 1);
      renderQueue();
    });
  });
}

function getActiveStyleName() {
  return modderState.selectedStyle;
}

function getActiveFranchiseName() {
  if (modderState.isNewFranchise) {
    const input = document.getElementById('inputNewFranchise');
    return input ? input.value.trim().replace(/[^a-zA-Z0-9_-]/g, '') : '';
  }
  return modderState.selectedFranchise;
}

export async function handleFiles(files) {
  if (!files || files.length === 0) return;

  const validFiles = Array.from(files).filter(f => {
    return /\.(jpe?g|png|webp|svg|bmp)$/i.test(f.name);
  });

  if (validFiles.length === 0) {
    alert('Por favor selecciona archivos de imagen válidos (.png, .jpg, .webp, .svg, etc.).');
    return;
  }

  for (const file of validFiles) {
    try {
      const converted = await convertToWebp(file, 0.90);
      const dotIdx = file.name.lastIndexOf('.');
      const rawBase = dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name;
      const cleanFileName = `${rawBase}.webp`;

      modderState.filesQueue.push({
        id: `f_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        originalFile: file,
        webpBlob: converted.blob,
        base64: converted.base64,
        originalSize: file.size,
        webpSize: converted.webpSize,
        previewUrl: converted.previewUrl,
        originalName: file.name,
        fileName: cleanFileName,
        characterName: rawBase
      });
    } catch (err) {
      console.error(`Error procesando ${file.name}:`, err);
    }
  }

  renderQueue();
  updateStagedUI();
}

export function stageBatchUpload() {
  const style = getActiveStyleName();
  const franchise = getActiveFranchiseName();

  if (!style) {
    alert('Por favor selecciona un Estilo de Avatar.');
    document.getElementById('selectStyle')?.focus();
    return;
  }

  if (!franchise) {
    alert('Por favor selecciona o define una Franquicia / Obra.');
    document.getElementById('selectFranchise')?.focus();
    return;
  }

  if (modderState.filesQueue.length === 0) {
    alert('No hay imágenes en la cola para añadir.');
    return;
  }

  const filesPayload = modderState.filesQueue.map(item => {
    let finalFilename = (item.fileName || item.characterName || 'avatar').trim();
    if (!finalFilename.toLowerCase().endsWith('.webp')) {
      finalFilename = `${finalFilename}.webp`;
    }
    return {
      filename: finalFilename,
      characterName: finalFilename.replace(/\.webp$/i, ''),
      base64: item.base64,
      previewUrl: item.previewUrl,
      webpSize: item.webpSize
    };
  });

  const action = {
    type: 'BATCH_UPLOAD',
    id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    style,
    franchise,
    files: filesPayload
  };

  stagedState.history.push(action);
  const count = filesPayload.length;
  modderState.filesQueue = [];
  renderQueue();
  updateStagedUI();

  showModderToast(`✓ Lote de ${count} avatar(es) añadido a cambios pendientes (Cambio #${stagedState.history.length}).`, 'success');
}

// ============================================================
// EXPLORADOR Y GESTIÓN DE CATÁLOGO (COLECCIONES Y AVATARES)
// ============================================================

export function getCollectionsSummary() {
  const allAvatars = getCompiledAvatars();
  const styleFilter = modderState.catalogFilters.style;
  const searchQuery = (modderState.catalogFilters.query || '').toLowerCase().trim();

  // 1. Filtrar por estilo general si se seleccionó en el selector superior
  let list = allAvatars;
  if (styleFilter && styleFilter !== 'all') {
    list = list.filter(a => a.style === styleFilter);
  }

  // 2. Agrupar estrictamente por Franquicia / Obra (una sola tarjeta por obra)
  const groupsMap = new Map();
  for (const av of list) {
    const key = av.franchise;
    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        id: key,
        franchise: av.franchise,
        franchiseName: av.franchiseName,
        avatars: [],
        stylesMap: new Map()
      });
    }
    const group = groupsMap.get(key);
    group.avatars.push(av);
    group.stylesMap.set(av.style, (group.stylesMap.get(av.style) || 0) + 1);
  }

  let collections = Array.from(groupsMap.values()).map(c => {
    const availableStyles = Array.from(c.stylesMap.entries()).map(([styleKey, count]) => {
      return {
        id: styleKey,
        name: getStyleDisplayName(styleKey),
        count
      };
    });

    // Orden canónico: NetflixStyle, IconsStyle, MangaStyle
    const canonicalOrder = ['NetflixStyle', 'IconsStyle', 'MangaStyle'];
    availableStyles.sort((a, b) => {
      const idxA = canonicalOrder.indexOf(a.id);
      const idxB = canonicalOrder.indexOf(b.id);
      return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
    });

    return {
      ...c,
      availableStyles
    };
  });

  // 3. Filtrar por búsqueda si hay texto
  if (searchQuery) {
    collections = collections.filter(c => 
      c.franchiseName.toLowerCase().includes(searchQuery) ||
      c.franchise.toLowerCase().includes(searchQuery) ||
      c.availableStyles.some(s => s.name.toLowerCase().includes(searchQuery)) ||
      c.avatars.some(a => {
        const ov = stagedState.avatarOverrides.get(a.id);
        const fn = ov?.newFilename || a.fileName;
        return fn.toLowerCase().includes(searchQuery) || (a.characterName && a.characterName.toLowerCase().includes(searchQuery));
      })
    );
  }

  // 4. Ordenar alfabéticamente por nombre de franquicia
  collections.sort((a, b) => a.franchiseName.localeCompare(b.franchiseName, 'es', { sensitivity: 'base' }));
  return collections;
}

export function openCollectionDetail(col) {
  modderState.activeCollection = col;
  modderState.detailSearchQuery = '';
  modderState.detailActiveStyle = null; // null = ningún filtro activo (muestra todos los estilos)
  const detailSearchInput = document.getElementById('detailSearchInput');
  if (detailSearchInput) detailSearchInput.value = '';

  const collectionsView = document.getElementById('collectionsViewContainer');
  const detailView = document.getElementById('collectionDetailContainer');
  if (collectionsView) collectionsView.classList.add('hidden');
  if (detailView) detailView.classList.remove('hidden');

  const titleEl = document.getElementById('detailCollectionTitle');
  if (titleEl) titleEl.textContent = col.franchiseName;

  renderStyleFilterButtons();
  renderCollectionAvatars();
}

export function closeCollectionDetail() {
  modderState.activeCollection = null;
  modderState.detailSearchQuery = '';
  modderState.detailActiveStyle = null;
  const collectionsView = document.getElementById('collectionsViewContainer');
  const detailView = document.getElementById('collectionDetailContainer');
  if (collectionsView) collectionsView.classList.remove('hidden');
  if (detailView) detailView.classList.add('hidden');
  renderCollectionsGrid();
}

export function renderStyleFilterButtons() {
  const container = document.getElementById('detailStyleFiltersContainer');
  if (!container) return;

  const col = modderState.activeCollection;
  if (!col) {
    container.innerHTML = '';
    return;
  }

  // Los 3 estilos canónicos: NetflixStyle, IconsStyle, MangaStyle
  const CANONICAL_STYLES = [
    { id: 'NetflixStyle', name: 'Netflix Style' },
    { id: 'IconsStyle', name: 'Icons Style' },
    { id: 'MangaStyle', name: 'Manga Style' }
  ];

  // Solo mostrar los estilos que realmente existen en esta obra
  const existingStyles = CANONICAL_STYLES.map(st => {
    const count = col.avatars.filter(a => a.style === st.id).length;
    return { ...st, count };
  }).filter(st => st.count > 0);

  if (existingStyles.length <= 1) {
    container.innerHTML = existingStyles.map(st => `
      <span class="text-xs font-mono px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-white/70">
        ${st.name} (${st.count} avatares)
      </span>
    `).join('');
    return;
  }

  // Renderizar botones seleccionables individualmente con toggle
  container.innerHTML = existingStyles.map(st => {
    const isActive = modderState.detailActiveStyle === st.id;
    const activeClasses = isActive
      ? "bg-amber-400 text-black border-amber-400 font-semibold shadow-md shadow-amber-400/20"
      : "bg-white/[0.05] hover:bg-white/[0.12] text-white/70 hover:text-white border-white/10";

    return `
      <button type="button" 
              class="px-3.5 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-all cursor-pointer ${activeClasses}"
              data-style-filter="${st.id}">
        <span>${st.name}</span>
        <span class="text-[10px] font-mono px-1.5 py-0.2 rounded-full ${isActive ? 'bg-black/20 text-black font-bold' : 'bg-white/10 text-white/70'}">
          ${st.count}
        </span>
      </button>
    `;
  }).join('');

  container.querySelectorAll('[data-style-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const styleId = btn.dataset.styleFilter;
      if (modderState.detailActiveStyle === styleId) {
        // Al volver a pickear, se deselecciona!
        modderState.detailActiveStyle = null;
      } else {
        // Se selecciona individualmente
        modderState.detailActiveStyle = styleId;
      }
      renderStyleFilterButtons();
      renderCollectionAvatars();
    });
  });
}

export function getCollectionPreviewLimit() {
  const grid = document.getElementById('collectionsGrid');
  const w = (typeof window !== 'undefined') ? (window.innerWidth || document.documentElement.clientWidth || 360) : 360;
  
  if (grid && grid.clientWidth > 0) {
    const isTwoCols = w >= 768; // md:grid-cols-2
    const cardWidth = isTwoCols ? (grid.clientWidth - 16) / 2 : grid.clientWidth;
    const innerWidth = cardWidth - 36; // margen/padding lateral interior
    const slotWidth = w < 640 ? 46 : 52; // ancho icono (40/44px) + gap (6/8px)
    const slots = Math.floor((innerWidth - 4) / slotWidth);
    return Math.max(3, Math.min(8, slots));
  }

  // Fallback seguro basado en breakpoints estándar
  if (w < 420) return 4;
  if (w < 520) return 5;
  if (w < 768) return 6;
  if (w < 1050) return 5;
  if (w < 1350) return 6;
  return 7;
}

export function renderCollectionsGrid() {
  const collectionsView = document.getElementById('collectionsViewContainer');
  const detailView = document.getElementById('collectionDetailContainer');
  const grid = document.getElementById('collectionsGrid');
  const countLabel = document.getElementById('catalogFilterCount');

  if (modderState.activeCollection) {
    renderCollectionAvatars();
    return;
  }

  if (collectionsView) collectionsView.classList.remove('hidden');
  if (detailView) detailView.classList.add('hidden');

  if (!grid) return;

  const collections = getCollectionsSummary();
  const totalAvatars = collections.reduce((acc, c) => acc + c.avatars.length, 0);

  if (countLabel) {
    countLabel.textContent = `${collections.length} colecciones (${totalAvatars} avatares)`;
  }

  if (collections.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center text-white/50 space-y-2">
        <i class="fa-solid fa-folder-open text-3xl text-white/20"></i>
        <p class="text-sm">No se encontraron colecciones con los filtros actuales.</p>
      </div>
    `;
    return;
  }

  const maxSlots = getCollectionPreviewLimit();

  grid.innerHTML = collections.map(col => {
    let previewAvatars = [];
    let extraCount = 0;

    if (col.avatars.length <= maxSlots) {
      previewAvatars = col.avatars;
      extraCount = 0;
    } else {
      // El último slot es la insignia que indica cuántos más avatares hay (+N)
      const avatarSlots = maxSlots - 1;
      previewAvatars = col.avatars.slice(0, avatarSlots);
      extraCount = col.avatars.length - avatarSlots;
    }

    // Verificar si algún avatar de esta colección tiene cambios pendientes
    const hasPendingChanges = col.avatars.some(a => {
      const ov = stagedState.avatarOverrides.get(a.id);
      return ov?.isModified || ov?.isDeleted;
    });

    const pendingBadge = hasPendingChanges
      ? `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-black shadow"><i class="fa-solid fa-clock-rotate-left mr-1"></i>Cambios</span>`
      : '';

    return `
      <div class="lat-card p-4 sm:p-5 flex flex-col justify-between gap-3 sm:gap-4 group hover:border-amber-400/50 hover:bg-white/[0.04] transition-all cursor-pointer relative" data-collection-id="${col.id}">
        <!-- Cabecera de la Colección (Sin icono amarillo de carpeta) -->
        <div class="flex items-start justify-between gap-2">
          <div class="space-y-1.5 text-left w-full min-w-0">
            <h4 class="text-base sm:text-lg font-bold text-white group-hover:text-amber-300 transition-colors truncate">
              ${col.franchiseName}
            </h4>
            <div class="flex items-center gap-1.5 flex-wrap">
              ${col.availableStyles.map(st => `
                <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/70 border border-white/10">
                  ${st.name} <strong class="text-white/90">(${st.count})</strong>
                </span>
              `).join('')}
              <span class="text-xs text-white/40 font-mono ml-auto">
                <strong class="text-white/90">${col.avatars.length}</strong> total
              </span>
            </div>
          </div>
          ${pendingBadge}
        </div>

        <!-- Previsualización de Miniaturas (ESTRICTAMENTE 1 FILA, nunca wrap) -->
        <div class="flex items-center gap-1.5 sm:gap-2 flex-nowrap overflow-hidden py-1 w-full">
          ${previewAvatars.map(av => {
            const ov = stagedState.avatarOverrides.get(av.id);
            const imgUrl = ov?.previewImgUrl || resolveAvatarCdnUrl(av.path);
            const isDel = ov?.isDeleted;
            return `
              <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-white/5 border ${isDel ? 'border-rose-500/60 opacity-40' : 'border-white/10'} shrink-0 relative group-hover:scale-105 transition-transform">
                <img src="${imgUrl}" alt="${av.fileName}" class="w-full h-full object-cover" loading="lazy">
              </div>
            `;
          }).join('')}
          ${extraCount > 0 ? `
            <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[11px] sm:text-xs font-mono text-white/70 shrink-0 font-bold hover:border-amber-400/40 hover:text-white transition-colors" title="${extraCount} avatares adicionales">
              +${extraCount}
            </div>
          ` : ''}
        </div>

        <!-- Pie de tarjeta: Botón ingresar alineado a la derecha sin texto redundante -->
        <div class="pt-2 border-t border-white/5 flex items-center justify-end text-xs text-white/60 group-hover:text-white">
          <span class="text-amber-300 font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Ingresar</span>
            <i class="fa-solid fa-arrow-right text-[10px]"></i>
          </span>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('[data-collection-id]').forEach(card => {
    card.addEventListener('click', () => {
      const colId = card.dataset.collectionId;
      const col = collections.find(c => c.id === colId);
      if (col) {
        openCollectionDetail(col);
      }
    });
  });
}

export function renderCollectionAvatars() {
  const col = modderState.activeCollection;
  if (!col) return;

  const grid = document.getElementById('catalogGrid');
  if (!grid) return;

  const query = (modderState.detailSearchQuery || '').toLowerCase().trim();
  
  // 1. Filtrar por estilo activo si hay uno seleccionado (si es null, muestra todos)
  let avatars = col.avatars;
  if (modderState.detailActiveStyle) {
    avatars = avatars.filter(a => a.style === modderState.detailActiveStyle);
  }

  // 2. Filtrar por búsqueda de texto interna
  if (query) {
    avatars = avatars.filter(a => {
      const ov = stagedState.avatarOverrides.get(a.id);
      const name = ov?.newFilename || a.fileName;
      return name.toLowerCase().includes(query) || (a.characterName && a.characterName.toLowerCase().includes(query));
    });
  }

  const countEl = document.getElementById('detailCollectionCount');
  if (countEl) {
    const styleInfo = modderState.detailActiveStyle 
      ? `en ${getStyleDisplayName(modderState.detailActiveStyle)}` 
      : 'en todos los estilos';
    countEl.textContent = query 
      ? `${avatars.length} de ${col.avatars.length} avatares encontrados`
      : `${avatars.length} avatares disponibles (${styleInfo})`;
  }

  if (avatars.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center text-white/50 space-y-2">
        <i class="fa-solid fa-file-image text-3xl text-white/20"></i>
        <p class="text-sm">No hay avatares que coincidan con la búsqueda en esta colección.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = avatars.map(av => {
    const override = stagedState.avatarOverrides.get(av.id);
    const isDeleted = override?.isDeleted;
    const isModified = override?.isModified;

    // EL NOMBRE MOSTRADO ES EL NOMBRE REAL DEL ARCHIVO DIRECTAMENTE
    const displayFilename = override?.newFilename || av.fileName;
    const displayImg = override?.previewImgUrl || resolveAvatarCdnUrl(av.path);
    const ext = av.extension ? `.${av.extension.toLowerCase()}` : '.webp';

    let cardClasses = "lat-card p-3 flex flex-col items-center text-center gap-2 group transition-all cursor-pointer relative";
    let badgeHtml = '';

    if (isDeleted) {
      cardClasses += " opacity-40 border-rose-500/60 bg-rose-950/20";
      badgeHtml = `<span class="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-600 text-white shadow"><i class="fa-solid fa-trash-can mr-1"></i>A eliminar</span>`;
    } else if (isModified) {
      cardClasses += " border-amber-400/70 bg-amber-950/10 shadow-lg shadow-amber-500/10";
      badgeHtml = `<span class="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-black shadow"><i class="fa-solid fa-pen-ruler mr-1"></i>Modificado</span>`;
    } else {
      cardClasses += " hover:border-amber-400/40";
    }

    return `
      <div class="${cardClasses}" data-avatar-id="${av.id}">
        ${badgeHtml}
        
        <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/5 border border-white/10 overflow-hidden relative flex items-center justify-center group-hover:scale-105 transition-transform">
          <img src="${displayImg}" alt="${displayFilename}" class="w-full h-full object-cover" loading="lazy">
        </div>

        <div class="w-full space-y-0.5">
          <h4 class="text-xs font-mono font-medium text-white truncate max-w-full" title="${displayFilename}">${displayFilename}</h4>
          <span class="inline-block text-[9px] text-amber-300/80 bg-amber-400/10 px-1.5 py-0.5 rounded font-mono truncate max-w-full">
            ${av.styleName}
          </span>
        </div>

        <button type="button" class="mt-1 w-full py-1.5 text-[11px] rounded-xl sm:rounded-2xl ${isDeleted ? 'bg-rose-500/20 text-rose-300' : 'bg-white/5 hover:bg-amber-400 hover:text-black text-white/70'} font-medium transition-colors flex items-center justify-center gap-1.5">
          <i class="fa-solid ${isDeleted ? 'fa-rotate-left' : 'fa-pen-to-square'} text-[10px]"></i>
          <span>${isDeleted ? 'Desmarcar' : 'Editar'}</span>
        </button>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('[data-avatar-id]').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.avatarId;
      const avatar = avatars.find(a => a.id === id);
      if (!avatar) return;

      const override = stagedState.avatarOverrides.get(id);
      if (override?.isDeleted) {
        const confirmRestore = confirm(`El archivo "${avatar.fileName}" está marcado para eliminarse.\n¿Deseas desmarcarlo y cancelar su eliminación?`);
        if (confirmRestore) {
          stagedState.avatarOverrides.delete(id);
          stagedState.history.push({
            type: 'RESTORE_AVATAR',
            id: `restore_${Date.now()}`,
            avatarId: id,
            avatar,
            previousOverride: override
          });
          updateStagedUI();
          renderCollectionAvatars();
          showModderToast(`✓ Se canceló la eliminación de "${avatar.fileName}".`, 'info');
        }
        return;
      }

      openEditModal(avatar);
    });
  });
}

export function renderCatalogGrid() {
  if (modderState.activeCollection) {
    renderCollectionAvatars();
  } else {
    renderCollectionsGrid();
  }
}

// ============================================================
// MODAL DE EDICIÓN, REEMPLAZO Y BORRADO (STAGING)
// ============================================================

export function openEditModal(avatar) {
  modderState.selectedAvatarForEdit = avatar;
  modderState.editReplacementWebp = null;

  const modal = document.getElementById('editAvatarModal');
  const imgPreview = document.getElementById('modalAvatarPreview');
  const modalCharInput = document.getElementById('modalCharacterInput');
  const modalInfoStyle = document.getElementById('modalInfoStyle');
  const modalInfoFranchise = document.getElementById('modalInfoFranchise');
  const modalInfoPath = document.getElementById('modalInfoPath');
  const replacementPreview = document.getElementById('modalReplacementPreview');
  const modalStatus = document.getElementById('modalEditStatus');

  if (!modal) return;

  const currentOverride = stagedState.avatarOverrides.get(avatar.id);
  const activeFileName = currentOverride?.newFilename || avatar.fileName;
  const activeCharName = (currentOverride?.newCharacterName || avatar.characterName || (activeFileName ? activeFileName.replace(/\.webp$/i, '') : '')).trim().replace(/\.webp$/i, '');
  const activeImgUrl = currentOverride?.previewImgUrl || resolveAvatarCdnUrl(avatar.path);

  if (imgPreview) imgPreview.src = activeImgUrl;
  if (modalCharInput) modalCharInput.value = activeCharName;
  if (modalInfoStyle) modalInfoStyle.textContent = avatar.style;
  if (modalInfoFranchise) modalInfoFranchise.textContent = avatar.franchise;
  if (modalInfoPath) modalInfoPath.textContent = avatar.path;
  if (replacementPreview) replacementPreview.classList.add('hidden');

  if (modalStatus) {
    if (currentOverride?.isModified) {
      modalStatus.innerHTML = '<span class="text-amber-300 font-medium"><i class="fa-solid fa-clock-rotate-left mr-1"></i> Este archivo ya tiene cambios pendientes. Puedes seguir editándolo.</span>';
    } else {
      modalStatus.innerHTML = '';
    }
  }

  modal.classList.remove('hidden');
}

export function closeEditModal() {
  modderState.selectedAvatarForEdit = null;
  modderState.editReplacementWebp = null;
  const modal = document.getElementById('editAvatarModal');
  if (modal) modal.classList.add('hidden');
}

export async function handleReplacementImage(file) {
  if (!file) return;
  const modalStatus = document.getElementById('modalEditStatus');
  const replacementPreview = document.getElementById('modalReplacementPreview');
  const replacementImg = document.getElementById('modalReplacementImg');

  try {
    if (modalStatus) modalStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Convirtiendo reemplazo a WebP...';
    const converted = await convertToWebp(file, 0.90);
    modderState.editReplacementWebp = converted;

    if (replacementImg) replacementImg.src = converted.previewUrl;
    if (replacementPreview) replacementPreview.classList.remove('hidden');
    if (modalStatus) {
      modalStatus.innerHTML = '<span class="text-emerald-400 font-medium">✓ Nueva imagen lista en WebP (' + formatBytes(converted.webpSize) + '). Pulsa "Aplicar Cambios".</span>';
    }
  } catch (err) {
    if (modalStatus) modalStatus.innerHTML = `<span class="text-rose-400">Error: ${err.message}</span>`;
  }
}

export function stageAvatarUpdate() {
  const avatar = modderState.selectedAvatarForEdit;
  if (!avatar) return;

  const newNameInput = document.getElementById('modalCharacterInput');
  let rawCharName = (newNameInput?.value || '').trim() || (avatar.characterName || avatar.fileName.replace(/\.webp$/i, ''));
  rawCharName = rawCharName.replace(/\.webp$/i, '').trim();
  const rawFilename = `${rawCharName}.webp`;

  const isReplacing = Boolean(modderState.editReplacementWebp);
  const newBase64 = isReplacing ? modderState.editReplacementWebp.base64 : null;
  const newPreviewUrl = isReplacing ? modderState.editReplacementWebp.previewUrl : null;

  const oldFilename = avatar.fileName;
  const newFilename = rawFilename;

  const currentOverride = stagedState.avatarOverrides.get(avatar.id);
  const currentFilename = currentOverride?.newFilename || avatar.fileName;
  const hasNameChange = newFilename !== currentFilename;
  const hasImageChange = isReplacing;

  if (!hasNameChange && !hasImageChange) {
    closeEditModal();
    return;
  }

  const previousOverride = currentOverride ? { ...currentOverride } : null;

  stagedState.avatarOverrides.set(avatar.id, {
    isDeleted: false,
    isModified: true,
    newCharacterName: newFilename.replace(/\.webp$/i, ''),
    newFilename,
    newBase64: newBase64 || currentOverride?.newBase64 || null,
    previewImgUrl: newPreviewUrl || currentOverride?.previewImgUrl || null
  });

  stagedState.history.push({
    type: 'UPDATE_AVATAR',
    id: `update_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    avatarId: avatar.id,
    avatar,
    oldFilename,
    newFilename,
    newCharacterName: newFilename.replace(/\.webp$/i, ''),
    newBase64: newBase64 || currentOverride?.newBase64 || null,
    isReplacing,
    previousOverride
  });

  closeEditModal();
  updateStagedUI();
  renderCatalogGrid();
  showModderToast(`✓ Se modificó el archivo "${newFilename}" (Cambio #${stagedState.history.length}).`, 'info');
}

export function stageAvatarDelete() {
  const avatar = modderState.selectedAvatarForEdit;
  if (!avatar) return;

  const currentOverride = stagedState.avatarOverrides.get(avatar.id);
  if (currentOverride?.isDeleted) {
    closeEditModal();
    return;
  }

  const previousOverride = currentOverride ? { ...currentOverride } : null;

  stagedState.avatarOverrides.set(avatar.id, {
    isDeleted: true,
    isModified: false
  });

  stagedState.history.push({
    type: 'DELETE_AVATAR',
    id: `delete_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    avatarId: avatar.id,
    avatar,
    previousOverride
  });

  closeEditModal();
  updateStagedUI();
  renderCatalogGrid();
  showModderToast(`✓ Archivo "${avatar.fileName}" marcado para eliminar (Cambio #${stagedState.history.length}).`, 'info');
}

// ============================================================
// SISTEMA DE DESHACER (UNDO STACK)
// ============================================================

export function undoLastChange() {
  if (stagedState.history.length === 0) return;

  const lastAction = stagedState.history.pop();
  if (!lastAction) return;

  let message = 'Cambio deshecho.';

  if (lastAction.type === 'BATCH_UPLOAD') {
    message = `Se deshizo la subida del lote (${lastAction.files.length} avatares de ${lastAction.franchise}).`;
  } else if (lastAction.type === 'UPDATE_AVATAR' || lastAction.type === 'DELETE_AVATAR' || lastAction.type === 'RESTORE_AVATAR') {
    const avatarId = lastAction.avatarId;
    if (lastAction.previousOverride) {
      stagedState.avatarOverrides.set(avatarId, lastAction.previousOverride);
    } else {
      stagedState.avatarOverrides.delete(avatarId);
    }

    if (lastAction.type === 'UPDATE_AVATAR') {
      message = `Se deshizo la edición de "${lastAction.avatar.character}".`;
    } else if (lastAction.type === 'DELETE_AVATAR') {
      message = `Se recuperó el avatar "${lastAction.avatar.character}" (eliminación deshecha).`;
    } else if (lastAction.type === 'RESTORE_AVATAR') {
      message = `Se volvió a marcar "${lastAction.avatar.character}" para eliminar.`;
    }
  }

  updateStagedUI();
  renderCatalogGrid();
  showModderToast(message, 'info');
}

// ============================================================
// PUBLICACIÓN DE TODOS LOS CAMBIOS PENDIENTES (1 COMMIT ATÓMICO)
// ============================================================

export async function commitAllStagedChanges() {
  const session = getModderSession();
  const token = modderState.token || session?.token;
  if (!token) {
    alert('Sesión no válida o expirada.');
    return;
  }

  const totalChanges = stagedState.history.length;
  if (totalChanges === 0) {
    alert('No hay cambios pendientes para guardar.');
    return;
  }

  const confirmCommit = confirm(
    `¿Confirmas publicar los ${totalChanges} cambio(s) acumulado(s) en GitHub?\nTodos los lotes, reemplazos, renombrados y eliminaciones se aplicarán en un único commit atómico.`
  );
  if (!confirmCommit) return;

  const btnSave = document.getElementById('btnSaveAllChanges');
  const btnUndo = document.getElementById('btnUndoChange');

  if (btnSave) {
    btnSave.disabled = true;
    btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> <span>Guardando en GitHub...</span>';
  }
  if (btnUndo) btnUndo.disabled = true;

  // Consolidar todas las operaciones pendientes
  const addedFiles = [];
  const replacedFiles = [];
  const renamedFiles = [];
  const deletedFiles = [];

  // 1. Archivos nuevos de subidas por lote
  for (const action of stagedState.history) {
    if (action.type === 'BATCH_UPLOAD') {
      for (const f of action.files) {
        const repoPath = `assets/profile_icons/${action.style}/${action.franchise}/${f.filename}`;
        addedFiles.push({
          path: repoPath,
          base64: f.base64
        });
      }
    }
  }

  // 2. Modificaciones y eliminaciones sobre catálogo existente
  const allAvatars = getCompiledAvatars();
  for (const [avatarId, override] of stagedState.avatarOverrides.entries()) {
    const avatar = allAvatars.find(a => a.id === avatarId);
    if (!avatar) continue;

    const originalPath = `assets/profile_icons/${avatar.style}/${avatar.franchise}/${avatar.fileName}`;

    if (override.isDeleted) {
      deletedFiles.push(originalPath);
    } else if (override.isModified) {
      const isRenamed = override.newFilename && override.newFilename !== avatar.fileName;
      const newPath = isRenamed 
        ? `assets/profile_icons/${avatar.style}/${avatar.franchise}/${override.newFilename}`
        : originalPath;

      if (isRenamed) {
        renamedFiles.push({
          oldPath: originalPath,
          newPath: newPath,
          newBase64: override.newBase64 || null
        });
      } else if (override.newBase64) {
        replacedFiles.push({
          path: originalPath,
          base64: override.newBase64
        });
      }
    }
  }

  try {
    const endpoint = `${CONFIG.WORKER_API_URL.replace(/\/+$/, '')}/api/save-staged-changes`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: token,
        addedFiles,
        replacedFiles,
        renamedFiles,
        deletedFiles
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error al guardar los cambios en GitHub.');
    }

    // Vaciar historial local
    stagedState.history = [];
    stagedState.avatarOverrides.clear();
    updateStagedUI();

    showModderToast(`✓ ¡Todos los cambios se guardaron con éxito en 1 commit!`, 'success');
    alert(`✓ ¡Éxito! Todos los cambios se guardaron en GitHub en un único commit atómico.${data.commit ? `\n\nEnlace al commit:\n${data.commit}` : ''}`);

    // Refrescar catálogo
    await populateSelects(true);
    renderCatalogGrid();

  } catch (err) {
    console.error('Error al guardar cambios:', err);
    alert(`Error al guardar cambios: ${err.message}`);
  } finally {
    updateStagedUI();
  }
}

// Recalcular slots de previsualización en 1 fila automáticamente al cambiar el tamaño de ventana
let _collectionResizeDebounce = null;
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    clearTimeout(_collectionResizeDebounce);
    _collectionResizeDebounce = setTimeout(() => {
      if (!modderState.activeCollection && modderState.activeTab === 'manage') {
        renderCollectionsGrid();
      }
    }, 120);
  });
}
