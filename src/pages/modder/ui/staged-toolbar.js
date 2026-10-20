function updateUndoButton(btnUndo, totalChanges, lastAction) {
  if (!btnUndo) return;
  btnUndo.innerHTML = `
    <i class="fa-solid fa-rotate-left"></i>
    <span>Deshacer</span>
    <span class="${totalChanges > 0 ? '' : 'hidden'} text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-white/80 font-bold">${totalChanges}</span>
  `;
  btnUndo.disabled = totalChanges === 0;
  btnUndo.classList.toggle('opacity-40', totalChanges === 0);
  btnUndo.classList.toggle('cursor-not-allowed', totalChanges === 0);
  btnUndo.classList.toggle('opacity-100', totalChanges > 0);
  btnUndo.classList.toggle('cursor-pointer', totalChanges > 0);

  if (totalChanges === 0) {
    btnUndo.title = 'No hay cambios para deshacer';
  } else {
    let desc = 'último cambio';
    if (lastAction?.type === 'BATCH_UPLOAD') desc = `lote (${lastAction.files.length} avatares de ${lastAction.franchise})`;
    else if (lastAction?.type === 'UPDATE_AVATAR') desc = `edición de "${lastAction.newFilename || lastAction.avatar?.character}"`;
    else if (lastAction?.type === 'DELETE_AVATAR') desc = `eliminación de "${lastAction.avatar?.character || lastAction.avatarId}"`;
    btnUndo.title = `Deshacer ${desc}`;
  }
}

function updateSaveButton(btnSave, totalChanges) {
  if (!btnSave) return;
  btnSave.innerHTML = `
    <i class="fa-solid fa-cloud-arrow-up"></i>
    <span>Guardar Cambios</span>
    <span class="${totalChanges > 0 ? '' : 'hidden'} text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-400 text-black font-bold">${totalChanges}</span>
  `;
  btnSave.disabled = totalChanges === 0;
  btnSave.classList.toggle('opacity-40', totalChanges === 0);
  btnSave.classList.toggle('cursor-not-allowed', totalChanges === 0);
  btnSave.classList.toggle('opacity-100', totalChanges > 0);
  btnSave.classList.toggle('cursor-pointer', totalChanges > 0);
  btnSave.classList.toggle('bg-emerald-400', totalChanges > 0);
  btnSave.classList.toggle('text-black', totalChanges > 0);
  btnSave.title = totalChanges > 0
    ? `Publicar todos los ${totalChanges} cambio(s) en 1 solo commit de GitHub`
    : 'No hay cambios pendientes por guardar';
}

function updateStatusText(uploadStatusText, totalChanges, queueLength) {
  if (!uploadStatusText) return;
  if (queueLength > 0) {
    uploadStatusText.innerHTML = `<span class="text-white/80 font-medium">${queueLength} imagen(es) lista(s).</span>`;
  } else if (totalChanges > 0) {
    uploadStatusText.innerHTML = `<span class="text-amber-300 font-medium"><i class="fa-solid fa-clock-rotate-left mr-1"></i> Tienes ${totalChanges} cambio(s) acumulado(s). Pulsa 'Guardar Cambios' arriba a la derecha.</span>`;
  } else {
    uploadStatusText.textContent = 'Añade este lote a la lista de cambios pendientes para guardarlo junto con tus otras ediciones.';
  }
}

export function updateStagedToolbar(stagedState = { history: [] }, queueLength = 0) {
  if (typeof document === 'undefined') return;
  const total = stagedState.history.length;
  const last = stagedState.history[total - 1];

  updateUndoButton(document.getElementById('btnUndoChange'), total, last);
  updateSaveButton(document.getElementById('btnSaveAllChanges'), total);
  updateStatusText(document.getElementById('uploadStatusText'), total, queueLength);
}
