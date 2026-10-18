/**
 * Modder Assets Uploader - Nuvio Latino
 * Gestión de subida por lote con conversión universal a WebP y commit atómico en GitHub.
 */

import { CONFIG } from './config.js';
import { 
  loadAvatarsCatalog, 
  getStylesSummary, 
  getFranchisesSummary,
  formatStyleName,
  formatFranchiseName,
  formatCharacterName
} from './avatars-data.js';

const MODDER_SESSION_KEY = 'nuvio_modder_session';

// Estado reactivo local del uploader
export const modderState = {
  token: null,
  selectedStyle: '',
  selectedFranchise: '',
  isNewStyle: false,
  isNewFranchise: false,
  filesQueue: [], // Array de { id, originalFile, webpBlob, base64, originalSize, webpSize, previewUrl, characterName }
  isConverting: false,
  isUploading: false,
  uploadProgress: ''
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

        // Limpiar fondo
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

// Formatear bytes a KB / MB
export function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// ============================================================
// GESTIÓN DE SESIÓN Y AUTENTICACIÓN MODDER
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
// CARGA DE METADATOS Y CATÁLOGO EXISTENTE
// ============================================================

export async function populateSelects() {
  await loadAvatarsCatalog();
  const styles = getStylesSummary() || [];
  const franchises = getFranchisesSummary() || [];

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
}

// ============================================================
// COLA DE ARCHIVOS Y RENDERIZADO
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
        <!-- Miniatura WebP -->
        <div class="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
          <img src="${item.previewUrl}" alt="${item.characterName}" class="w-full h-full object-cover">
          <span class="absolute bottom-1 right-1 text-[9px] font-mono px-1 rounded bg-black/70 text-white/80">.webp</span>
        </div>

        <!-- Información y Edición de Nombre -->
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

        <!-- Botón Eliminar -->
        <button type="button" 
                class="btn-remove-item p-2 text-white/40 hover:text-rose-400 transition-colors cursor-pointer self-end sm:self-center"
                data-index="${index}"
                title="Eliminar de la cola">
          <i class="fa-solid fa-trash-can text-sm"></i>
        </button>
      </div>
    `;
  }).join('');

  // Event Listeners para editar nombre de personaje
  container.querySelectorAll('.input-character-name').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      if (modderState.filesQueue[idx]) {
        modderState.filesQueue[idx].characterName = formatCharacterName(e.target.value.trim());
      }
    });
  });

  // Event Listeners para eliminar de la cola
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

// ============================================================
// PROCESAMIENTO DE ARCHIVOS ENTRANTES
// ============================================================

export async function handleFiles(files) {
  if (!files || files.length === 0) return;

  const validFiles = Array.from(files).filter(f => {
    return /\.(jpe?g|png|webp|svg|bmp)$/i.test(f.name);
  });

  if (validFiles.length === 0) {
    alert('Por favor selecciona archivos de imagen válidos (.png, .jpg, .webp, .svg, etc.).');
    return;
  }

  const dropOverlay = document.getElementById('dropOverlay');
  if (dropOverlay) dropOverlay.classList.remove('hidden');

  for (const file of validFiles) {
    try {
      const converted = await convertToWebp(file, 0.90);

      // Extraer nombre del personaje a partir del nombre original
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

  if (dropOverlay) dropOverlay.classList.add('hidden');
  renderQueue();
}

// ============================================================
// ENVÍO DEL LOTE AL WORKER (1 SOLO COMMIT)
// ============================================================

export async function submitBatchUpload() {
  const style = getActiveStyleName();
  const franchise = getActiveFranchiseName();
  const token = modderState.token || getModderSession();

  if (!token) {
    alert('Sesión no válida o expirada. Por favor reingresa con tu contraseña de Modder.');
    return;
  }

  if (!style) {
    alert('Por favor selecciona o define un Estilo.');
    const s = document.getElementById('selectStyle');
    if (s) s.focus();
    return;
  }

  if (!franchise) {
    alert('Por favor selecciona o define una Franquicia / Obra.');
    const f = document.getElementById('selectFranchise');
    if (f) f.focus();
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

  // Empaquetar payload
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

    // Éxito: Limpiar cola y notificar
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

    // Recargar catálogo para actualizar selects
    setTimeout(() => {
      populateSelects();
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
