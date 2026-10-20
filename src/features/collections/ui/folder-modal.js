function bindPreviewListeners(doc) {
  const titleInput = doc.getElementById('editTitle');
  const emojiInput = doc.getElementById('editEmoji');
  const backdropInput = doc.getElementById('editBackdrop');

  titleInput?.addEventListener('input', (e) => {
    const el = doc.getElementById('editPreviewTitle');
    if (el) el.innerText = e.target.value || 'Título';
  });
  emojiInput?.addEventListener('input', (e) => {
    const el = doc.getElementById('editPreviewEmoji');
    if (el) el.innerText = e.target.value || '🎬';
  });
  backdropInput?.addEventListener('input', (e) => {
    const img = doc.getElementById('editPreviewBackdrop');
    if (img && e.target.value.trim()) img.src = e.target.value.trim();
  });
}

export function openFolderModalView({ sectionId, folder, modalContainer }) {
  const currentBackdrop = folder.heroBackdropUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200';
  const escapedTitle = (folder.title || '').replace(/"/g, '&quot;');

  modalContainer.innerHTML = `
    <div id="miniNuvioEditModal" class="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-[#08090c]/85 backdrop-blur-xl transition-opacity">
      <div class="bg-[#0b0d12]/95 border border-white/10 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-[var(--shadow-lift)] backdrop-blur-[34px] flex flex-col max-h-[90vh] text-white/90">
        <div class="flex justify-between items-center border-b border-white/10 pb-3 mb-3 sm:mb-4 shrink-0">
          <h3 class="text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate"><i class="fa-solid fa-sliders text-[#ffd479]"></i><span class="truncate">Diseño de Fila: ${folder.title}</span></h3>
          <button type="button" onclick="window.miniNuvioInstance.closeModal()" class="text-white/40 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors shrink-0"><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>
        <div class="overflow-y-auto space-y-3.5 pr-1 text-xs scrollbar-thin scrollbar-thumb-white/10 flex-1">
          <div class="relative w-full h-28 rounded-2xl overflow-hidden border border-white/10 bg-black/60 flex items-end p-3 shadow-md">
            <img id="editPreviewBackdrop" src="${currentBackdrop}" alt="Backdrop" class="absolute inset-0 w-full h-full object-cover opacity-40">
            <div class="absolute inset-0 bg-gradient-to-t from-[#08090c] via-[#08090c]/60 to-transparent"></div>
            <div class="relative z-10 flex items-center gap-2"><span id="editPreviewEmoji" class="text-lg">${folder.coverEmoji || '🎬'}</span><span id="editPreviewTitle" class="text-sm font-bold text-white drop-shadow truncate">${folder.title || 'Título'}</span></div>
          </div>
          <div><label class="block text-white/70 mb-1 font-semibold uppercase tracking-wider text-[10px]">Título (Español Latino)</label><input id="editTitle" type="text" value="${escapedTitle}" class="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white focus:outline-none focus:border-[#ffd479]"></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-white/70 mb-1 font-semibold uppercase tracking-wider text-[10px]">Emoji</label><input id="editEmoji" type="text" value="${folder.coverEmoji || '🎬'}" class="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white focus:outline-none focus:border-[#ffd479]"></div>
            <div><label class="block text-white/70 mb-1 font-semibold uppercase tracking-wider text-[10px]">Formato de Tarjeta</label><select id="editTileShape" class="w-full px-3 py-2 rounded-xl bg-[#0b0d12] border border-white/10 text-white focus:outline-none focus:border-[#ffd479]"><option value="LANDSCAPE" ${folder.tileShape === 'LANDSCAPE' ? 'selected' : ''}>Horizontal (16:9 Landscape)</option><option value="POSTER" ${folder.tileShape === 'POSTER' ? 'selected' : ''}>Vertical (2:3 Poster)</option></select></div>
          </div>
          <div><label class="block text-white/70 mb-1 font-semibold uppercase tracking-wider text-[10px]">Imagen de Portada (Cover URL)</label><input id="editCover" type="text" value="${folder.coverImageUrl || ''}" placeholder="https://..." class="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white font-mono text-[11px] focus:outline-none focus:border-[#ffd479]"></div>
          <div><label class="block text-white/70 mb-1 font-semibold uppercase tracking-wider text-[10px]">Fondo Cinemático (Backdrop URL)</label><input id="editBackdrop" type="text" value="${folder.heroBackdropUrl || ''}" placeholder="https://..." class="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white font-mono text-[11px] focus:outline-none focus:border-[#ffd479]"></div>
          <div><label class="block text-white/70 mb-1 font-semibold uppercase tracking-wider text-[10px]">Logo de Título (Logo URL opcional)</label><input id="editLogo" type="text" value="${folder.titleLogoUrl || ''}" placeholder="https://..." class="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white font-mono text-[11px] focus:outline-none focus:border-[#ffd479]"></div>
        </div>
        <div class="flex flex-wrap justify-between items-center gap-2 pt-3 mt-3 border-t border-white/10 shrink-0">
          <button type="button" onclick="window.miniNuvioInstance.openCatalogExplorer('${sectionId}', '${folder.id}')" class="lat-capsule-btn glass text-xs py-1.5 px-3"><i class="fa-solid fa-layer-group text-[#ffd479]"></i><span>Ver Catálogos</span></button>
          <div class="flex items-center gap-2">
            <button type="button" onclick="window.miniNuvioInstance.closeModal()" class="lat-capsule-btn glass text-xs py-1.5 px-3 sm:px-4">Cancelar</button>
            <button type="button" onclick="window.miniNuvioInstance.saveEditModal()" class="lat-capsule-btn solid text-xs py-1.5 px-4 sm:px-5">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  bindPreviewListeners(document);
}

export function readFolderModalData(doc = document) {
  return {
    title: doc.getElementById('editTitle')?.value?.trim() || '',
    coverEmoji: doc.getElementById('editEmoji')?.value?.trim() || '🎬',
    tileShape: doc.getElementById('editTileShape')?.value || 'LANDSCAPE',
    coverImageUrl: doc.getElementById('editCover')?.value?.trim() || '',
    heroBackdropUrl: doc.getElementById('editBackdrop')?.value?.trim() || '',
    titleLogoUrl: doc.getElementById('editLogo')?.value?.trim() || '',
  };
}
