const DEFAULT_BACKDROP = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200';

function formatTypeBadges(folder) {
  const types = new Set();
  (folder.catalogSources || folder.sources || []).forEach(s => {
    if (s?.type) types.add(s.type);
  });
  return Array.from(types).map(t => {
    const label = t === 'movie' ? 'Películas' : t === 'series' ? 'Series' : t === 'anime' ? 'Anime' : t;
    return `<span class="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[10px] text-white/80 font-medium">${label}</span>`;
  }).join(' ');
}

export function renderHeroBanner(folder) {
  if (!folder) return '';

  const backdrop = folder.heroBackdropUrl || folder.coverImageUrl || DEFAULT_BACKDROP;
  const logo = folder.titleLogoUrl;
  const emoji = folder.coverEmoji || '🎬';
  const title = folder.title || 'Colección';
  const shape = folder.tileShape || 'LANDSCAPE';
  const typeBadges = formatTypeBadges(folder);
  const statusLabel = folder.enabled !== false
    ? '<span class="text-[#ffd479] font-medium">Activa en Nuvio</span>'
    : '<span class="text-white/30">Desactivada</span>';

  return `
    <div id="miniNuvioHeroBanner" class="relative w-full h-48 md:h-56 rounded-2xl overflow-hidden border border-white/10 shadow-[var(--shadow-lift)] bg-[#08090c] flex flex-col justify-end p-4 sm:p-6 transition-all duration-300">
      <img src="${backdrop}" alt="${title}" class="absolute inset-0 w-full h-full object-cover opacity-35 filter blur-[1px] scale-105 transition-all duration-500" onerror="this.src='${DEFAULT_BACKDROP}'">
      <div class="absolute inset-0 bg-gradient-to-t from-[#08090c] via-[#08090c]/70 to-transparent"></div>
      <div class="absolute inset-0 bg-gradient-to-r from-[#08090c]/90 via-[#08090c]/40 to-transparent"></div>

      <div class="relative z-10 space-y-2 max-w-xl">
        <div class="flex items-center gap-2">
          <span class="text-[10px] px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/20 font-mono tracking-wider">
            VISTA PREVIA ACTIVA
          </span>
          <span class="text-[10px] text-white/50 font-mono uppercase tracking-wider">
            Formato: ${shape}
          </span>
        </div>

        <div class="flex items-center gap-3">
          ${logo ? `<img src="${logo}" alt="${title}" class="h-8 max-w-[160px] object-contain drop-shadow-md">` : ''}
          <h2 class="text-xl md:text-2xl font-black text-white tracking-wide drop-shadow-md flex items-center gap-2">
            <span>${emoji}</span>
            <span>${title}</span>
          </h2>
        </div>

        <div class="flex items-center gap-2 pt-1">
          ${typeBadges || '<span class="text-[10px] text-white/40">Contenido Dinámico</span>'}
          <span class="text-xs text-white/50">• ${statusLabel}</span>
        </div>
      </div>
    </div>
  `;
}
