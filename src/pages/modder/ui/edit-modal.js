import { isAvatarPathSegment } from '../../../features/avatars/index.js';
import { escapeHtml } from '../../../shared/ui/safe-markup.js';

function updateModalFields({ avatar, currentOverride, resolveCdnUrl }) {
  const imgPreview = document.getElementById('modalAvatarPreview');
  const modalCharInput = document.getElementById('modalCharacterInput');
  const modalInfoStyle = document.getElementById('modalInfoStyle');
  const modalInfoFranchise = document.getElementById('modalInfoFranchise');
  const modalInfoPath = document.getElementById('modalInfoPath');
  const replacementPreview = document.getElementById('modalReplacementPreview');

  const activeFileName = currentOverride?.newFilename || avatar.fileName;
  const activeCharName = (currentOverride?.newCharacterName || avatar.characterName || activeFileName.replace(/\.webp$/i, '')).trim().replace(/\.webp$/i, '');
  const activeImgUrl = currentOverride?.previewImgUrl || resolveCdnUrl(avatar.path);

  if (imgPreview) imgPreview.src = activeImgUrl;
  if (modalCharInput) {
    modalCharInput.value = activeCharName;
    modalCharInput.classList.remove('border-rose-500/80');
  }
  if (modalInfoStyle) modalInfoStyle.textContent = avatar.style;
  if (modalInfoFranchise) modalInfoFranchise.textContent = avatar.franchise;
  if (modalInfoPath) modalInfoPath.textContent = avatar.path;
  if (replacementPreview) replacementPreview.classList.add('hidden');
}

export function openEditModal({
  avatar,
  currentOverride,
  resolveCdnUrl = () => '',
  checkCollision = () => ({ hasCollision: false }),
}) {
  const modal = document.getElementById('editAvatarModal');
  const modalCharInput = document.getElementById('modalCharacterInput');
  const modalStatus = document.getElementById('modalEditStatus');
  const btnSave = document.getElementById('btnModalSave');
  if (!modal || !avatar) return;

  updateModalFields({ avatar, currentOverride, resolveCdnUrl });

  const validateInput = () => {
    const rawVal = (modalCharInput?.value || '').trim().replace(/\.webp$/i, '');
    const candidateFilename = rawVal ? `${rawVal}.webp` : '';
    if (!isAvatarPathSegment(rawVal)) {
      if (modalStatus) modalStatus.innerHTML = '<span class="text-rose-400 font-medium">Escribe un nombre válido, sin rutas ni caracteres especiales.</span>';
      if (btnSave) { btnSave.disabled = true; btnSave.classList.add('opacity-40', 'cursor-not-allowed'); }
      return false;
    }
    const collision = checkCollision(candidateFilename);
    if (collision.hasCollision) {
      if (modalStatus) modalStatus.innerHTML = `<span class="text-rose-400 font-medium flex items-center justify-center gap-1.5"><i class="fa-solid fa-triangle-exclamation"></i> Ya existe "${escapeHtml(collision.conflictingFileName)}" en esta carpeta.</span>`;
      modalCharInput?.classList.add('border-rose-500/80');
      if (btnSave) { btnSave.disabled = true; btnSave.classList.add('opacity-40', 'cursor-not-allowed'); }
      return false;
    }
    modalCharInput?.classList.remove('border-rose-500/80');
    if (btnSave) { btnSave.disabled = false; btnSave.classList.remove('opacity-40', 'cursor-not-allowed'); }
    if (modalStatus) {
      modalStatus.innerHTML = currentOverride?.isModified ? '<span class="text-amber-300 font-medium"><i class="fa-solid fa-clock-rotate-left mr-1"></i> Este archivo ya tiene cambios pendientes.</span>' : '';
    }
    return true;
  };

  if (modalCharInput) modalCharInput.oninput = validateInput;
  validateInput();
  modal.classList.remove('hidden');
}

export function closeEditModal() {
  const modal = document.getElementById('editAvatarModal');
  const modalCharInput = document.getElementById('modalCharacterInput');
  const btnSave = document.getElementById('btnModalSave');
  if (modalCharInput) {
    modalCharInput.oninput = null;
    modalCharInput.classList.remove('border-rose-500/80');
  }
  if (btnSave) {
    btnSave.disabled = false;
    btnSave.classList.remove('opacity-40', 'cursor-not-allowed');
  }
  modal?.classList.add('hidden');
}
