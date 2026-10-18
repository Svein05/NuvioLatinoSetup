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

  // Estado del gestor de catálogo existente
  catalogFilters: {
    style: 'all',
    franchise: 'all',
    query: ''
  },
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
      uploadStatusText.innerHTML = `<span class="text-white/80 font-medium">${modderState.filesQueue.length} imagen(es) lista(s). Haz clic en 'Añadir Lote a Cambios Pendientes'.</span>`;
    } else if (totalChanges > 0) {
      uploadStatusText.innerHTML = `<span class="text-amber-300 font-medium"><i class="fa-solid fa-clock-rotate-left mr-1"></i> Tienes ${totalChanges} cambio(s) acumulado(s). Pulsa 'Guardar Cambios' arriba a la derecha.</span>`;
    } else {
      uploadStatusText.textContent = 'Añade este lote a la lista de cambios pendientes para guardarlo junto con tus otras ediciones.';
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
    manageStyleSelect.innerHTML = styles.map(s => `
      <option value="${s.id}" ${modderState.catalogFilters.style === s.id ? 'selected' : ''}>
        ${s.name} (${s.count})
      </option>
    `).join('');
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

  container.innerHTML = modderState.filesQueue.map((item, index) => {
    const savings = item.originalSize > 0 
      ? Math.round(((item.originalSize - item.webpSize) / item.originalSize) * 100) 
      : 0;
    const savingsBadge = savings > 0 
      ? `<span class="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">-${savings}%</span>`
      : `<span class="text-[10px] text-white/50 font-mono">WebP</span>`;

    const finalFilename = `${currentFranchise || 'Obra'}_${item.characterName || 'Personaje'}.webp`;

    return `
      <div class="lat-card p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 relative group" data-queue-id="${item.id}">
        <div class="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
          <img src="${item.previewUrl}" alt="${item.characterName}" class="w-full h-full object-cover">
          <span class="absolute bottom-1 right-1 text-[9px] font-mono px-1 rounded bg-black/70 text-white/80">.webp</span>
        </div>

        <div class="flex-1 w-full text-left space-y-1.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs text-white/50 truncate max-w-[200px]" title="${item.originalName}">
              ${item.originalName}
            </span>
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-mono text-white/60">
                ${formatBytes(item.originalSize)} ➔ <strong class="text-emerald-400">${formatBytes(item.webpSize)}</strong>
              </span>
              ${savingsBadge}
            </div>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-center gap-2">
            <label class="text-[11px] text-white/60 shrink-0">Personaje:</label>
            <input type="text" 
                   value="${item.characterName}" 
                   class="lat-field text-xs py-1 px-2.5 flex-1 input-character-name" 
                   data-index="${index}"
                   placeholder="Nombre del personaje">
          </div>

          <div class="text-[10px] font-mono text-white/40 truncate">
            Destino: <span class="text-amber-300/80">${finalFilename}</span>
          </div>
        </div>

        <button type="button" 
                class="btn-remove-item p-2 text-white/40 hover:text-rose-400 transition-colors cursor-pointer self-end sm:self-center"
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
        modderState.filesQueue[idx].characterName = formatCharacterName(e.target.value.trim());
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
      const rawName = dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name;
      const cleanCharacter = formatCharacterName(rawName);

      modderState.filesQueue.push({
        id: `f_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        originalFile: file,
        webpBlob: converted.blob,
        base64: converted.base64,
        originalSize: file.size,
        webpSize: converted.webpSize,
        previewUrl: converted.previewUrl,
        originalName: file.name,
        characterName: cleanCharacter
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
    const finalFilename = `${franchise}_${item.characterName}.webp`;
    return {
      filename: finalFilename,
      characterName: item.characterName,
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
// EXPLORADOR Y GESTIÓN DE CATÁLOGO EXISTENTE
// ============================================================

export function renderCatalogGrid() {
  const grid = document.getElementById('catalogGrid');
  const countLabel = document.getElementById('catalogFilterCount');
  if (!grid) return;

  const filtered = filterAvatars(modderState.catalogFilters);

  if (countLabel) {
    countLabel.textContent = `${filtered.length} avatares encontrados`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center text-white/50 space-y-2">
        <i class="fa-solid fa-folder-open text-3xl text-white/20"></i>
        <p class="text-sm">No se encontraron avatares con los filtros actuales.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(av => {
    const override = stagedState.avatarOverrides.get(av.id);
    const isDeleted = override?.isDeleted;
    const isModified = override?.isModified;

    const displayCharacter = override?.newCharacterName || av.character;
    const displayImg = override?.previewImgUrl || resolveAvatarCdnUrl(av.path);
    const ext = av.extension ? `.${av.extension.toLowerCase()}` : '';

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
          <img src="${displayImg}" alt="${displayCharacter}" class="w-full h-full object-cover" loading="lazy">
          <span class="absolute bottom-1 right-1 text-[9px] font-mono px-1 rounded bg-black/70 text-white/70">${ext}</span>
        </div>

        <div class="w-full space-y-0.5">
          <h4 class="text-xs font-semibold text-white truncate max-w-full" title="${displayCharacter}">${displayCharacter}</h4>
          <p class="text-[10px] text-white/50 truncate" title="${av.franchiseName}">${av.franchiseName}</p>
          <span class="inline-block text-[9px] text-amber-300/80 bg-amber-400/10 px-1.5 py-0.5 rounded font-mono truncate max-w-full">
            ${av.styleName}
          </span>
        </div>

        <button type="button" class="mt-1 w-full py-1 text-[11px] rounded-lg ${isDeleted ? 'bg-rose-500/20 text-rose-300' : 'bg-white/5 hover:bg-amber-400 hover:text-black text-white/70'} font-medium transition-colors flex items-center justify-center gap-1.5">
          <i class="fa-solid ${isDeleted ? 'fa-rotate-left' : 'fa-pen-to-square'} text-[10px]"></i>
          <span>${isDeleted ? 'Desmarcar' : 'Editar'}</span>
        </button>
      </div>
    `;
  }).join('');

  // Vincular clics de edición / desmarcado a cada tarjeta
  grid.querySelectorAll('[data-avatar-id]').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.avatarId;
      const avatar = filtered.find(a => a.id === id);
      if (!avatar) return;

      const override = stagedState.avatarOverrides.get(id);
      if (override?.isDeleted) {
        const confirmRestore = confirm(`"${avatar.character}" está marcado para eliminarse.\n¿Deseas desmarcarlo y cancelar su eliminación?`);
        if (confirmRestore) {
          stagedState.avatarOverrides.delete(id);
          // Registrar en historial para poder deshacer si se desea
          stagedState.history.push({
            type: 'RESTORE_AVATAR',
            id: `restore_${Date.now()}`,
            avatarId: id,
            avatar,
            previousOverride: override
          });
          updateStagedUI();
          renderCatalogGrid();
          showModderToast(`✓ Se canceló la eliminación de "${avatar.character}".`, 'info');
        }
        return;
      }

      openEditModal(avatar);
    });
  });
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
  const activeCharName = currentOverride?.newCharacterName || avatar.baseCharacter || avatar.character;
  const activeImgUrl = currentOverride?.previewImgUrl || resolveAvatarCdnUrl(avatar.path);

  if (imgPreview) imgPreview.src = activeImgUrl;
  if (modalCharInput) modalCharInput.value = activeCharName;
  if (modalInfoStyle) modalInfoStyle.textContent = avatar.style;
  if (modalInfoFranchise) modalInfoFranchise.textContent = avatar.franchise;
  if (modalInfoPath) modalInfoPath.textContent = avatar.path;
  if (replacementPreview) replacementPreview.classList.add('hidden');

  if (modalStatus) {
    if (currentOverride?.isModified) {
      modalStatus.innerHTML = '<span class="text-amber-300 font-medium"><i class="fa-solid fa-clock-rotate-left mr-1"></i> Este avatar ya tiene cambios pendientes. Puedes seguir editándolo.</span>';
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
      modalStatus.innerHTML = '<span class="text-emerald-400 font-medium">✓ Nueva imagen lista en WebP (' + formatBytes(converted.webpSize) + '). Pulsa "Aplicar a Cambios Pendientes".</span>';
    }
  } catch (err) {
    if (modalStatus) modalStatus.innerHTML = `<span class="text-rose-400">Error: ${err.message}</span>`;
  }
}

export function stageAvatarUpdate() {
  const avatar = modderState.selectedAvatarForEdit;
  if (!avatar) return;

  const newNameInput = document.getElementById('modalCharacterInput');
  const newCharacterName = formatCharacterName(newNameInput?.value.trim() || avatar.character);
  const isReplacing = Boolean(modderState.editReplacementWebp);
  const newBase64 = isReplacing ? modderState.editReplacementWebp.base64 : null;
  const newPreviewUrl = isReplacing ? modderState.editReplacementWebp.previewUrl : null;

  const oldFilename = avatar.fileName;
  const newFilename = `${avatar.franchise}_${newCharacterName}.webp`;

  const currentOverride = stagedState.avatarOverrides.get(avatar.id);
  const currentName = currentOverride?.newCharacterName || avatar.character;
  const hasNameChange = newCharacterName !== currentName;
  const hasImageChange = isReplacing;

  if (!hasNameChange && !hasImageChange) {
    closeEditModal();
    return;
  }

  const previousOverride = currentOverride ? { ...currentOverride } : null;

  stagedState.avatarOverrides.set(avatar.id, {
    isDeleted: false,
    isModified: true,
    newCharacterName,
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
    newCharacterName,
    newBase64,
    isReplacing,
    previousOverride
  });

  closeEditModal();
  updateStagedUI();
  renderCatalogGrid();
  showModderToast(`✓ Avatar "${newCharacterName}" añadido a cambios pendientes (Cambio #${stagedState.history.length}).`, 'success');
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
  showModderToast(`✓ Avatar "${avatar.character}" marcado para eliminar (Cambio #${stagedState.history.length}).`, 'info');
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
