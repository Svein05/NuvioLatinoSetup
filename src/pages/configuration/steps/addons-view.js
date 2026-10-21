import { wizardAction } from '../commands.js';
export function getAddonFallbackLogo(url = '', name = '') {
  const lowerUrl = String(url || '').toLowerCase();
  const lowerName = String(name || '').toLowerCase();
  if (lowerUrl.includes('aiostreams') || lowerName.includes('aiostreams')) return 'https://aiostreams.am/logo.png';
  if (lowerUrl.includes('lat-add') || lowerUrl.includes('latadd') || lowerName.includes('lat-add') || lowerName.includes('latadd')) return 'https://lat-add.midnightignite.me/logo.png';
  if (lowerUrl.includes('torrentio') || lowerName.includes('torrentio')) return 'https://torrentio.strem.fun/images/logo.png';
  if (lowerUrl.includes('torbox') || lowerName.includes('torbox')) return 'https://stremio.torbox.app/logo.png';
  if (lowerUrl.includes('cinetorrent') || lowerName.includes('cinetorrent')) return 'https://cinetorrent.midnightignite.me/logo.png';
  if (lowerUrl.includes('subtitles') || lowerName.includes('opensubtitles')) return 'https://www.opensubtitles.com/favicon.ico';
  return null;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderAddonLogo(addon, pos) {
  const isAioStreams = Boolean(addon.isAioStreams);
  const name = isAioStreams ? 'AIOStreams' : (addon.name || `Addon ${pos}`);
  const url = addon.manifest_url || addon.url || '';
  const logoUrl = isAioStreams ? 'https://numb3rs.stream/assets/images/aiostreams.svg' : (addon.logo || getAddonFallbackLogo(url, name));
  const initials = isAioStreams ? 'AS' : ((name.replace(/[^a-zA-Z0-9]/g, '') || 'AD').slice(0, 2).toUpperCase());

  if (logoUrl) {
    return `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(name)}" class="w-full h-full object-cover" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'w-full h-full flex items-center justify-center font-bold text-white/70 text-xs bg-white/[0.08]\\'>${escapeHtml(initials)}</div>';">`;
  }
  return `<div class="w-full h-full flex items-center justify-center font-bold text-white/70 text-xs bg-white/[0.08]">${escapeHtml(initials)}</div>`;
}

function renderAddonDetails(addon, debridsMap = {}) {
  if (addon.isAioStreams) {
    const activeDebrids = Object.keys(debridsMap).filter(k => debridsMap[k]);
    const debridsStr = activeDebrids.length > 0 ? activeDebrids.map(d => d.toUpperCase()).join(', ') : 'Sin debrids';
    return `
      <div class="min-w-0 flex-1">
        <h4 class="font-semibold text-sm sm:text-base text-white truncate">AIOStreams Latino</h4>
        <p class="text-[10px] sm:text-[11px] text-white/50 truncate mt-0.5">
          <span class="text-emerald-400 font-medium">Debrids: ${escapeHtml(debridsStr)}</span> • El manifiesto se generará con tu clave maestra en el Paso 7
        </p>
      </div>
    `;
  }
  const name = addon.name || 'Addon';
  const url = addon.manifest_url || addon.url || '';
  return `
    <div class="min-w-0 flex-1">
      <h4 class="font-semibold text-sm sm:text-base text-white truncate">${escapeHtml(name)}</h4>
      <p class="text-[10px] sm:text-[11px] font-mono text-white/40 truncate mt-0.5 select-all" title="${escapeHtml(url)}">
        ${escapeHtml(url || 'Sin URL de manifiesto')}
      </p>
    </div>
  `;
}

function renderAddonActions(addon, idx, total) {
  const isFirst = idx === 0;
  const isLast = idx === total - 1;
  const editBtn = addon.isAioStreams ? `
    <button type="button" ${wizardAction('openAioStreamsDebridsModal')} class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-white/60 hover:text-amber-300 hover:bg-white/[0.1] active:scale-95 border border-white/[0.08] flex items-center justify-center transition-all" title="Editar claves Debrid de AIOStreams">
      <i class="fa-solid fa-gear text-[11px]"></i>
    </button>
  ` : '';

  return `
    <div class="shrink-0 flex items-center gap-1.5">
      ${editBtn}
      <button type="button" ${wizardAction('moveAddon', idx, -1)} ${isFirst ? 'disabled' : ''} class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${isFirst ? 'opacity-20 cursor-not-allowed text-white/20' : 'text-white/60 hover:text-white hover:bg-white/[0.1] active:scale-95'} border border-white/[0.08] flex items-center justify-center transition-all" title="${isFirst ? 'No puede subir por encima de AIOMetadata' : 'Subir prioridad'}">
        <i class="fa-solid fa-chevron-up text-[10px]"></i>
      </button>
      <button type="button" ${wizardAction('moveAddon', idx, 1)} ${isLast ? 'disabled' : ''} class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${isLast ? 'opacity-20 cursor-not-allowed text-white/20' : 'text-white/60 hover:text-white hover:bg-white/[0.1] active:scale-95'} border border-white/[0.08] flex items-center justify-center transition-all" title="${isLast ? 'Último elemento de la lista' : 'Bajar prioridad'}">
        <i class="fa-solid fa-chevron-down text-[10px]"></i>
      </button>
      <button type="button" ${wizardAction('removeAddon', idx)} class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/15 active:scale-95 border border-white/[0.08] flex items-center justify-center transition-all ml-0.5" title="Eliminar addon de este perfil">
        <i class="fa-solid fa-trash-can text-[10px]"></i>
      </button>
    </div>
  `;
}

function renderPinnedAioMetadata() {
  return `
    <div class="p-3.5 sm:p-4 rounded-[20px] bg-white/[0.05] border-2 border-[#ffd479]/40 shadow-[0_0_20px_rgba(255,212,121,0.12)] flex items-center justify-between gap-3 select-none transition-all">
      <div class="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
        <span class="text-2xl sm:text-3xl font-mono font-bold text-[#ffd479] min-w-[2.5rem] sm:min-w-[3rem] text-center select-none shrink-0 tracking-tight">#1</span>
        <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/[0.06] border border-white/10 overflow-hidden flex items-center justify-center shrink-0 shadow-md">
          <img src="https://raw.githubusercontent.com/cedya77/aiometadata/main/assets/logo.png" alt="AIOMetadata" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='https://aiometadatafortheweebs.midnightignite.me/logo.png';">
        </div>
        <div class="min-w-0 flex-1">
          <h4 class="font-bold text-sm sm:text-base text-white truncate tracking-wide">AIOMetadata Latino</h4>
          <p class="text-[11px] sm:text-xs text-white/50 truncate mt-0.5">Addon Principal de Metadatos: catálogos, sinopsis, calificaciones y pósters en español latino.</p>
        </div>
      </div>
      <div class="shrink-0 flex items-center">
        <div class="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 text-white/40 flex items-center justify-center text-xs" title="AIOMetadata siempre permanece en la posición #1">
          <i class="fa-solid fa-lock text-[11px]"></i>
        </div>
      </div>
    </div>
  `;
}

export function renderAddonsContainer(root, { addons = [], aioDebrids = {} } = {}) {
  const container = root.querySelector ? root.querySelector('#addonsManagerContainer') : null;
  if (!container) return;

  let html = renderPinnedAioMetadata();

  if (addons.length > 0) {
    html += addons.map((addon, idx) => {
      const pos = idx + 2;
      return `
        <div class="p-3.5 sm:p-4 rounded-[18px] bg-white/[0.03] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.05] flex items-center justify-between gap-3 transition-all duration-150">
          <div class="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <span class="text-2xl sm:text-3xl font-mono font-bold text-white/40 min-w-[2.5rem] sm:min-w-[3rem] text-center select-none shrink-0 tracking-tight">#${pos}</span>
            <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/[0.06] border border-white/10 overflow-hidden flex items-center justify-center shrink-0 shadow-md">
              ${renderAddonLogo(addon, pos)}
            </div>
            ${renderAddonDetails(addon, addon.debrids || aioDebrids)}
          </div>
          ${renderAddonActions(addon, idx, addons.length)}
        </div>
      `;
    }).join('');
  } else {
    html += `
      <div class="py-8 px-4 rounded-[18px] bg-white/[0.02] border border-dashed border-white/10 text-center space-y-2 mt-2">
        <i class="fa-solid fa-circle-nodes text-2xl text-white/20"></i>
        <p class="text-xs text-white/60">No hay addons secundarios registrados en este perfil.</p>
        <p class="text-[11px] text-white/40 max-w-md mx-auto">Puedes agregar tus addons de streaming pulsando <strong class="text-white">"Agregar Addon"</strong>.</p>
      </div>
    `;
  }
  container.innerHTML = html;
}
