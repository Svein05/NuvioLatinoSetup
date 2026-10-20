export function getCollectionPreviewLimit() {
  const grid = document.getElementById('collectionsGrid');
  const w = (typeof window !== 'undefined') ? (window.innerWidth || document.documentElement.clientWidth || 360) : 360;
  if (grid && grid.clientWidth > 0) {
    const isTwoCols = w >= 768;
    const cardWidth = isTwoCols ? (grid.clientWidth - 16) / 2 : grid.clientWidth;
    const innerWidth = cardWidth - (w < 640 ? 32 : 40);
    const slotWidth = w < 640 ? 46 : 52;
    const slots = Math.floor((innerWidth - 4) / slotWidth);
    return Math.max(4, Math.min(8, slots));
  }
  if (w < 420) return 4;
  if (w < 520) return 5;
  if (w < 1050) return 6;
  return 8;
}

function renderCollectionCard(col, maxSlots, overrides, resolveCdnUrl) {
  const avatarSlots = col.avatars.length <= maxSlots ? col.avatars : col.avatars.slice(0, maxSlots - 1);
  const extraCount = col.avatars.length <= maxSlots ? 0 : col.avatars.length - (maxSlots - 1);
  const hasPending = col.avatars.some(a => overrides.get(a.id)?.isModified || overrides.get(a.id)?.isDeleted);
  const pendingBadge = hasPending
    ? '<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-black shadow"><i class="fa-solid fa-clock-rotate-left mr-1"></i>Cambios</span>'
    : '';

  return `
    <div class="lat-card p-4 sm:p-5 flex flex-col justify-between gap-3 sm:gap-4 group hover:border-amber-400/50 hover:bg-white/[0.04] transition-all cursor-pointer relative" data-collection-id="${col.id}">
      <div class="flex items-start justify-between gap-2">
        <div class="space-y-1.5 text-left w-full min-w-0">
          <h4 class="text-base sm:text-lg font-bold text-white group-hover:text-amber-300 transition-colors truncate">${col.franchiseName}</h4>
          <div class="flex items-center gap-1.5 flex-wrap">
            ${col.availableStyles.map(st => `<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/70 border border-white/10">${st.name} <strong class="text-white/90">(${st.count})</strong></span>`).join('')}
            <span class="text-xs text-white/40 font-mono ml-auto"><strong class="text-white/90">${col.avatars.length}</strong> total</span>
          </div>
        </div>
        ${pendingBadge}
      </div>
      <div class="grid items-center gap-1.5 sm:gap-2 py-1 w-full" style="grid-template-columns: repeat(${maxSlots}, minmax(0, 1fr));">
        ${avatarSlots.map(av => {
          const ov = overrides.get(av.id);
          const imgUrl = ov?.previewImgUrl || resolveCdnUrl(av.path);
          const isDel = ov?.isDeleted;
          return `
            <div class="aspect-square w-full rounded-xl overflow-hidden bg-white/5 border ${isDel ? 'border-rose-500/60 opacity-40' : 'border-white/10'} relative group-hover:scale-105 transition-transform">
              <img src="${imgUrl}" alt="${av.fileName}" class="w-full h-full object-cover" loading="lazy">
            </div>
          `;
        }).join('')}
        ${extraCount > 0 ? `<div class="aspect-square w-full rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[11px] sm:text-xs font-mono text-white/70 font-bold hover:border-amber-400/40 hover:text-white transition-colors">+${extraCount}</div>` : ''}
      </div>
      <div class="pt-2 border-t border-white/5 flex items-center justify-end text-xs text-white/60 group-hover:text-white">
        <span class="text-amber-300 font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
          <span>Ingresar</span>
          <i class="fa-solid fa-arrow-right text-[10px]"></i>
        </span>
      </div>
    </div>
  `;
}

export function renderCollectionsGrid({
  collections = [],
  overrides = new Map(),
  resolveCdnUrl = () => '',
  onSelectCollection = () => {},
}) {
  const grid = document.getElementById('collectionsGrid');
  const countLabel = document.getElementById('catalogFilterCount');
  if (!grid) return;

  const totalAvatars = collections.reduce((acc, c) => acc + c.avatars.length, 0);
  if (countLabel) countLabel.textContent = `${collections.length} colecciones (${totalAvatars} avatares)`;

  if (collections.length === 0) {
    grid.innerHTML = '<div class="col-span-full py-16 text-center text-white/50 space-y-2"><i class="fa-solid fa-folder-open text-3xl text-white/20"></i><p class="text-sm">No se encontraron colecciones con los filtros actuales.</p></div>';
    return;
  }

  const maxSlots = getCollectionPreviewLimit();
  grid.innerHTML = collections.map(col => renderCollectionCard(col, maxSlots, overrides, resolveCdnUrl)).join('');

  grid.querySelectorAll('[data-collection-id]').forEach(card => {
    card.addEventListener('click', () => {
      const col = collections.find(c => c.id === card.dataset.collectionId);
      if (col) onSelectCollection(col);
    });
  });
}
