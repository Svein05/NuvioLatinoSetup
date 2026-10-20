import { escapeHtml, safeImageUrl } from '../../../shared/ui/safe-markup.js';
import { collectionAction } from './actions.js';
function renderFolderRowControls(secId, idx, total) {
  const isFirst = idx === 0;
  const isLast = idx === total - 1;
  const upClass = isFirst ? 'opacity-20 text-white/20 cursor-not-allowed p-1' : 'p-1 text-white/60 hover:text-white transition-colors';
  const downClass = isLast ? 'opacity-20 text-white/20 cursor-not-allowed p-1' : 'p-1 text-white/60 hover:text-white transition-colors';
  const topClass = isFirst ? 'opacity-20 text-white/20 cursor-not-allowed p-1 hidden sm:inline-block' : 'p-1 text-white/40 hover:text-[#ffd479] transition-colors hidden sm:inline-block';
  const bottomClass = isLast ? 'opacity-20 text-white/20 cursor-not-allowed p-1 hidden sm:inline-block' : 'p-1 text-white/40 hover:text-[#ffd479] transition-colors hidden sm:inline-block';

  return `
    <div class="flex items-center gap-0.5 shrink-0 bg-white/[0.05] border border-white/10 rounded-xl p-0.5">
      <button type="button" ${collectionAction('moveFolderInSection', secId, idx, -1)} ${isFirst ? 'disabled ' : ''}class="${upClass}" title="Subir"><i class="fa-solid fa-chevron-up text-[10px]"></i></button>
      <button type="button" ${collectionAction('moveFolderInSection', secId, idx, 1)} ${isLast ? 'disabled ' : ''}class="${downClass}" title="Bajar"><i class="fa-solid fa-chevron-down text-[10px]"></i></button>
      <button type="button" ${collectionAction('moveFolderInSectionExtreme', secId, idx, 'top')} ${isFirst ? 'disabled ' : ''}class="${topClass}" title="Mover al cielo"><i class="fa-solid fa-angles-up text-[10px]"></i></button>
      <button type="button" ${collectionAction('moveFolderInSectionExtreme', secId, idx, 'bottom')} ${isLast ? 'disabled ' : ''}class="${bottomClass}" title="Tirar al fondo"><i class="fa-solid fa-angles-down text-[10px]"></i></button>
    </div>
  `;
}

function renderSectionFolderRow(secId, f, idx, total) {
  const isEnabled = f.enabled !== false;
  const cover = f.coverImageUrl || f.heroBackdropUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400';
  const escapedTitle = (f.title || '').replace(/"/g, '&quot;');

  return `
    <div class="flex items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 bg-white/[0.02] border border-white/10 rounded-2xl hover:border-white/20 transition-colors">
      ${renderFolderRowControls(secId, idx, total)}
      <div class="w-9 h-6 sm:w-12 sm:h-8 rounded-lg sm:rounded-xl overflow-hidden shrink-0 border border-white/10 bg-black/60 cursor-pointer" ${collectionAction('openCatalogExplorer', secId, f.id)} title="Ver catálogos de esta fila">
        <img src="${escapeHtml(safeImageUrl(cover))}" alt="${escapeHtml(f.title)}" class="w-full h-full object-cover" data-fallback-src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400">
      </div>
      <div class="flex-1 min-w-0 pr-1 flex items-center gap-2">
        <span class="text-xs font-semibold text-white truncate block sm:hidden">${f.coverEmoji ? f.coverEmoji + ' ' : ''}${f.title || 'Colección'}</span>
        <input type="text" class="sec-folder-title-input hidden sm:block w-full px-2.5 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 focus:outline-none focus:border-[#ffd479] text-xs text-white" data-folder-id="${f.id}" value="${escapedTitle}" placeholder="Título de la fila">
        <span class="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-white/50 font-mono shrink-0 hidden sm:inline-block">${f.tileShape || 'LANDSCAPE'}</span>
      </div>
      <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button type="button" ${collectionAction('openCatalogExplorer', secId, f.id)} class="w-7 h-7 sm:w-auto lat-capsule-btn solid text-[10px] p-0 sm:py-1 sm:px-2.5 flex items-center justify-center shadow-sm" title="Ver y ordenar catálogos"><i class="fa-solid fa-layer-group text-[10px]"></i><span class="hidden sm:inline ml-1">Catálogos</span></button>
        <button type="button" ${collectionAction('openEditModal', secId, f.id)} class="w-7 h-7 sm:w-auto lat-capsule-btn glass text-[10px] p-0 sm:py-1 sm:px-2.5 flex items-center justify-center text-[#ffd479]" title="Personalizar diseño"><i class="fa-solid fa-sliders text-[10px]"></i><span class="hidden sm:inline ml-1 text-white">Diseño</span></button>
        <div class="no-drag cursor-pointer p-0.5 shrink-0" ${collectionAction('toggleFolder', secId, f.id)} title="${isEnabled ? 'Desactivar fila' : 'Activar fila'}">
          <div class="lat-folder-checkbox ${isEnabled ? 'checked' : ''}"><i class="fa-solid fa-check"></i></div>
        </div>
      </div>
    </div>
  `;
}

export function openSectionModalView({ section, modalContainer }) {
  const folders = section.folders || [];
  const escapedSecTitle = (section.title || section.id).replace(/"/g, '&quot;');
  const isChecked = section.enabled !== false ? 'checked' : '';

  modalContainer.innerHTML = `
    <div id="sectionEditModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#08090c]/85 backdrop-blur-xl transition-opacity">
      <div class="bg-[#0b0d12]/95 border border-white/10 rounded-2xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-[var(--shadow-lift)] backdrop-blur-[34px] flex flex-col max-h-[88vh] text-white/90">
        <div class="flex items-center justify-between border-b border-white/10 pb-3 mb-3 sm:mb-4 shrink-0">
          <div class="flex items-center gap-2 sm:gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-white/[0.06] text-[#ffd479] flex items-center justify-center border border-white/10 shrink-0"><i class="fa-solid fa-layer-group text-sm"></i></div>
            <div class="min-w-0"><h3 class="text-sm sm:text-base font-bold text-white truncate">Personalizar Sección</h3><p class="text-[10px] sm:text-[11px] text-white/50 truncate">Edita el nombre y el orden de sus filas</p></div>
          </div>
          <button type="button" ${collectionAction('closeModal')} class="text-white/40 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors shrink-0"><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>
        <div class="overflow-y-auto space-y-3 sm:space-y-4 pr-1 scrollbar-thin scrollbar-thumb-white/10 flex-1">
          <div class="bg-white/[0.03] border border-white/10 rounded-2xl p-3 sm:p-4 space-y-2.5 sm:space-y-3">
            <div><label class="block text-[10px] sm:text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-1">Nombre de la Sección en Nuvio</label><input id="secEditTitle" type="text" value="${escapedSecTitle}" class="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 focus:outline-none focus:border-[#ffd479] text-xs sm:text-sm text-white font-medium"></div>
            <div class="flex items-center justify-between pt-0.5"><span class="text-xs text-white/80">Mostrar esta sección en Nuvio</span><label class="lat-switch shrink-0" title="Mostrar esta sección"><input id="secEditEnabled" type="checkbox" ${isChecked}><span class="lat-switch-track"><span class="lat-switch-thumb"></span></span></label></div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-2"><label class="text-[10px] sm:text-[11px] font-semibold text-white/70 uppercase tracking-wider">Filas contenidas en esta Sección (${folders.length})</label><span class="text-[10px] text-white/40 font-mono hidden sm:inline">Reordena, renombra o explora pósters</span></div>
            <div class="space-y-2">${folders.map((f, idx) => renderSectionFolderRow(section.id, f, idx, folders.length)).join('')}</div>
          </div>
        </div>
        <div class="flex items-center justify-end gap-2 pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-white/10 shrink-0">
          <button type="button" ${collectionAction('closeModal')} class="lat-capsule-btn glass text-xs py-2 px-3 sm:px-4">Cancelar</button>
          <button type="button" ${collectionAction('saveSectionModal', section.id)} class="lat-capsule-btn solid text-xs py-2 px-4 sm:px-5"><i class="fa-solid fa-check mr-1"></i><span>Guardar Sección</span></button>
        </div>
      </div>
    </div>
  `;
}
