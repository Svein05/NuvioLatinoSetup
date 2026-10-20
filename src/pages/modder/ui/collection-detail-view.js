const CANONICAL_STYLES = [
  { id: 'NetflixStyle', name: 'Netflix Style' },
  { id: 'IconsStyle', name: 'Icons Style' },
  { id: 'MangaStyle', name: 'Manga Style' },
];

export function renderStyleFilterButtons({ collection, activeStyle, onToggleStyle = () => {} }) {
  const container = document.getElementById('detailStyleFiltersContainer');
  if (!container || !collection) return;

  const existingStyles = CANONICAL_STYLES.map(st => ({
    ...st,
    count: collection.avatars.filter(a => a.style === st.id).length,
  })).filter(st => st.count > 0);

  if (existingStyles.length <= 1) {
    container.innerHTML = existingStyles.map(st => `<span class="text-xs font-mono px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-white/70">${st.name} (${st.count} avatares)</span>`).join('');
    return;
  }

  container.innerHTML = existingStyles.map(st => {
    const isActive = activeStyle === st.id;
    const activeClasses = isActive
      ? 'bg-amber-400 text-black border-amber-400 font-semibold shadow-md shadow-amber-400/20'
      : 'bg-white/[0.05] hover:bg-white/[0.12] text-white/70 hover:text-white border-white/10';
    return `
      <button type="button" class="px-3.5 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-all cursor-pointer ${activeClasses}" data-style-filter="${st.id}">
        <span>${st.name}</span>
        <span class="text-[10px] font-mono px-1.5 py-0.2 rounded-full ${isActive ? 'bg-black/20 text-black font-bold' : 'bg-white/10 text-white/70'}">${st.count}</span>
      </button>
    `;
  }).join('');

  container.querySelectorAll('[data-style-filter]').forEach(btn => {
    btn.addEventListener('click', () => onToggleStyle(btn.dataset.styleFilter));
  });
}

function renderAvatarCard(av, override, resolveCdnUrl) {
  const isDeleted = override?.isDeleted;
  const isModified = override?.isModified;
  const displayFilename = override?.newFilename || av.fileName;
  const displayImg = override?.previewImgUrl || resolveCdnUrl(av.path);

  let cardClasses = 'lat-card p-3 flex flex-col items-center text-center gap-2 group transition-all cursor-pointer relative';
  let badgeHtml = '';

  if (isDeleted) {
    cardClasses += ' opacity-40 border-rose-500/60 bg-rose-950/20';
    badgeHtml = '<span class="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-600 text-white shadow"><i class="fa-solid fa-trash-can mr-1"></i>A eliminar</span>';
  } else if (isModified) {
    cardClasses += ' border-amber-400/70 bg-amber-950/10 shadow-lg shadow-amber-500/10';
    badgeHtml = '<span class="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-black shadow"><i class="fa-solid fa-pen-ruler mr-1"></i>Modificado</span>';
  } else {
    cardClasses += ' hover:border-amber-400/40';
  }

  return `
    <div class="${cardClasses}" data-avatar-id="${av.id}">
      ${badgeHtml}
      <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/5 border border-white/10 overflow-hidden relative flex items-center justify-center group-hover:scale-105 transition-transform">
        <img src="${displayImg}" alt="${displayFilename}" class="w-full h-full object-cover" loading="lazy">
      </div>
      <div class="w-full space-y-0.5">
        <h4 class="text-xs font-mono font-medium text-white truncate max-w-full" title="${displayFilename}">${displayFilename}</h4>
        <span class="inline-block text-[9px] text-amber-300/80 bg-amber-400/10 px-1.5 py-0.5 rounded font-mono truncate max-w-full">${av.styleName || av.style}</span>
      </div>
      <button type="button" class="mt-1 w-full py-1.5 text-[11px] rounded-xl sm:rounded-2xl ${isDeleted ? 'bg-rose-500/20 text-rose-300' : 'bg-white/5 hover:bg-amber-400 hover:text-black text-white/70'} font-medium transition-colors flex items-center justify-center gap-1.5">
        <i class="fa-solid ${isDeleted ? 'fa-rotate-left' : 'fa-pen-to-square'} text-[10px]"></i>
        <span>${isDeleted ? 'Desmarcar' : 'Editar'}</span>
      </button>
    </div>
  `;
}

export function renderCollectionAvatars({
  avatars = [],
  overrides = new Map(),
  resolveCdnUrl = () => '',
  onSelectAvatar = () => {},
  onRestoreAvatar = () => {},
}) {
  const grid = document.getElementById('catalogGrid');
  if (!grid) return;

  if (avatars.length === 0) {
    grid.innerHTML = '<div class="col-span-full py-16 text-center text-white/50 space-y-2"><i class="fa-solid fa-file-image text-3xl text-white/20"></i><p class="text-sm">No hay avatares que coincidan con la búsqueda en esta colección.</p></div>';
    return;
  }

  grid.innerHTML = avatars.map(av => renderAvatarCard(av, overrides.get(av.id), resolveCdnUrl)).join('');

  grid.querySelectorAll('[data-avatar-id]').forEach(card => {
    card.addEventListener('click', () => {
      const avatar = avatars.find(a => a.id === card.dataset.avatarId);
      if (!avatar) return;
      const override = overrides.get(avatar.id);
      if (override?.isDeleted) onRestoreAvatar(avatar);
      else onSelectAvatar(avatar);
    });
  });
}
