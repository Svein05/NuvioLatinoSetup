let _publishLogLinesCount = 0;

export function appendPublishLog(type, message) {
  const consoleEl = document.getElementById('publishLogConsole');
  const counterEl = document.getElementById('publishLogCounter');
  if (!consoleEl) return;

  _publishLogLinesCount++;
  if (counterEl) counterEl.textContent = `${_publishLogLinesCount} eventos`;

  const now = new Date();
  const timeStr = [now.getHours(), now.getMinutes(), now.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');
  const colorClass = type === 'step' ? 'text-cyan-300 font-semibold' : type === 'success' ? 'text-emerald-400 font-semibold' : type === 'error' ? 'text-rose-400 font-semibold' : 'text-white/80';
  const iconHtml = type === 'step' ? '<i class="fa-solid fa-arrow-right text-cyan-400 mr-1.5 text-[10px]"></i>' : type === 'success' ? '<i class="fa-solid fa-circle-check text-emerald-400 mr-1.5 text-[10px]"></i>' : type === 'error' ? '<i class="fa-solid fa-circle-xmark text-rose-400 mr-1.5 text-[10px]"></i>' : '<i class="fa-solid fa-circle-info text-blue-400 mr-1.5 text-[10px]"></i>';

  const lineEl = document.createElement('div');
  lineEl.className = `flex items-start gap-1 leading-relaxed ${colorClass}`;
  lineEl.innerHTML = `<span class="text-white/30 shrink-0 font-mono text-[10px] select-none">[${timeStr}]</span> <span class="shrink-0">${iconHtml}</span> <span class="break-all">${message}</span>`;
  consoleEl.appendChild(lineEl);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

export function updatePublishProgress(percent, statusText) {
  const bar = document.getElementById('publishProgressBar');
  const percentEl = document.getElementById('publishProgressPercent');
  const statusEl = document.getElementById('publishProgressStatusText');

  if (bar) bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  if (percentEl) percentEl.textContent = `${Math.min(100, Math.max(0, percent))}%`;
  if (statusEl) {
    statusEl.innerHTML = percent >= 100
      ? `<i class="fa-solid fa-circle-check text-emerald-400"></i> <span>${statusText}</span>`
      : `<i class="fa-solid fa-spinner fa-spin text-amber-300"></i> <span>${statusText}</span>`;
  }
}

export function renderPublishBreakdown(items = [], ops = {}, onDiscardItem = () => {}) {
  const container = document.getElementById('publishStagedItemsList');
  const totalBadge = document.getElementById('confirmTotalOperationsBadge');
  const addedEl = document.getElementById('confirmAddedCount');
  const modifiedEl = document.getElementById('confirmModifiedCount');
  const deletedEl = document.getElementById('confirmDeletedCount');
  const btnConfirm = document.getElementById('btnConfirmPublish');

  const totalOps = (ops.addedFiles?.length || 0) + (ops.replacedFiles?.length || 0) + (ops.renamedFiles?.length || 0) + (ops.deletedFiles?.length || 0);
  if (addedEl) addedEl.textContent = ops.addedFiles?.length || 0;
  if (modifiedEl) modifiedEl.textContent = (ops.replacedFiles?.length || 0) + (ops.renamedFiles?.length || 0);
  if (deletedEl) deletedEl.textContent = ops.deletedFiles?.length || 0;
  if (totalBadge) totalBadge.textContent = `${totalOps} ${totalOps === 1 ? 'operación' : 'operaciones'}`;

  if (btnConfirm) {
    btnConfirm.disabled = totalOps === 0;
    btnConfirm.classList.toggle('opacity-40', totalOps === 0);
    btnConfirm.classList.toggle('cursor-not-allowed', totalOps === 0);
  }
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = '<div class="py-8 text-center text-white/40 space-y-2 bg-white/[0.02] border border-white/5 rounded-xl"><i class="fa-solid fa-circle-check text-2xl text-emerald-400/70"></i><p class="text-xs text-white/60">Todos los cambios han sido descartados o publicados.</p></div>';
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all group">
      <div class="w-10 h-10 rounded-xl bg-black/40 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
        <img src="${item.previewUrl}" alt="${item.primaryText}" class="w-full h-full object-cover" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=Nuvio'">
      </div>
      <div class="flex-1 min-w-0 space-y-0.5">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-mono font-medium text-white truncate max-w-[200px] sm:max-w-[280px] ${item.isStrikethrough ? 'line-through opacity-70 text-rose-300' : ''}" title="${item.primaryText}">${item.primaryText}</span>
          <span class="text-[9px] font-medium px-1.5 py-0.5 rounded-md border shrink-0 flex items-center gap-1 ${item.badgeClass}"><i class="${item.badgeIcon} text-[8px]"></i><span>${item.badgeLabel}</span></span>
        </div>
        <div class="text-[10px] text-white/40 font-mono truncate flex items-center gap-1.5"><span>${item.secondaryText}</span></div>
      </div>
      <button type="button" class="btn-discard-staged-item p-2 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0" data-item-key="${item.key}" title="Descartar este cambio"><i class="fa-solid fa-trash-can text-xs"></i></button>
    </div>
  `).join('');

  container.querySelectorAll('.btn-discard-staged-item').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); onDiscardItem(btn.dataset.itemKey); });
  });
}

export function showPublishSuccess(commitUrl, count, onClose) {
  document.getElementById('publishPhaseProgress')?.classList.add('hidden');
  document.getElementById('publishPhaseResult')?.classList.remove('hidden');
  const content = document.getElementById('publishResultContent');
  if (!content) return;

  content.innerHTML = `
    <div class="text-center space-y-4 py-2">
      <div class="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto text-2xl shadow-lg shadow-emerald-500/10"><i class="fa-solid fa-circle-check"></i></div>
      <div class="space-y-1"><h4 class="text-base sm:text-lg font-bold text-white">¡Cambios Publicados con Éxito!</h4><p class="text-xs text-white/60">Se sincronizaron <strong>${count}</strong> archivo(s) en GitHub en 1 único commit atómico.</p></div>
      ${commitUrl ? `<div class="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 text-xs"><span class="text-white/60 font-mono text-[11px] truncate">${commitUrl}</span><a href="${commitUrl}" target="_blank" rel="noopener noreferrer" class="lat-capsule-btn glass text-xs py-1.5 px-3 flex items-center gap-1.5 text-amber-300 hover:text-white shrink-0"><span>Ver en GitHub</span><i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i></a></div>` : ''}
      <button id="btnFinishPublish" type="button" class="lat-capsule-btn solid text-xs py-2 px-6 font-semibold mx-auto flex items-center gap-2"><i class="fa-solid fa-check"></i><span>Entendido y Cerrar</span></button>
    </div>
  `;
  document.getElementById('btnFinishPublish')?.addEventListener('click', onClose);
}

export function showPublishError(title, detail, onRetry, onClose) {
  document.getElementById('publishPhaseProgress')?.classList.add('hidden');
  document.getElementById('publishPhaseResult')?.classList.remove('hidden');
  const bar = document.getElementById('publishProgressBar');
  if (bar) bar.className = 'bg-gradient-to-r from-rose-500 to-rose-400 h-2 rounded-full transition-all duration-300 shadow-sm';
  const content = document.getElementById('publishResultContent');
  if (!content) return;

  content.innerHTML = `
    <div class="space-y-3.5 py-1 text-left">
      <div class="flex items-start gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
        <i class="fa-solid fa-triangle-exclamation text-base shrink-0 text-rose-400 mt-0.5"></i>
        <div class="space-y-1 min-w-0"><strong class="text-white block font-semibold">${title}</strong><p class="text-rose-200/80 leading-relaxed">${detail}</p></div>
      </div>
      <div class="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
        <button id="btnRetryPublish" type="button" class="lat-capsule-btn glass text-xs py-2 px-3.5 text-amber-300 border-amber-400/30 hover:border-amber-400/60 flex items-center gap-1.5"><i class="fa-solid fa-rotate-right"></i><span>Reintentar</span></button>
        <button id="btnClosePublishError" type="button" class="lat-capsule-btn outline text-xs py-2 px-4"><span>Cerrar y Conservar Cambios</span></button>
      </div>
    </div>
  `;
  document.getElementById('btnRetryPublish')?.addEventListener('click', onRetry);
  document.getElementById('btnClosePublishError')?.addEventListener('click', onClose);
}

export function resetPublishConsole() {
  _publishLogLinesCount = 0;
  const consoleEl = document.getElementById('publishLogConsole');
  if (consoleEl) consoleEl.innerHTML = '';
}
