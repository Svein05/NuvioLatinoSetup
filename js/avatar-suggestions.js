/**
 * Módulo de Sugerencias de Avatares para la Comunidad (Nuvio Latino Setup)
 * Permite a los usuarios enviar aportes de personajes mediante subida directa de archivos (PNG/WEBP/JPG)
 * o enlaces URL directos hacia un Webhook seguro de Discord con Rich Embeds.
 */

import { INJECTED_WEBHOOK_CONFIG } from './webhook-config.js';

const COOLDOWN_SECONDS = 120;
const STORAGE_KEY_COOLDOWN = 'nuvio_last_avatar_suggestion';
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/webp', 'image/jpeg', 'image/jpg', 'image/gif'];

// Estado local del modal de sugerencia
const suggestionState = {
  mode: 'file', // 'file' | 'url'
  selectedFile: null,
  selectedFileObjectUrl: null,
  urlValue: '',
  characterName: '',
  seriesName: '',
  isValidUrlImage: false,
  isSending: false
};

let cachedWebhookUrl = '';

/**
 * Obtiene la URL del webhook disponible.
 * Prioriza la inyectada por GitHub Actions en producción.
 * Si está en local/dev, lee desde:
 * 1. js/webhook-config.local.js (sincronizado con .env y excluido en .gitignore)
 * 2. localStorage ('nuvio_dev_webhook_url')
 * 3. endpoint local /api/env (si corre vía python run.py)
 */
async function getWebhookUrl() {
  if (cachedWebhookUrl) return cachedWebhookUrl;

  const injected = INJECTED_WEBHOOK_CONFIG?.webhookUrl?.trim();
  if (injected) {
    cachedWebhookUrl = injected;
    return injected;
  }

  // 1. Cargar archivo local no versionado js/webhook-config.local.js (proveniente de .env)
  try {
    const localMod = await import('./webhook-config.local.js').catch(() => null);
    if (localMod?.LOCAL_WEBHOOK_CONFIG?.webhookUrl?.trim()) {
      cachedWebhookUrl = localMod.LOCAL_WEBHOOK_CONFIG.webhookUrl.trim();
      return cachedWebhookUrl;
    }
  } catch (_) {}

  // 2. localStorage
  try {
    const devUrl = localStorage.getItem('nuvio_dev_webhook_url')?.trim();
    if (devUrl) {
      cachedWebhookUrl = devUrl;
      return devUrl;
    }
  } catch (_) {}

  // 3. Endpoint /api/env si se ejecuta con run.py
  try {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
      const res = await fetch('/api/env').catch(() => null);
      if (res?.ok) {
        const data = await res.json().catch(() => null);
        if (data?.DISCORD_WEBHOOK_URL) {
          cachedWebhookUrl = data.DISCORD_WEBHOOK_URL.trim();
          return cachedWebhookUrl;
        }
      }
    }
  } catch (_) {}

  return '';
}

/**
 * Verifica si el usuario está en período de cooldown.
 * Retorna los segundos restantes (0 si no hay cooldown).
 */
function getRemainingCooldownSeconds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COOLDOWN);
    if (!raw) return 0;
    const lastTime = parseInt(raw, 10);
    if (isNaN(lastTime)) return 0;
    const elapsedSeconds = Math.floor((Date.now() - lastTime) / 1000);
    const remaining = COOLDOWN_SECONDS - elapsedSeconds;
    return remaining > 0 ? remaining : 0;
  } catch (_) {
    return 0;
  }
}

/**
 * Formatea un tamaño de bytes en KB o MB legibles.
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Abre el modal de sugerencias de avatar.
 */
export function openAvatarSuggestionModal() {
  const modal = document.getElementById('modalAvatarSuggestion');
  if (!modal) return;

  hideFormError();
  switchView('form');

  // Si la última interacción fue mediante URL y tiene datos, mantenerlos y permanecer en modo 'url'
  if (suggestionState.mode === 'url' && (suggestionState.urlValue || suggestionState.characterName || suggestionState.seriesName)) {
    setMode('url');
    const urlInput = document.getElementById('inputAvatarSuggestionUrl');
    const charInput = document.getElementById('inputAvatarSuggestionCharName');
    const seriesInput = document.getElementById('inputAvatarSuggestionSeriesName');

    if (urlInput) urlInput.value = suggestionState.urlValue;
    if (charInput) charInput.value = suggestionState.characterName;
    if (seriesInput) seriesInput.value = suggestionState.seriesName;
    updateLivePreview();
  } else {
    // Si fue subida directa de archivo (o primera vez), resetear completamente a estado inicial limpio
    resetSuggestionForm();
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

/**
 * Cierra el modal de sugerencias de avatar.
 */
export function closeAvatarSuggestionModal() {
  const modal = document.getElementById('modalAvatarSuggestion');
  if (!modal) return;

  // Si estaba en modo 'file' (subida directa), no mantener ningún dato, archivo ni opción
  if (suggestionState.mode === 'file') {
    resetSuggestionForm();
  } else {
    // En modo URL, asegurar que cualquier archivo residual sea removido de memoria/DOM
    removeSelectedFile();
  }

  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.body.style.overflow = '';
}

/**
 * Cambia entre vistas internas del modal ('form', 'confirm', 'success').
 */
function switchView(viewName) {
  const formView = document.getElementById('avatarSuggestionFormView');
  const confirmView = document.getElementById('avatarSuggestionConfirmView');
  const successView = document.getElementById('avatarSuggestionSuccessView');

  if (formView) formView.classList.toggle('hidden', viewName !== 'form');
  if (confirmView) confirmView.classList.toggle('hidden', viewName !== 'confirm');
  if (successView) successView.classList.toggle('hidden', viewName !== 'success');
}

/**
 * Restablece todo el formulario a su estado inicial limpio.
 */
function resetSuggestionForm() {
  removeSelectedFile();

  suggestionState.mode = 'file';
  suggestionState.selectedFile = null;
  suggestionState.urlValue = '';
  suggestionState.characterName = '';
  suggestionState.seriesName = '';
  suggestionState.isValidUrlImage = false;
  suggestionState.isSending = false;

  const fileInput = document.getElementById('inputAvatarSuggestionFile');
  if (fileInput) fileInput.value = '';

  const urlInput = document.getElementById('inputAvatarSuggestionUrl');
  if (urlInput) urlInput.value = '';

  const charInput = document.getElementById('inputAvatarSuggestionCharName');
  if (charInput) charInput.value = '';

  const seriesInput = document.getElementById('inputAvatarSuggestionSeriesName');
  if (seriesInput) seriesInput.value = '';

  hideFormError();
  setMode('file');
  updateLivePreview();
}

/**
 * Configura el modo activo ('file' | 'url').
 */
function setMode(mode) {
  suggestionState.mode = mode;
  const btnFile = document.getElementById('btnSuggestionModeFile');
  const btnUrl = document.getElementById('btnSuggestionModeUrl');
  const dropzoneWrap = document.getElementById('suggestionDropzoneWrap');
  const urlWrap = document.getElementById('suggestionUrlWrap');

  if (mode === 'file') {
    if (btnFile) {
      btnFile.className = 'flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 bg-[#ffd479] text-black shadow-sm';
    }
    if (btnUrl) {
      btnUrl.className = 'flex-1 py-1.5 px-3 rounded-lg text-xs font-medium text-white/60 hover:text-white transition-all flex items-center justify-center gap-1.5';
    }
    if (dropzoneWrap) dropzoneWrap.classList.remove('hidden');
    if (urlWrap) urlWrap.classList.add('hidden');
  } else {
    if (btnUrl) {
      btnUrl.className = 'flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 bg-[#ffd479] text-black shadow-sm';
    }
    if (btnFile) {
      btnFile.className = 'flex-1 py-1.5 px-3 rounded-lg text-xs font-medium text-white/60 hover:text-white transition-all flex items-center justify-center gap-1.5';
    }
    if (urlWrap) urlWrap.classList.remove('hidden');
    if (dropzoneWrap) dropzoneWrap.classList.add('hidden');
    removeSelectedFile();
  }

  updateLivePreview();
}

/**
 * Valida y asigna un archivo seleccionado.
 */
function handleFileSelection(file) {
  if (!file) return;

  hideFormError();

  if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    showFormError('Formato no compatible. Por favor sube una imagen PNG, WebP, JPG o GIF.');
    return;
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    showFormError(`La imagen supera el límite permitido de 8 MB (${formatFileSize(file.size)}).`);
    return;
  }

  // Revocar URL anterior si existía
  if (suggestionState.selectedFileObjectUrl) {
    URL.revokeObjectURL(suggestionState.selectedFileObjectUrl);
    suggestionState.selectedFileObjectUrl = null;
  }

  suggestionState.selectedFile = file;
  suggestionState.selectedFileObjectUrl = URL.createObjectURL(file);

  // Actualizar UI del archivo seleccionado
  const dropzone = document.getElementById('suggestionDropzone');
  const fileSelectedWrap = document.getElementById('suggestionFileSelectedWrap');
  const fileNameEl = document.getElementById('suggestionFileName');
  const fileSizeEl = document.getElementById('suggestionFileSize');

  if (dropzone) dropzone.classList.add('hidden');
  if (fileSelectedWrap) {
    fileSelectedWrap.classList.remove('hidden');
    fileSelectedWrap.classList.add('flex');
  }
  if (fileNameEl) fileNameEl.textContent = file.name;
  if (fileSizeEl) fileSizeEl.textContent = formatFileSize(file.size);

  updateLivePreview();
}

/**
 * Quita el archivo actualmente seleccionado.
 */
function removeSelectedFile() {
  if (suggestionState.selectedFileObjectUrl) {
    URL.revokeObjectURL(suggestionState.selectedFileObjectUrl);
    suggestionState.selectedFileObjectUrl = null;
  }
  suggestionState.selectedFile = null;

  const fileInput = document.getElementById('inputAvatarSuggestionFile');
  if (fileInput) fileInput.value = '';

  const dropzone = document.getElementById('suggestionDropzone');
  const fileSelectedWrap = document.getElementById('suggestionFileSelectedWrap');

  if (fileSelectedWrap) {
    fileSelectedWrap.classList.add('hidden');
    fileSelectedWrap.classList.remove('flex');
  }
  if (dropzone) dropzone.classList.remove('hidden');

  updateLivePreview();
}

/**
 * Actualiza la previsualización interactiva en tiempo real.
 */
function updateLivePreview() {
  const previewImg = document.getElementById('avatarSuggestionPreviewImg');
  const placeholder = document.getElementById('avatarSuggestionPreviewPlaceholder');
  const previewChar = document.getElementById('avatarSuggestionPreviewChar');
  const previewSeries = document.getElementById('avatarSuggestionPreviewSeries');
  const previewOrigin = document.getElementById('avatarSuggestionPreviewOrigin');

  const charName = suggestionState.characterName.trim();
  const seriesName = suggestionState.seriesName.trim();

  // Nombre de personaje
  if (previewChar) {
    if (charName) {
      previewChar.textContent = charName;
      previewChar.classList.remove('italic', 'text-white/40');
      previewChar.classList.add('text-white');
    } else {
      previewChar.textContent = 'Nombre del personaje';
      previewChar.classList.add('italic', 'text-white/40');
      previewChar.classList.remove('text-white');
    }
  }

  // Obra / Franquicia
  if (previewSeries) {
    previewSeries.textContent = seriesName || 'Obra / Franquicia';
  }

  // Imagen y Origen
  if (suggestionState.mode === 'file') {
    if (suggestionState.selectedFileObjectUrl) {
      if (previewImg) {
        previewImg.src = suggestionState.selectedFileObjectUrl;
        previewImg.classList.remove('hidden');
      }
      if (placeholder) placeholder.classList.add('hidden');
      if (previewOrigin) previewOrigin.textContent = `Archivo: ${formatFileSize(suggestionState.selectedFile.size)}`;
    } else {
      if (previewImg) previewImg.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=preview';
      if (previewOrigin) previewOrigin.textContent = 'Sin imagen elegida';
    }
  } else {
    // Modo URL
    const url = suggestionState.urlValue.trim();
    if (url) {
      if (previewImg) {
        previewImg.src = url;
        previewImg.classList.remove('hidden');
      }
      if (previewOrigin) previewOrigin.textContent = 'Enlace directo URL';
    } else {
      if (previewImg) previewImg.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=preview';
      if (previewOrigin) previewOrigin.textContent = 'Sin URL ingresada';
    }
  }
}

/**
 * Muestra mensaje de error en el formulario.
 */
function showFormError(msg) {
  const errorBox = document.getElementById('avatarSuggestionFormError');
  const errorText = document.getElementById('avatarSuggestionFormErrorText');
  if (errorText) errorText.textContent = msg;
  if (errorBox) errorBox.classList.remove('hidden');
}

/**
 * Oculta el mensaje de error del formulario.
 */
function hideFormError() {
  const errorBox = document.getElementById('avatarSuggestionFormError');
  if (errorBox) errorBox.classList.add('hidden');
}

/**
 * Valida los datos y pasa a la vista de confirmación explícita.
 */
function proceedToConfirmation() {
  hideFormError();

  const charName = suggestionState.characterName.trim();
  const seriesName = suggestionState.seriesName.trim();

  if (!charName) {
    showFormError('Por favor ingresa el nombre del personaje.');
    document.getElementById('inputAvatarSuggestionCharName')?.focus();
    return;
  }

  if (!seriesName) {
    showFormError('Por favor ingresa la obra o serie a la que pertenece el personaje.');
    document.getElementById('inputAvatarSuggestionSeriesName')?.focus();
    return;
  }

  if (suggestionState.mode === 'file') {
    if (!suggestionState.selectedFile) {
      showFormError('Por favor selecciona una imagen para subir.');
      return;
    }
  } else {
    const url = suggestionState.urlValue.trim();
    if (!url || !url.startsWith('http')) {
      showFormError('Por favor ingresa una URL válida (http:// o https://).');
      document.getElementById('inputAvatarSuggestionUrl')?.focus();
      return;
    }
  }

  // Verificar cooldown
  const remainingCooldown = getRemainingCooldownSeconds();
  const noticeBox = document.getElementById('avatarSuggestionConfirmNotice');
  const noticeText = document.getElementById('avatarSuggestionConfirmNoticeText');
  const btnSend = document.getElementById('btnConfirmAndSendToDiscord');

  if (remainingCooldown > 0) {
    if (noticeBox) noticeBox.classList.remove('hidden');
    if (noticeText) noticeText.textContent = `Debes esperar ${remainingCooldown} segundos antes de enviar otra sugerencia.`;
    if (btnSend) {
      btnSend.disabled = true;
      btnSend.classList.add('opacity-50', 'pointer-events-none');
    }
  } else {
    if (noticeBox) noticeBox.classList.add('hidden');
    if (btnSend) {
      btnSend.disabled = false;
      btnSend.classList.remove('opacity-50', 'pointer-events-none');
    }
  }

  // Poblar datos de la tarjeta de confirmación final
  const finalImg = document.getElementById('avatarConfirmFinalImg');
  const finalChar = document.getElementById('avatarConfirmFinalChar');
  const finalSeries = document.getElementById('avatarConfirmFinalSeries');
  const finalOrigin = document.getElementById('avatarConfirmFinalOrigin');

  if (finalChar) finalChar.textContent = charName;
  if (finalSeries) finalSeries.textContent = seriesName;

  if (suggestionState.mode === 'file') {
    if (finalImg) finalImg.src = suggestionState.selectedFileObjectUrl;
    if (finalOrigin) finalOrigin.textContent = `Archivo: ${suggestionState.selectedFile.name} (${formatFileSize(suggestionState.selectedFile.size)})`;
  } else {
    if (finalImg) finalImg.src = suggestionState.urlValue.trim();
    if (finalOrigin) finalOrigin.textContent = `Enlace: ${suggestionState.urlValue.trim()}`;
  }

  switchView('confirm');
}

/**
 * Envía la sugerencia al Webhook de Discord.
 */
async function sendSuggestionToDiscord() {
  if (suggestionState.isSending) return;

  const webhookUrl = await getWebhookUrl();
  const remainingCooldown = getRemainingCooldownSeconds();

  if (remainingCooldown > 0) {
    alert(`Por favor espera ${remainingCooldown} segundos antes de enviar otra sugerencia.`);
    return;
  }

  if (!webhookUrl) {
    alert(
      'Aviso: El Webhook de Discord no está configurado en este entorno local.\n\n' +
      'En GitHub Pages (producción) se inyectará automáticamente con los secretos del repositorio.\n' +
      'Para probar en local, puedes abrir la consola y ejecutar:\n' +
      "localStorage.setItem('nuvio_dev_webhook_url', 'TU_URL_DE_WEBHOOK');"
    );
    return;
  }

  suggestionState.isSending = true;

  const btnSend = document.getElementById('btnConfirmAndSendToDiscord');
  const iconSend = document.getElementById('iconConfirmSend');
  const textSend = document.getElementById('textConfirmSend');
  const btnBack = document.getElementById('btnBackToSuggestionForm');

  if (btnSend) {
    btnSend.disabled = true;
    btnSend.classList.add('opacity-75');
  }
  if (btnBack) btnBack.disabled = true;
  if (iconSend) iconSend.className = 'fa-solid fa-spinner fa-spin text-[10px]';
  if (textSend) textSend.textContent = 'Enviando a Discord...';

  try {
    const charName = suggestionState.characterName.trim();
    const seriesName = suggestionState.seriesName.trim();

    if (suggestionState.mode === 'file') {
      const file = suggestionState.selectedFile;
      const fileExt = file.name.split('.').pop() || 'png';
      const safeFilename = `avatar_suggestion_${Date.now()}.${fileExt}`;

      const embedPayload = {
        username: 'Nuvio Avatar Bot',
        avatar_url: 'https://raw.githubusercontent.com/Svein05/NuvioLatinoSetup/develop/assets/logo/logo.webp',
        embeds: [
          {
            title: '🎨 Nueva Sugerencia de Avatar',
            description: 'Un usuario ha enviado una sugerencia para el catálogo de avatares.',
            color: 16766073, // #ffd479
            fields: [
              { name: '👤 Personaje', value: charName, inline: true },
              { name: '🎬 Obra / Franquicia', value: seriesName, inline: true },
              { name: '📤 Método', value: `Subida Directa (${file.name} • ${formatFileSize(file.size)})`, inline: false }
            ],
            image: {
              url: `attachment://${safeFilename}`
            },
            footer: {
              text: 'Nuvio Latino Setup • Aportes de la Comunidad'
            },
            timestamp: new Date().toISOString()
          }
        ]
      };

      const formData = new FormData();
      formData.append('payload_json', JSON.stringify(embedPayload));
      formData.append('files[0]', file, safeFilename);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok && response.status !== 204) {
        throw new Error(`Discord respondió con código HTTP ${response.status}`);
      }
    } else {
      // Modo URL directa
      const imageUrl = suggestionState.urlValue.trim();
      const payload = {
        username: 'Nuvio Avatar Bot',
        avatar_url: 'https://raw.githubusercontent.com/Svein05/NuvioLatinoSetup/develop/assets/logo/logo.webp',
        embeds: [
          {
            title: '🎨 Nueva Sugerencia de Avatar',
            description: 'Un usuario ha enviado una sugerencia para el catálogo de avatares.',
            color: 16766073, // #ffd479
            fields: [
              { name: '👤 Personaje', value: charName, inline: true },
              { name: '🎬 Obra / Franquicia', value: seriesName, inline: true },
              { name: '🔗 Enlace Original', value: imageUrl, inline: false }
            ],
            image: {
              url: imageUrl
            },
            footer: {
              text: 'Nuvio Latino Setup • Aportes de la Comunidad'
            },
            timestamp: new Date().toISOString()
          }
        ]
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok && response.status !== 204) {
        throw new Error(`Discord respondió con código HTTP ${response.status}`);
      }
    }

    // Registrar marca de tiempo de cooldown
    try {
      localStorage.setItem(STORAGE_KEY_COOLDOWN, Date.now().toString());
    } catch (_) {}

    // Limpiar formulario tras envío exitoso
    resetSuggestionForm();

    // Mostrar pantalla de éxito
    switchView('success');

  } catch (err) {
    console.error('Error al enviar sugerencia a Discord:', err);
    alert(`Ocurrió un error al enviar tu sugerencia a Discord:\n${err.message || err}\n\nPor favor intenta nuevamente.`);
  } finally {
    suggestionState.isSending = false;
    if (btnSend) {
      btnSend.disabled = false;
      btnSend.classList.remove('opacity-75');
    }
    if (btnBack) btnBack.disabled = false;
    if (iconSend) iconSend.className = 'fa-solid fa-paper-plane text-[10px]';
    if (textSend) textSend.textContent = 'Confirmar y Enviar';
  }
}

/**
 * Inicializa todos los event listeners del módulo de sugerencias de avatares.
 */
export function initAvatarSuggestionsUI() {
  // Precargar webhook URL en segundo plano si está disponible (.env local o producción)
  getWebhookUrl().catch(() => '');

  const triggers = document.querySelectorAll('.btn-open-avatar-suggestion, #btnOpenAvatarSuggestionModal');
  const btnClose = document.getElementById('btnCloseAvatarSuggestionModal');
  const btnCancel = document.getElementById('btnCancelAvatarSuggestion');
  const modal = document.getElementById('modalAvatarSuggestion');

  // Triggers para abrir el modal (desde cualquier vista o modal de avatares)
  triggers.forEach(btn => {
    if (btn && btn.dataset.bound !== 'true') {
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => {
        // Si el modal de franquicias está abierto, cerrarlo suavemente
        const modalFranchises = document.getElementById('modalAvatarFranchises');
        if (modalFranchises) {
          modalFranchises.classList.add('hidden');
          modalFranchises.classList.remove('flex');
        }
        openAvatarSuggestionModal();
      });
    }
  });

  // Botones de cierre
  [btnClose, btnCancel].forEach(btn => {
    if (btn && btn.dataset.bound !== 'true') {
      btn.dataset.bound = 'true';
      btn.addEventListener('click', closeAvatarSuggestionModal);
    }
  });

  // Cierre al pulsar backdrop
  if (modal && modal.dataset.bound !== 'true') {
    modal.dataset.bound = 'true';
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAvatarSuggestionModal();
    });
  }

  // Tecla Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
      closeAvatarSuggestionModal();
    }
  });

  // Selector de Modos (Archivo vs URL)
  const btnModeFile = document.getElementById('btnSuggestionModeFile');
  const btnModeUrl = document.getElementById('btnSuggestionModeUrl');

  if (btnModeFile && btnModeFile.dataset.bound !== 'true') {
    btnModeFile.dataset.bound = 'true';
    btnModeFile.addEventListener('click', () => setMode('file'));
  }

  if (btnModeUrl && btnModeUrl.dataset.bound !== 'true') {
    btnModeUrl.dataset.bound = 'true';
    btnModeUrl.addEventListener('click', () => setMode('url'));
  }

  // Manejo de Dropzone y Selección de Archivo
  const dropzone = document.getElementById('suggestionDropzone');
  const fileInput = document.getElementById('inputAvatarSuggestionFile');
  const btnRemoveFile = document.getElementById('btnRemoveSuggestionFile');

  if (dropzone && dropzone.dataset.bound !== 'true') {
    dropzone.dataset.bound = 'true';
    dropzone.addEventListener('click', () => fileInput?.click());

    // Drag & drop handlers
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('border-[#ffd479]', 'bg-white/[0.06]');
    });

    dropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-[#ffd479]', 'bg-white/[0.06]');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-[#ffd479]', 'bg-white/[0.06]');
      if (e.dataTransfer?.files?.length) {
        handleFileSelection(e.dataTransfer.files[0]);
      }
    });
  }

  if (fileInput && fileInput.dataset.bound !== 'true') {
    fileInput.dataset.bound = 'true';
    fileInput.addEventListener('change', (e) => {
      if (e.target.files?.length) {
        handleFileSelection(e.target.files[0]);
      }
    });
  }

  if (btnRemoveFile && btnRemoveFile.dataset.bound !== 'true') {
    btnRemoveFile.dataset.bound = 'true';
    btnRemoveFile.addEventListener('click', (e) => {
      e.stopPropagation();
      removeSelectedFile();
    });
  }

  // Input de URL
  const inputUrl = document.getElementById('inputAvatarSuggestionUrl');
  if (inputUrl && inputUrl.dataset.bound !== 'true') {
    inputUrl.dataset.bound = 'true';
    inputUrl.addEventListener('input', (e) => {
      suggestionState.urlValue = e.target.value;
      hideFormError();
      updateLivePreview();
    });
  }

  // Inputs de Personaje y Obra
  const inputChar = document.getElementById('inputAvatarSuggestionCharName');
  if (inputChar && inputChar.dataset.bound !== 'true') {
    inputChar.dataset.bound = 'true';
    inputChar.addEventListener('input', (e) => {
      suggestionState.characterName = e.target.value;
      hideFormError();
      updateLivePreview();
    });
  }

  const inputSeries = document.getElementById('inputAvatarSuggestionSeriesName');
  if (inputSeries && inputSeries.dataset.bound !== 'true') {
    inputSeries.dataset.bound = 'true';
    inputSeries.addEventListener('input', (e) => {
      suggestionState.seriesName = e.target.value;
      hideFormError();
      updateLivePreview();
    });
  }

  // Botón Continuar a Confirmación
  const btnProceed = document.getElementById('btnProceedToConfirmSuggestion');
  if (btnProceed && btnProceed.dataset.bound !== 'true') {
    btnProceed.dataset.bound = 'true';
    btnProceed.addEventListener('click', proceedToConfirmation);
  }

  // Botón Modificar / Volver
  const btnBack = document.getElementById('btnBackToSuggestionForm');
  if (btnBack && btnBack.dataset.bound !== 'true') {
    btnBack.dataset.bound = 'true';
    btnBack.addEventListener('click', () => switchView('form'));
  }

  // Botón Confirmar y Enviar
  const btnConfirmSend = document.getElementById('btnConfirmAndSendToDiscord');
  if (btnConfirmSend && btnConfirmSend.dataset.bound !== 'true') {
    btnConfirmSend.dataset.bound = 'true';
    btnConfirmSend.addEventListener('click', sendSuggestionToDiscord);
  }

  // Botón Cerrar en Pantalla de Éxito
  const btnCloseSuccess = document.getElementById('btnCloseSuggestionSuccess');
  if (btnCloseSuccess && btnCloseSuccess.dataset.bound !== 'true') {
    btnCloseSuccess.dataset.bound = 'true';
    btnCloseSuccess.addEventListener('click', closeAvatarSuggestionModal);
  }
}
