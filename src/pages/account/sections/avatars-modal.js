function verifyDirectImageUrl(trimmed, { onLoaded, onError }) {
  if (typeof Image === 'undefined') return;
  const testImg = new Image();
  testImg.onload = () => onLoaded();
  testImg.onerror = () => onError();
  testImg.src = trimmed;
}

function resetConfirmModal(modal) {
  modal?.classList.add('hidden');
  modal?.classList.remove('flex');
  if (typeof document !== 'undefined') document.body.style.overflow = '';
}

export function setupAvatarUrlConfirmModal({ root = document, onConfirm, showToast }) {
  const urlInput = root.getElementById?.('inputAvatarUrlDirect');
  const modal = root.getElementById?.('modalConfirmAvatarUrl');
  const previewImg = root.getElementById?.('confirmAvatarUrlPreview');
  const loadingEl = root.getElementById?.('confirmAvatarUrlLoading');
  const statusSuccess = root.getElementById?.('confirmAvatarUrlStatusSuccess');
  const statusError = root.getElementById?.('confirmAvatarUrlStatusError');
  const btnAccept = root.getElementById?.('btnAcceptConfirmAvatarUrl');
  let pendingUrl = null;

  const closeModal = () => { resetConfirmModal(modal); pendingUrl = null; };

  const openModal = (rawUrl) => {
    const trimmed = (rawUrl || '').trim();
    if (!trimmed || (!/^https?:\/\//i.test(trimmed) && !/^data:image\//i.test(trimmed))) {
      showToast?.('Ingresa un enlace URL de imagen válido que comience con https:// o http://', 'error');
      return;
    }
    pendingUrl = trimmed;
    loadingEl?.classList.remove('hidden');
    statusSuccess?.classList.add('hidden');
    statusError?.classList.add('hidden');
    if (btnAccept) btnAccept.disabled = true;
    modal?.classList.remove('hidden');
    modal?.classList.add('flex');

    verifyDirectImageUrl(trimmed, {
      onLoaded: () => {
        if (pendingUrl !== trimmed) return;
        loadingEl?.classList.add('hidden');
        if (previewImg) { previewImg.src = trimmed; previewImg.classList.remove('hidden'); }
        statusSuccess?.classList.remove('hidden');
        if (btnAccept) btnAccept.disabled = false;
      },
      onError: () => {
        if (pendingUrl !== trimmed) return;
        loadingEl?.classList.add('hidden');
        previewImg?.classList.add('hidden');
        statusError?.classList.remove('hidden');
        if (btnAccept) btnAccept.disabled = true;
      },
    });
  };

  root.getElementById?.('btnApplyAvatarUrl')?.addEventListener('click', (e) => { e.preventDefault(); openModal(urlInput?.value); });
  root.getElementById?.('btnCloseConfirmAvatarUrlModal')?.addEventListener('click', closeModal);
  root.getElementById?.('btnCancelConfirmAvatarUrl')?.addEventListener('click', closeModal);
  btnAccept?.addEventListener('click', () => {
    if (pendingUrl) {
      onConfirm?.(pendingUrl);
      if (urlInput) urlInput.value = '';
      closeModal();
      showToast?.('✓ Avatar previsualizado. Pulsa "Guardar Cambios" para confirmar.', 'info');
    }
  });
}

export function setupFranchisesModal({ root = document }) {
  const triggerBtn = root.getElementById?.('btnTriggerAvatarFranchisesModal');
  const modal = root.getElementById?.('modalAvatarFranchises');
  const closeBtn = root.getElementById?.('btnCloseAvatarFranchisesModal');

  const closeModal = () => {
    modal?.classList.add('hidden');
    modal?.classList.remove('flex');
  };

  const openModal = () => {
    modal?.classList.remove('hidden');
    modal?.classList.add('flex');
  };

  triggerBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    openModal();
  });
  closeBtn?.addEventListener('click', closeModal);

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}
