import { convertToWebp, formatBytes } from '../shared/media/image-converter.js';
import { publishModderChanges } from '../workflows/publish-modder-changes.js';
import { showModderToast } from '../pages/modder/ui/modder-toast.js';
import { closeEditModal } from '../pages/modder/ui/edit-modal.js';
import {
  updatePublishProgress,
  appendPublishLog,
  showPublishSuccess,
  showPublishError,
  resetPublishConsole,
} from '../pages/modder/ui/publish-modal.js';

export function bindTabs(controller) {
  const tabUpload = document.getElementById('tabBtnUpload');
  const tabManage = document.getElementById('tabBtnManage');
  const secUpload = document.getElementById('sectionUpload');
  const secManage = document.getElementById('sectionManage');

  const switchTab = (tab) => {
    controller.modderState.activeTab = tab;
    const isUpload = tab === 'upload';
    tabUpload?.classList.toggle('bg-white/[0.12]', isUpload);
    tabUpload?.classList.toggle('text-white', isUpload);
    tabUpload?.classList.toggle('text-white/60', !isUpload);
    tabManage?.classList.toggle('bg-white/[0.12]', !isUpload);
    tabManage?.classList.toggle('text-white', !isUpload);
    tabManage?.classList.toggle('text-white/60', isUpload);
    secUpload?.classList.toggle('hidden', !isUpload);
    secManage?.classList.toggle('hidden', isUpload);
    if (!isUpload) controller.renderCatalog();
  };

  tabUpload?.addEventListener('click', () => switchTab('upload'));
  tabManage?.addEventListener('click', () => switchTab('manage'));
}

export function bindUploadInputs(controller, updateStep2) {
  const selectStyle = document.getElementById('selectStyle');
  selectStyle?.addEventListener('change', () => {
    controller.modderState.selectedStyle = selectStyle.value;
    updateStep2();
    controller.renderQueue();
  });

  const selectFranchise = document.getElementById('selectFranchise');
  const inputNewFranchise = document.getElementById('inputNewFranchise');
  selectFranchise?.addEventListener('change', () => {
    const isNew = selectFranchise.value === '__NEW__';
    controller.modderState.isNewFranchise = isNew;
    inputNewFranchise?.classList.toggle('hidden', !isNew);
    if (isNew) inputNewFranchise?.focus();
    else controller.modderState.selectedFranchise = selectFranchise.value;
    updateStep2();
    controller.renderQueue();
  });

  inputNewFranchise?.addEventListener('input', () => {
    updateStep2();
    controller.renderQueue();
  });
}

export function bindBatchQueueActions(controller, onIncomingFiles) {
  document.getElementById('fileInput')?.addEventListener('change', (e) => {
    onIncomingFiles(e.target.files);
    e.target.value = '';
  });

  document.getElementById('btnClearQueue')?.addEventListener('click', () => {
    controller.modderState.filesQueue = [];
    controller.renderQueue();
    controller.updateToolbar();
  });

  document.getElementById('btnSubmitBatch')?.addEventListener('click', () => {
    const style = controller.modderState.selectedStyle;
    const franchise = controller.modderState.isNewFranchise
      ? document.getElementById('inputNewFranchise')?.value.trim()
      : controller.modderState.selectedFranchise;
    if (!style || !franchise || controller.modderState.filesQueue.length === 0) return;

    const filesPayload = controller.modderState.filesQueue.map(item => ({
      filename: item.fileName.endsWith('.webp') ? item.fileName : `${item.fileName}.webp`,
      characterName: item.characterName,
      base64: item.base64,
      previewUrl: item.previewUrl,
      webpSize: item.webpSize,
    }));

    controller.stagedState.history.push({
      type: 'BATCH_UPLOAD',
      id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      style,
      franchise,
      files: filesPayload,
    });
    controller.modderState.filesQueue = [];
    controller.renderQueue();
    controller.updateToolbar();
    showModderToast(`✓ Lote de ${filesPayload.length} avatar(es) añadido.`, 'success');
  });
}

function bindModalReplacement(controller) {
  document.getElementById('modalFileInput')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const status = document.getElementById('modalEditStatus');
    if (status) status.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Convirtiendo reemplazo a WebP...';
    try {
      const converted = await convertToWebp(file, 0.90);
      controller.modderState.editReplacementWebp = converted;
      const previewImg = document.getElementById('modalReplacementImg');
      if (previewImg) previewImg.src = converted.previewUrl;
      document.getElementById('modalReplacementPreview')?.classList.remove('hidden');
      if (status) status.innerHTML = `<span class="text-emerald-400 font-medium">✓ Nueva imagen lista (${formatBytes(converted.webpSize)}).</span>`;
    } catch (err) {
      if (status) status.innerHTML = `<span class="text-rose-400">Error: ${err.message}</span>`;
    }
  });
}

function bindModalSaveAndDelete(controller) {
  document.getElementById('btnModalSave')?.addEventListener('click', () => {
    const avatar = controller.modderState.selectedAvatarForEdit;
    if (!avatar) return;
    const inputVal = (document.getElementById('modalCharacterInput')?.value || '').trim().replace(/\.webp$/i, '');
    const newFilename = `${inputVal}.webp`;
    const isReplacing = Boolean(controller.modderState.editReplacementWebp);
    const newBase64 = isReplacing ? controller.modderState.editReplacementWebp.base64 : null;
    const previous = controller.stagedState.avatarOverrides.get(avatar.id);

    controller.stagedState.avatarOverrides.set(avatar.id, {
      isDeleted: false,
      isModified: true,
      newCharacterName: inputVal,
      newFilename,
      newBase64: newBase64 || previous?.newBase64 || null,
      previewImgUrl: (newBase64 ? `data:image/webp;base64,${newBase64}` : null) || previous?.previewImgUrl || null,
    });
    controller.stagedState.history.push({
      type: 'UPDATE_AVATAR',
      id: `update_${Date.now()}`,
      avatarId: avatar.id,
      avatar,
      newFilename,
      newCharacterName: inputVal,
      newBase64,
      isReplacing,
      previousOverride: previous ? { ...previous } : null,
    });
    closeEditModal();
    controller.updateToolbar();
    controller.renderCatalog();
    showModderToast(`✓ Se modificó el archivo "${newFilename}".`, 'info');
  });

  document.getElementById('btnModalDelete')?.addEventListener('click', () => {
    const avatar = controller.modderState.selectedAvatarForEdit;
    if (!avatar) return;
    const previous = controller.stagedState.avatarOverrides.get(avatar.id);
    controller.stagedState.avatarOverrides.set(avatar.id, { isDeleted: true, isModified: false });
    controller.stagedState.history.push({
      type: 'DELETE_AVATAR',
      id: `delete_${Date.now()}`,
      avatarId: avatar.id,
      avatar,
      previousOverride: previous ? { ...previous } : null,
    });
    closeEditModal();
    controller.updateToolbar();
    controller.renderCatalog();
    showModderToast(`✓ Archivo "${avatar.fileName}" marcado para eliminar.`, 'info');
  });
}

export function bindEditModalEvents(controller) {
  document.getElementById('btnModalClose')?.addEventListener('click', closeEditModal);
  document.getElementById('btnModalCancel')?.addEventListener('click', closeEditModal);
  bindModalReplacement(controller);
  bindModalSaveAndDelete(controller);
}

export function bindPublishModalEvents(controller, { client, getAvatars, patchCatalog, renderBreakdown }) {
  const modal = document.getElementById('publishStagedModal');
  const openModal = () => {
    if (!controller.modderState.token) { showModderToast('Sesión no autorizada o expirada.', 'error'); return; }
    document.getElementById('publishPhaseConfirm')?.classList.remove('hidden');
    document.getElementById('publishPhaseProgress')?.classList.add('hidden');
    document.getElementById('publishPhaseResult')?.classList.add('hidden');
    renderBreakdown();
    modal?.classList.remove('hidden');
  };
  const closeModal = () => modal?.classList.add('hidden');

  document.getElementById('btnSaveAllChanges')?.addEventListener('click', openModal);
  document.getElementById('btnPublishModalClose')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelPublish')?.addEventListener('click', closeModal);
  document.getElementById('btnUndoChange')?.addEventListener('click', () => controller.undo());

  document.getElementById('btnConfirmPublish')?.addEventListener('click', async () => {
    document.getElementById('publishPhaseConfirm')?.classList.add('hidden');
    document.getElementById('publishPhaseProgress')?.classList.remove('hidden');
    resetPublishConsole();
    updatePublishProgress(10, 'Iniciando publicación...');
    try {
      const res = await publishModderChanges({
        client,
        stagedState: controller.stagedState,
        token: controller.modderState.token,
        email: controller.modderState.email,
        allAvatars: getAvatars(),
        onProgress: ({ percent, statusText, type, details }) => {
          updatePublishProgress(percent, statusText);
          appendPublishLog(type, details ? `${statusText} (${details})` : statusText);
        },
      });
      patchCatalog(res.operations);
      controller.stagedState.history = [];
      controller.stagedState.avatarOverrides.clear();
      controller.updateToolbar();
      controller.renderCatalog();
      showPublishSuccess(res.result?.commit, res.total, closeModal);
      showModderToast('✓ ¡Todos los cambios se guardaron con éxito!', 'success');
    } catch (err) {
      appendPublishLog('error', err.message);
      showPublishError('Error al publicar', err.message, () => document.getElementById('btnConfirmPublish')?.click(), closeModal);
    }
  });
}
