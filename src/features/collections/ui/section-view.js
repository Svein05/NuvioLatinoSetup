import { collectionAction } from './actions.js';
import { renderFolderCard } from './folder-card.js';

function renderSectionControls(sIndex, totalSections, sectionId) {
  const isFirst = sIndex === 0;
  const isLast = sIndex === totalSections - 1;
  const upBtn = isFirst
    ? 'disabled class="opacity-20 text-white/20 cursor-not-allowed p-1"'
    : 'class="hover:text-[#ffd479] text-white/60 hover:bg-white/10 rounded-lg p-1 transition-colors"';
  const downBtn = isLast
    ? 'disabled class="opacity-20 text-white/20 cursor-not-allowed p-1"'
    : 'class="hover:text-[#ffd479] text-white/60 hover:bg-white/10 rounded-lg p-1 transition-colors"';
  const topBtn = isFirst
    ? 'disabled class="opacity-20 text-white/20 cursor-not-allowed p-1 hidden sm:inline-block"'
    : 'class="hover:text-[#ffd479] text-white/40 hover:bg-white/10 rounded-lg p-1 transition-colors hidden sm:inline-block"';
  const bottomBtn = isLast
    ? 'disabled class="opacity-20 text-white/20 cursor-not-allowed p-1 hidden sm:inline-block"'
    : 'class="hover:text-[#ffd479] text-white/40 hover:bg-white/10 rounded-lg p-1 transition-colors hidden sm:inline-block"';

  return `
    <div class="flex items-center gap-1 text-xs no-drag shrink-0">
      <button type="button" ${collectionAction('moveSection', sIndex, -1)} ${upBtn} title="Subir sección una posición">
        <i class="fa-solid fa-chevron-up text-[11px]"></i>
      </button>
      <button type="button" ${collectionAction('moveSection', sIndex, 1)} ${downBtn} title="Bajar sección una posición">
        <i class="fa-solid fa-chevron-down text-[11px]"></i>
      </button>
      <button type="button" ${collectionAction('moveSectionExtreme', sIndex, 'top')} ${topBtn} title="Mover sección al cielo (primera posición)">
        <i class="fa-solid fa-angles-up text-[10px]"></i>
      </button>
      <button type="button" ${collectionAction('moveSectionExtreme', sIndex, 'bottom')} ${bottomBtn} title="Tirar sección al fondo (última posición)">
        <i class="fa-solid fa-angles-down text-[10px]"></i>
      </button>
      <button type="button" ${collectionAction('openSectionModal', sectionId)} class="lat-capsule-btn glass text-[11px] py-1 px-2.5 ml-0.5" title="Personalizar y editar filas de la sección">
        <i class="fa-solid fa-sliders text-[11px] text-[#ffd479]"></i>
        <span class="text-[11px] font-medium hidden sm:inline">Personalizar</span>
      </button>
    </div>
  `;
}

export function renderSectionView({ section, sIndex, totalSections, focusedFolder }) {
  const isSectionEnabled = section.enabled !== false;
  const folders = section.folders || [];
  const activeCount = folders.filter(f => f.enabled !== false).length;
  const eyeIcon = isSectionEnabled ? 'fa-eye text-[#ffd479]' : 'fa-eye-slash text-white/30';
  const containerBorder = isSectionEnabled ? 'border-white/10' : 'border-white/5 opacity-50';

  return `
    <div id="sectionContainer_${section.id}" data-section-index="${sIndex}" data-section-id="${section.id}" class="section-container bg-white/[0.02] border ${containerBorder} rounded-2xl p-4 transition-all backdrop-blur-[16px]">
      <div class="section-header flex items-center justify-between mb-3 px-1 rounded-lg" data-collection-header="${section.id}">
        <div class="section-drag-handle flex items-center gap-2 sm:gap-3 cursor-grab select-none min-w-0" title="Arrastra desde aquí para reordenar esta sección verticalmente">
          <span class="text-white/40 hover:text-[#ffd479] transition-colors p-1 hidden sm:inline-block" title="Arrastrar sección">
            <i class="fa-solid fa-grip-vertical text-xs"></i>
          </span>
          <button type="button" ${collectionAction('toggleSection', section.id)} class="no-drag text-white/50 hover:text-[#ffd479] transition-colors shrink-0" title="${isSectionEnabled ? 'Desactivar sección' : 'Activar sección'}">
            <i class="fa-solid ${eyeIcon}"></i>
          </button>
          <h3 ${collectionAction('openSectionModal', section.id)} class="no-drag text-xs sm:text-sm font-bold text-white/90 tracking-wide flex items-center gap-1.5 sm:gap-2 cursor-pointer hover:text-white transition-colors truncate" title="Haz click para personalizar esta sección">
            <span class="truncate">${section.title || section.id}</span>
            <span class="text-[10px] sm:text-[11px] font-mono text-white/40 font-normal shrink-0">(${activeCount}/${folders.length})</span>
          </h3>
        </div>

        ${renderSectionControls(sIndex, totalSections, section.id)}
      </div>

      <div id="carouselRail_${section.id}" data-section-id="${section.id}" class="flex gap-3 overflow-x-auto items-start pb-2 pt-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        ${folders.map((folder, fIndex) => renderFolderCard({
          section,
          folder,
          fIndex,
          totalFolders: folders.length,
          isFocused: focusedFolder && focusedFolder.id === folder.id,
        })).join('')}
      </div>
    </div>
  `;
}
