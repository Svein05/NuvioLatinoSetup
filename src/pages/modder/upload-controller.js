import { showModderToast } from './ui/modder-toast.js';
import { prepareModderBatch } from '../../features/avatars/index.js';
import { releasePreviewUrl } from '../../shared/media/image-converter.js';

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
    controller.modderState.filesQueue.forEach(item => releasePreviewUrl(item.previewUrl));
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

    let filesPayload;
    try {
      filesPayload = prepareModderBatch({ queue: controller.modderState.filesQueue, style, franchise,
        allAvatars: controller.getAvatars(), history: controller.stagedState.history,
        overrides: controller.stagedState.avatarOverrides });
    } catch (error) { showModderToast(error.message, 'error'); return; }

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
