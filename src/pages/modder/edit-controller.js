import { convertToWebp, formatBytes, releasePreviewUrl } from '../../shared/media/image-converter.js';
import { showModderToast } from './ui/modder-toast.js';
import { closeEditModal } from './ui/edit-modal.js';
import { escapeHtml } from '../../shared/ui/safe-markup.js';

function bindModalReplacement(controller) {
  let replacementRequest = 0;
  for (const id of ['btnModalClose', 'btnModalCancel']) {
    document.getElementById(id)?.addEventListener('click', () => { replacementRequest++; });
  }
  document.getElementById('modalFileInput')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const request = ++replacementRequest;
    const avatarId = controller.modderState.selectedAvatarForEdit?.id;
    const isCurrent = () => request === replacementRequest && avatarId === controller.modderState.selectedAvatarForEdit?.id
      && !document.getElementById('editAvatarModal')?.classList.contains('hidden');
    const status = document.getElementById('modalEditStatus');
    if (status) status.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Convirtiendo reemplazo a WebP...';
    try {
      const converted = await convertToWebp(file, 0.90);
      if (!isCurrent()) { releasePreviewUrl(converted.previewUrl); return; }
      releasePreviewUrl(controller.modderState.editReplacementWebp?.previewUrl);
      controller.modderState.editReplacementWebp = converted;
      const previewImg = document.getElementById('modalReplacementImg');
      if (previewImg) previewImg.src = converted.previewUrl;
      document.getElementById('modalReplacementPreview')?.classList.remove('hidden');
      if (status) status.innerHTML = `<span class="text-emerald-400 font-medium">✓ Nueva imagen lista (${formatBytes(converted.webpSize)}).</span>`;
    } catch (err) {
      if (status && isCurrent()) status.innerHTML = `<span class="text-rose-400">Error: ${escapeHtml(err.message)}</span>`;
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
