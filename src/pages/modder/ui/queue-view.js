import { escapeHtml } from '../../../shared/ui/safe-markup.js';
import { formatBytes } from '../../../shared/media/image-converter.js';

function computeSavingsBadge(originalSize, webpSize) {
  const savings = originalSize > 0 ? Math.round(((originalSize - webpSize) / originalSize) * 100) : 0;
  if (savings > 0) {
    return `<span class="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">-${savings}%</span>`;
  }
  return '<span class="text-[10px] text-white/50 font-mono">WebP</span>';
}

function renderQueueCard({ item, index, finalFilename, rawCharName, collisionError, currentStyle, currentFranchise }) {
  const savingsBadge = computeSavingsBadge(item.originalSize, item.webpSize);
  const conflictBadge = collisionError
    ? `<span class="text-[10px] text-rose-300 font-mono bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/30 flex items-center gap-1 font-semibold shrink-0" title="${escapeHtml(collisionError)}"><i class="fa-solid fa-triangle-exclamation text-rose-400"></i> ${escapeHtml(collisionError)}</span>`
    : '';

  return `
    <div class="lat-card p-3 sm:p-4 flex flex-row items-start sm:items-center gap-3 sm:gap-4 relative group ${collisionError ? 'border-rose-500/50 bg-rose-950/10' : ''}" data-queue-id="${item.id}">
      <div class="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-xl overflow-hidden bg-white/5 border ${collisionError ? 'border-rose-500/50' : 'border-white/10'} flex items-center justify-center">
        <img src="${item.previewUrl}" alt="${escapeHtml(finalFilename)}" class="w-full h-full object-cover">
      </div>
      <div class="flex-1 min-w-0 text-left space-y-1.5">
        <div class="flex flex-wrap items-center justify-between gap-1">
          <span class="text-[11px] sm:text-xs text-white/50 truncate max-w-[130px] sm:max-w-[200px]" title="${escapeHtml(item.originalName)}">Original: ${escapeHtml(item.originalName)}</span>
          <div class="flex items-center gap-1.5 shrink-0 flex-wrap">
            ${conflictBadge}
            <span class="text-[10px] sm:text-[11px] font-mono text-white/60">${formatBytes(item.originalSize)} ➔ <strong class="text-emerald-400">${formatBytes(item.webpSize)}</strong></span>
            ${savingsBadge}
          </div>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <label class="text-[10px] sm:text-[11px] text-white/60 shrink-0 font-medium">Nombre:</label>
          <div class="flex items-center gap-1 flex-1 min-w-0">
            <input type="text" value="${escapeHtml(rawCharName)}" class="lat-field text-xs py-1 px-2 flex-1 min-w-0 font-mono input-character-name ${collisionError ? 'border-rose-500/80 bg-rose-950/20 text-rose-200' : ''}" data-index="${index}" placeholder="ej: Asta_Demon">
            <span class="text-[10px] sm:text-xs font-mono text-white/40 shrink-0 px-2 py-1 bg-white/[0.05] border border-white/10 rounded-lg">.webp</span>
          </div>
        </div>
        <div class="text-[10px] font-mono text-white/40 truncate">
          Destino: <span class="text-amber-300/80 font-mono queue-destination-path" data-index="${index}">profile_icons/${escapeHtml(currentStyle || 'Estilo')}/${escapeHtml(currentFranchise || 'Obra')}/${escapeHtml(finalFilename)}</span>
        </div>
      </div>
      <button type="button" class="btn-remove-item p-1.5 sm:p-2 text-white/40 hover:text-rose-400 transition-colors cursor-pointer shrink-0 self-center" data-index="${index}" title="Eliminar de la cola">
        <i class="fa-solid fa-trash-can text-sm"></i>
      </button>
    </div>
  `;
}

export function renderQueueView({
  queue = [],
  currentStyle = '',
  currentFranchise = '',
  checkCollision = () => ({ hasCollision: false }),
  onNameChange = () => {},
  onRemoveItem = () => {},
  onCommitRender = () => {},
}) {
  const container = document.getElementById('queueContainer');
  const section = document.getElementById('queueSection');
  const countBadge = document.getElementById('queueCountBadge');
  const btnSubmit = document.getElementById('btnSubmitBatch');
  if (!container) return;

  if (queue.length === 0) {
    section?.classList.add('hidden');
    if (btnSubmit) btnSubmit.disabled = true;
    return;
  }

  section?.classList.remove('hidden');
  if (countBadge) countBadge.textContent = `${queue.length}`;

  let hasAnyCollision = false;
  container.innerHTML = queue.map((item, index) => {
    const rawCharName = (item.characterName || (item.fileName ? item.fileName.replace(/\.webp$/i, '') : 'avatar')).trim().replace(/\.webp$/i, '');
    const finalFilename = `${escapeHtml(rawCharName)}.webp`;
    const duplicateInQueue = queue.some((other, oIdx) => oIdx !== index && (other.characterName || '').toLowerCase() === rawCharName.toLowerCase());
    const folderCollision = (currentStyle && currentFranchise) ? checkCollision(finalFilename) : { hasCollision: false };
    const collisionError = duplicateInQueue ? 'Nombre repetido en esta cola' : folderCollision.hasCollision ? `Ya existe en ${currentStyle}/${currentFranchise}` : null;
    if (collisionError) hasAnyCollision = true;
    return renderQueueCard({ item, index, finalFilename, rawCharName, collisionError, currentStyle, currentFranchise });
  }).join('');

  if (btnSubmit) {
    btnSubmit.disabled = hasAnyCollision;
    btnSubmit.classList.toggle('opacity-40', hasAnyCollision);
    btnSubmit.classList.toggle('cursor-not-allowed', hasAnyCollision);
  }

  container.querySelectorAll('.input-character-name').forEach(input => {
    input.addEventListener('input', e => onNameChange(parseInt(e.target.dataset.index, 10), e.target.value));
    input.addEventListener('change', () => onCommitRender());
  });
  container.querySelectorAll('.btn-remove-item').forEach(btn => {
    btn.addEventListener('click', () => onRemoveItem(parseInt(btn.dataset.index, 10)));
  });
}
