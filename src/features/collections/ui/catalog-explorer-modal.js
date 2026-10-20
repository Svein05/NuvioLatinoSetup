import { resolveCatalogTitle } from '../model/catalog-title.js';

function renderReorderButtons(sectionId, folderId, idx, total) {
  const isFirst = idx === 0;
  const isLast = idx === total - 1;
  const upClass = isFirst
    ? 'w-6 h-6 rounded-lg flex items-center justify-center text-white/20 cursor-not-allowed'
    : 'w-6 h-6 rounded-lg flex items-center justify-center text-white/70 hover:text-[#ffd479] hover:bg-white/10 transition-colors';
  const downClass = isLast
    ? 'w-6 h-6 rounded-lg flex items-center justify-center text-white/20 cursor-not-allowed'
    : 'w-6 h-6 rounded-lg flex items-center justify-center text-white/70 hover:text-[#ffd479] hover:bg-white/10 transition-colors';
  const topClass = isFirst
    ? 'w-6 h-6 rounded-lg flex items-center justify-center text-white/20 cursor-not-allowed hidden sm:flex'
    : 'w-6 h-6 rounded-lg flex items-center justify-center text-white/40 hover:text-[#ffd479] hover:bg-white/10 transition-colors hidden sm:flex';
  const bottomClass = isLast
    ? 'w-6 h-6 rounded-lg flex items-center justify-center text-white/20 cursor-not-allowed hidden sm:flex'
    : 'w-6 h-6 rounded-lg flex items-center justify-center text-white/40 hover:text-[#ffd479] hover:bg-white/10 transition-colors hidden sm:flex';

  return `
    <div class="flex items-center gap-0.5 bg-white/[0.05] border border-white/10 rounded-xl p-0.5 no-drag">
      <button type="button" onclick="window.miniNuvioInstance.moveCatalog('${sectionId}', '${folderId}', ${idx}, -1)" ${isFirst ? 'disabled ' : ''}class="${upClass}" title="Subir catálogo una posición"><i class="fa-solid fa-chevron-up text-[10px]"></i></button>
      <button type="button" onclick="window.miniNuvioInstance.moveCatalog('${sectionId}', '${folderId}', ${idx}, 1)" ${isLast ? 'disabled ' : ''}class="${downClass}" title="Bajar catálogo una posición"><i class="fa-solid fa-chevron-down text-[10px]"></i></button>
      <button type="button" onclick="window.miniNuvioInstance.moveCatalogExtreme('${sectionId}', '${folderId}', ${idx}, 'top')" ${isFirst ? 'disabled ' : ''}class="${topClass}" title="Mover catálogo al cielo (primera posición)"><i class="fa-solid fa-angles-up text-[10px]"></i></button>
      <button type="button" onclick="window.miniNuvioInstance.moveCatalogExtreme('${sectionId}', '${folderId}', ${idx}, 'bottom')" ${isLast ? 'disabled ' : ''}class="${bottomClass}" title="Tirar catálogo al fondo (última posición)"><i class="fa-solid fa-angles-down text-[10px]"></i></button>
    </div>
  `;
}

export function renderCatalogCapsuleRow({ sectionId, folderId, source, idx, total, catalogMap }) {
  const catId = source.catalogId || source.id || '';
  const catMeta = catalogMap?.get(catId) || { name: source.title || catId, type: source.type };
  const displayTitle = resolveCatalogTitle(source, catalogMap) || source.title || catMeta.name || catId;
  const isTrakt = catId.startsWith('trakt.');
  const mediaType = source.type || catMeta.type || '';
  const typeLabel = mediaType === 'series' || mediaType === 'tv' ? 'Series' : mediaType === 'anime' ? 'Anime' : 'Películas';
  const traktNote = isTrakt ? '<span class="text-[#ffd479] font-medium font-sans">• Requiere login en Trakt</span>' : '';

  return `
    <div class="catalog-explorer-row p-3 bg-white/[0.03] border border-white/10 hover:border-white/20 rounded-2xl transition-colors flex flex-wrap items-center justify-between gap-3 backdrop-blur-[12px]" data-catalog-index="${idx}">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="flex items-center gap-1 shrink-0">
          <span class="catalog-drag-handle text-white/40 hover:text-[#ffd479] cursor-grab p-1 hidden sm:inline-block" title="Arrastra para reordenar este catálogo con el mouse"><i class="fa-solid fa-grip-vertical text-xs"></i></span>
          ${renderReorderButtons(sectionId, folderId, idx, total)}
        </div>
        <div class="min-w-0">
          <h4 class="text-xs font-bold text-white flex items-center gap-2 truncate"><i class="${isTrakt ? 'fa-solid fa-tv text-[#ffd479]' : 'fa-solid fa-film text-[#ffd479]'} shrink-0 text-xs"></i><span class="truncate">${displayTitle}</span></h4>
          <p class="text-[10px] text-white/40 font-mono truncate flex items-center gap-1.5 mt-0.5"><span>${catId}</span>${traktNote}</p>
        </div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0 no-drag">
        <span class="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-white/60 font-mono">${typeLabel}</span>
        <button type="button" onclick="window.miniNuvioInstance.renameCatalogInExplorer('${sectionId}', '${folderId}', ${idx})" class="lat-capsule-btn glass text-[10px] py-1 px-2.5" title="Renombrar este catálogo"><i class="fa-solid fa-pen-to-square text-[9px] text-[#ffd479]"></i><span>Renombrar</span></button>
        <button type="button" onclick="window.miniNuvioInstance.deleteCatalogInExplorer('${sectionId}', '${folderId}', ${idx})" class="px-2.5 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-colors" title="Quitar de esta colección"><i class="fa-solid fa-trash-can text-[9px]"></i><span>Quitar</span></button>
      </div>
    </div>
  `;
}

export function renderCatalogExplorerModal({ section, folder, sources, catalogMap }) {
  const cover = folder.coverImageUrl || folder.heroBackdropUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400';
  const capsulesHtml = sources.length === 0
    ? `<div class="p-8 text-center text-white/50"><i class="fa-solid fa-film text-3xl text-white/20 mb-2"></i><p class="text-sm">Esta colección no tiene catálogos activos asignados.</p><button type="button" onclick="window.miniNuvioInstance.openAddCatalogModal('${section.id}', '${folder.id}')" class="mt-3 lat-capsule-btn solid text-xs inline-flex items-center gap-1.5"><i class="fa-solid fa-plus"></i> Añadir Catálogo</button></div>`
    : sources.map((s, idx) => renderCatalogCapsuleRow({ sectionId: section.id, folderId: folder.id, source: s, idx, total: sources.length, catalogMap })).join('');

  return `
    <div id="catalogExplorerModal" class="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-[#08090c]/85 backdrop-blur-xl transition-opacity">
      <div class="bg-[#0b0d12]/95 border border-white/10 rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-[var(--shadow-lift)] backdrop-blur-[34px] flex flex-col max-h-[90vh] text-white/90">
        <div class="flex items-center justify-between border-b border-white/10 pb-3 mb-4 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl overflow-hidden border border-white/10 shrink-0 bg-black/60 shadow-sm"><img src="${cover}" alt="${folder.title}" class="w-full h-full object-cover"></div>
            <div>
              <h3 class="text-base sm:text-lg font-bold text-white flex items-center gap-2"><span>${folder.coverEmoji || '🎬'}</span><span>${folder.title}</span></h3>
              <p class="text-[11px] text-white/50">Sección: <span class="text-white/80 font-medium">${section.title || section.id}</span> • ${sources.length} catálogos en esta fila</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] text-white/80 border border-white/10 text-xs font-mono"><i class="fa-solid fa-layer-group text-[#ffd479]"></i> Gestor de Catálogos</span>
            <button type="button" onclick="window.miniNuvioInstance.closeModal()" class="text-white/50 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"><i class="fa-solid fa-xmark text-lg"></i></button>
          </div>
        </div>
        <div id="catalogExplorerBody" class="overflow-y-auto space-y-2.5 pr-1.5 scrollbar-thin scrollbar-thumb-white/10 flex-1">${capsulesHtml}</div>
        <div class="flex flex-wrap items-center justify-between gap-2 pt-4 mt-4 border-t border-white/10 shrink-0">
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" onclick="window.miniNuvioInstance.openAddCatalogModal('${section.id}', '${folder.id}')" class="lat-capsule-btn solid text-xs"><i class="fa-solid fa-plus text-[11px]"></i><span>Añadir Catálogo</span></button>
            <button type="button" onclick="window.miniNuvioInstance.openEditModal('${section.id}', '${folder.id}')" class="lat-capsule-btn glass text-xs"><i class="fa-solid fa-sliders text-[#ffd479]"></i><span>Personalizar Portadas y Logos</span></button>
          </div>
          <button type="button" onclick="window.miniNuvioInstance.closeModal()" class="lat-capsule-btn glass text-xs">Cerrar Explorador</button>
        </div>
      </div>
    </div>
  `;
}
