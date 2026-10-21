export function showCompletionModal(root = document, { isManual = false, profileName = 'Principal', onRecordCompletion } = {}) {
  const modal = root.querySelector?.('#completionModal');
  const titleEl = root.querySelector?.('#completionModalTitle');
  const msgEl = root.querySelector?.('#completionModalMessage');
  const btnClose = root.querySelector?.('#btnCloseCompletionModal');

  if (!modal) return;

  if (isManual) {
    onRecordCompletion?.();
    if (titleEl) titleEl.innerText = '¡Archivos JSON Listos!';
    if (msgEl) {
      msgEl.innerHTML = `
        <p class="font-medium text-slate-200">¡Listo! Has copiado con éxito ambos archivos JSON (Colecciones y Metadata).</p>
        <p class="mt-1.5 text-slate-400">Ahora solo tienes que ingresar manualmente los JSON dentro de Nuvio en un nuevo perfil y agregar tus addons de Streams preferidos :D</p>
      `;
    }
  } else {
    if (titleEl) titleEl.innerText = '¡Configuración Exitosa!';
    if (msgEl) {
      msgEl.innerHTML = `
        <p class="font-medium text-slate-200">¡Listo! Todo debería estar correctamente importado y configurado en el perfil <strong class="text-brand-400 font-bold">"${profileName}"</strong> de tu cuenta Nuvio.</p>
        <p class="mt-1.5 text-slate-400">Ahora solo tienes que agregar tus addons de Streams preferidos :D</p>
      `;
    }
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  const closeModal = () => {
    modal.classList.remove('flex');
    modal.classList.add('hidden');
  };

  if (btnClose) btnClose.onclick = closeModal;
  modal.onclick = e => { if (e.target === modal) closeModal(); };
}
