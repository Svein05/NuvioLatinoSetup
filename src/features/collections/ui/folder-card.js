const DEFAULT_COVER = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400';

function renderCardReorderButtons(sectionId, fIndex, totalFolders) {
  const leftBtn = fIndex > 0 ? `
    <button type="button" onclick="event.stopPropagation(); window.miniNuvioInstance.moveFolder('${sectionId}', ${fIndex}, -1)" class="w-7 h-7 rounded-lg bg-black/75 hover:bg-[#ffd479] border border-white/25 hover:border-[#ffd479] text-white hover:text-black flex items-center justify-center text-[10px] shadow-sm backdrop-blur-md transition-all active:scale-90" title="Mover a la izquierda">
      <i class="fa-solid fa-chevron-left"></i>
    </button>` : '';
  const rightBtn = fIndex < totalFolders - 1 ? `
    <button type="button" onclick="event.stopPropagation(); window.miniNuvioInstance.moveFolder('${sectionId}', ${fIndex}, 1)" class="w-7 h-7 rounded-lg bg-black/75 hover:bg-[#ffd479] border border-white/25 hover:border-[#ffd479] text-white hover:text-black flex items-center justify-center text-[10px] shadow-sm backdrop-blur-md transition-all active:scale-90" title="Mover a la derecha">
      <i class="fa-solid fa-chevron-right"></i>
    </button>` : '';

  return `
    <div class="no-drag absolute top-2.5 left-2.5 z-20 flex md:hidden items-center gap-1 pointer-events-auto" onclick="event.stopPropagation()">
      ${leftBtn}${rightBtn}
    </div>
  `;
}

function renderCardHoverOverlay(sectionId, folderId) {
  return `
    <div class="card-hover-overlay absolute inset-0 bg-[#08090c]/85 backdrop-blur-[6px] hidden md:flex flex-col items-center justify-center gap-2 p-2 z-30 transition-opacity" onclick="event.stopPropagation()">
      <button onclick="window.miniNuvioInstance.openCatalogExplorer('${sectionId}', '${folderId}')" class="no-drag lat-capsule-btn solid text-[11px] py-1.5 px-3">
        <i class="fa-solid fa-layer-group text-[11px]"></i>
        <span>Ver Catálogos</span>
      </button>
      <button onclick="window.miniNuvioInstance.openEditModal('${sectionId}', '${folderId}')" class="no-drag lat-capsule-btn glass text-[11px] py-1 px-2.5" title="Personalizar diseño de fila">
        <i class="fa-solid fa-sliders text-[10px] text-[#ffd479]"></i>
        <span>Diseño</span>
      </button>
      <div class="text-[10px] text-white/50 font-medium flex items-center gap-1 mt-0.5 pointer-events-none">
        <i class="fa-solid fa-arrows-left-right text-[9px] text-[#ffd479]"></i>
        <span>Arrastra para ordenar</span>
      </div>
    </div>
  `;
}

export function renderFolderCard({ section, folder, fIndex, totalFolders, isFocused }) {
  const isEnabled = folder.enabled !== false && section.enabled !== false;
  const isLandscape = (folder.tileShape || 'LANDSCAPE') === 'LANDSCAPE';
  const sizeClasses = isLandscape ? 'w-48 sm:w-56 shrink-0 aspect-video' : 'w-32 sm:w-36 shrink-0 aspect-[2/3]';
  const borderClasses = isFocused
    ? 'border-2 border-[#ffd479] ring-2 ring-[#ffd479]/40 shadow-lg shadow-[#ffd479]/20'
    : isEnabled ? 'border border-white/10 hover:border-white/30' : 'border border-white/5 opacity-40';
  const imageSrc = folder.coverImageUrl || folder.focusGifUrl || folder.heroBackdropUrl || DEFAULT_COVER;

  return `
    <div 
      id="folderCard_${section.id}_${folder.id}"
      data-section-id="${section.id}"
      data-folder-index="${fIndex}"
      data-folder-id="${folder.id}"
      class="draggable-card group relative ${sizeClasses} rounded-2xl overflow-hidden ${borderClasses} bg-[#0b0d12] select-none cursor-grab"
      onmouseenter="window.miniNuvioInstance.focusFolder('${section.id}', '${folder.id}')"
      onclick="window.miniNuvioInstance.focusFolder('${section.id}', '${folder.id}')"
    >
      <img src="${imageSrc}" alt="${folder.title}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none" loading="lazy" onerror="this.src='${DEFAULT_COVER}'">
      <div class="absolute inset-0 bg-gradient-to-t from-[#08090c] via-[#08090c]/40 to-transparent pointer-events-none"></div>

      ${renderCardReorderButtons(section.id, fIndex, totalFolders)}

      <div class="no-drag absolute top-2.5 right-2.5 z-20 cursor-pointer p-0.5" onclick="event.stopPropagation(); window.miniNuvioInstance.toggleFolder('${section.id}', '${folder.id}')" onmousedown="event.stopPropagation()" onpointerdown="event.stopPropagation()" title="${isEnabled ? 'Desmarcar colección' : 'Activar colección'}">
        <div class="lat-folder-checkbox ${isEnabled ? 'checked' : ''}">
          <i class="fa-solid fa-check"></i>
        </div>
      </div>

      <div class="absolute bottom-2.5 left-2.5 right-2.5 z-10 pointer-events-none">
        <div class="text-xs font-semibold text-white drop-shadow truncate flex items-center gap-1.5">
          <span>${folder.coverEmoji || '🎬'}</span>
          <span class="truncate">${folder.title}</span>
        </div>
      </div>

      ${renderCardHoverOverlay(section.id, folder.id)}
    </div>
  `;
}
