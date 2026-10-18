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
    return parsed.token || null;
  } catch (_) {
    return null;
  }
}

export function saveModderSession(token) {
  modderState.token = token;
  try {
    sessionStorage.setItem(MODDER_SESSION_KEY, JSON.stringify({ token, timestamp: Date.now() }));
  } catch (_) {}
}

export function clearModderSession() {
  modderState.token = null;
  try {
    sessionStorage.removeItem(MODDER_SESSION_KEY);
  } catch (_) {}
}

export async function verifyPassword(password) {
  const endpoint = `${CONFIG.WORKER_API_URL.replace(/\/+$/, '')}/api/verify-auth`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  if (!res.ok) {
    throw new Error('Contraseña no válida.');
  }
  return await res.json();
}

// ============================================================
// POBLADO DE SELECTS Y FILTROS
// ============================================================

export async function populateSelects(forceRefresh = false) {
  await loadAvatarsCatalog(forceRefresh);
  const styles = getStylesSummary() || [];
  const franchises = getFranchisesSummary() || [];

  // 1. Selects del cargador por lote
  const styleSelect = document.getElementById('selectStyle');
  const franchiseSelect = document.getElementById('selectFranchise');

  if (styleSelect) {
    styleSelect.innerHTML = `
      <option value="">-- Selecciona un estilo existente --</option>
      ${styles.map(s => `<option value="${s.id}">${s.name} (${s.count} avatares)</option>`).join('')}
      <option value="__NEW__">➕ Crear nuevo estilo...</option>
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
  if (modderState.isNewStyle) {
    const input = document.getElementById('inputNewStyle');
    return input ? input.value.trim().replace(/[^a-zA-Z0-9_-]/g, '') : '';
  }
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
}

export async function submitBatchUpload() {
  const style = getActiveStyleName();
  const franchise = getActiveFranchiseName();
  const token = modderState.token || getModderSession();

  if (!token) {
    alert('Sesión no válida o expirada.');
    return;
  }

  if (!style) {
    alert('Por favor selecciona o define un Estilo.');
    document.getElementById('selectStyle')?.focus();
    return;
  }

  if (!franchise) {
    alert('Por favor selecciona o define una Franquicia / Obra.');
    document.getElementById('selectFranchise')?.focus();
    return;
  }

  if (modderState.filesQueue.length === 0) {
    alert('No hay imágenes en la cola para subir.');
    return;
  }

  const btnSubmit = document.getElementById('btnSubmitBatch');
  const statusEl = document.getElementById('uploadStatusText');

  if (btnSubmit) btnSubmit.disabled = true;
  if (statusEl) {
    statusEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Preparando lote de ${modderState.filesQueue.length} avatares...`;
  }

  const filesPayload = modderState.filesQueue.map(item => {
    const finalFilename = `${franchise}_${item.characterName}.webp`;
    return {
      filename: finalFilename,
      fileBase64: item.base64
    };
  });

  const requestBody = {
    password: token,
    style,
    franchise,
    files: filesPayload
  };

  try {
    if (statusEl) {
      statusEl.innerHTML = `<i class="fa-solid fa-cloud-arrow-up fa-fade mr-1"></i> Creando commit único en GitHub...`;
    }

    const endpoint = `${CONFIG.WORKER_API_URL.replace(/\/+$/, '')}/api/upload-batch`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error al procesar el lote en el servidor.');
    }

    modderState.filesQueue = [];
    renderQueue();

    if (statusEl) {
      statusEl.innerHTML = `
        <span class="text-emerald-400 font-semibold">
          <i class="fa-solid fa-circle-check mr-1"></i> ¡Lote de ${data.count || filesPayload.length} avatares subido con éxito!
        </span>
        ${data.commit ? `<a href="${data.commit}" target="_blank" class="ml-2 underline text-white/80 hover:text-white text-xs">Ver commit</a>` : ''}
      `;
    }

    // Refrescar el catálogo en segundo plano
    setTimeout(() => {
      populateSelects(true);
      renderCatalogGrid();
    }, 1500);

  } catch (err) {
    console.error('Error al subir lote:', err);
    if (statusEl) {
      statusEl.innerHTML = `<span class="text-rose-400 font-semibold"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Error: ${err.message}</span>`;
    }
  } finally {
    if (btnSubmit) btnSubmit.disabled = false;
  }
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
    const imgUrl = resolveAvatarCdnUrl(av.path);
    const ext = av.extension ? `.${av.extension.toLowerCase()}` : '';

    return `
      <div class="lat-card p-3 flex flex-col items-center text-center gap-2 group hover:border-amber-400/40 transition-all cursor-pointer relative"
           data-avatar-id="${av.id}">
        
        <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/5 border border-white/10 overflow-hidden relative flex items-center justify-center group-hover:scale-105 transition-transform">
          <img src="${imgUrl}" alt="${av.character}" class="w-full h-full object-cover" loading="lazy">
          <span class="absolute bottom-1 right-1 text-[9px] font-mono px-1 rounded bg-black/70 text-white/70">${ext}</span>
        </div>

        <div class="w-full space-y-0.5">
          <h4 class="text-xs font-semibold text-white truncate max-w-full" title="${av.character}">${av.character}</h4>
          <p class="text-[10px] text-white/50 truncate" title="${av.franchiseName}">${av.franchiseName}</p>
          <span class="inline-block text-[9px] text-amber-300/80 bg-amber-400/10 px-1.5 py-0.5 rounded font-mono truncate max-w-full">
            ${av.styleName}
          </span>
        </div>

        <button type="button" class="mt-1 w-full py-1 text-[11px] rounded-lg bg-white/5 hover:bg-amber-400 hover:text-black text-white/70 font-medium transition-colors flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-pen-to-square text-[10px]"></i>
          <span>Editar</span>
        </button>
      </div>
    `;
  }).join('');

  // Vincular clics de edición a cada tarjeta
  grid.querySelectorAll('[data-avatar-id]').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.avatarId;
      const avatar = filtered.find(a => a.id === id);
      if (avatar) {
        openEditModal(avatar);
      }
    });
  });
}

// ============================================================
// MODAL DE EDICIÓN, REEMPLAZO Y BORRADO
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

  if (imgPreview) imgPreview.src = resolveAvatarCdnUrl(avatar.path);
  if (modalCharInput) modalCharInput.value = avatar.baseCharacter || avatar.character;
  if (modalInfoStyle) modalInfoStyle.textContent = avatar.style;
  if (modalInfoFranchise) modalInfoFranchise.textContent = avatar.franchise;
  if (modalInfoPath) modalInfoPath.textContent = avatar.path;
  if (replacementPreview) replacementPreview.classList.add('hidden');
  if (modalStatus) modalStatus.innerHTML = '';

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
    if (modalStatus) modalStatus.innerHTML = '<span class="text-emerald-400">✓ Nueva imagen lista en WebP (' + formatBytes(converted.webpSize) + '). Haz clic en "Guardar Cambios" para subirla.</span>';
  } catch (err) {
    if (modalStatus) modalStatus.innerHTML = `<span class="text-rose-400">Error: ${err.message}</span>`;
  }
}

export async function submitAvatarUpdate() {
  const avatar = modderState.selectedAvatarForEdit;
  const token = modderState.token || getModderSession();
  const modalStatus = document.getElementById('modalEditStatus');
  const btnSave = document.getElementById('btnModalSave');
  const newNameInput = document.getElementById('modalCharacterInput');

  if (!avatar || !token) return;

  const newCharacterName = formatCharacterName(newNameInput?.value.trim() || avatar.character);
  const isReplacing = Boolean(modderState.editReplacementWebp);
  const oldFilename = avatar.fileName;
  const newFilename = `${avatar.franchise}_${newCharacterName}.webp`;

  if (btnSave) btnSave.disabled = true;
  if (modalStatus) modalStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Aplicando cambios en GitHub...';

  try {
    const endpoint = `${CONFIG.WORKER_API_URL.replace(/\/+$/, '')}/api/update-avatar`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: token,
        style: avatar.style,
        franchise: avatar.franchise,
        oldFilename,
        newFilename,
        newFileBase64: isReplacing ? modderState.editReplacementWebp.base64 : null
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error al actualizar el avatar');
    }

    if (modalStatus) {
      modalStatus.innerHTML = `<span class="text-emerald-400 font-semibold">✓ ¡Avatar actualizado con éxito en GitHub!</span>`;
    }

    setTimeout(() => {
      closeEditModal();
      populateSelects(true);
      renderCatalogGrid();
    }, 1200);

  } catch (err) {
    if (modalStatus) modalStatus.innerHTML = `<span class="text-rose-400 font-semibold">Error: ${err.message}</span>`;
  } finally {
    if (btnSave) btnSave.disabled = false;
  }
}

export async function submitAvatarDelete() {
  const avatar = modderState.selectedAvatarForEdit;
  const token = modderState.token || getModderSession();
  const modalStatus = document.getElementById('modalEditStatus');
  const btnDelete = document.getElementById('btnModalDelete');

  if (!avatar || !token) return;

  const confirmDelete = confirm(`¿Estás seguro de que deseas ELIMINAR permanentemente "${avatar.character}" del repositorio de GitHub?`);
  if (!confirmDelete) return;

  if (btnDelete) btnDelete.disabled = true;
  if (modalStatus) modalStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Eliminando archivo en GitHub...';

  try {
    const endpoint = `${CONFIG.WORKER_API_URL.replace(/\/+$/, '')}/api/delete-avatar`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: token,
        style: avatar.style,
        franchise: avatar.franchise,
        filename: avatar.fileName
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error al eliminar el avatar');
    }

    if (modalStatus) {
      modalStatus.innerHTML = `<span class="text-rose-400 font-semibold">✓ Avatar eliminado correctamente del repositorio.</span>`;
    }

    setTimeout(() => {
      closeEditModal();
      populateSelects(true);
      renderCatalogGrid();
    }, 1200);

  } catch (err) {
    if (modalStatus) modalStatus.innerHTML = `<span class="text-rose-400 font-semibold">Error: ${err.message}</span>`;
  } finally {
    if (btnDelete) btnDelete.disabled = false;
  }
}
