import { collectionAction } from './actions.js';
export function renderToolbar({ activeFolders = 0, totalFolders = 0 } = {}) {
  return `
    <div class="flex flex-wrap items-center justify-between gap-2.5 p-3 sm:p-3.5 bg-white/[0.04] border border-white/10 rounded-2xl backdrop-blur-[24px]">
      <div class="flex items-center gap-2">
        <span class="text-[11px] px-3 py-1 rounded-full bg-white/[0.06] text-[#ffd479] border border-white/10 font-mono font-bold tracking-wide">
          ${activeFolders}/${totalFolders} activas
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <button ${collectionAction('toggleAll', true)} class="lat-capsule-btn glass text-xs py-1 px-2.5 sm:px-3">
          <i class="fa-solid fa-check-double mr-1"></i> <span>Activar Todo</span>
        </button>
        <button ${collectionAction('toggleAll', false)} class="lat-capsule-btn glass text-xs py-1 px-2.5 sm:px-3">
          <i class="fa-solid fa-ban mr-1"></i> <span>Desactivar Todo</span>
        </button>
        <button ${collectionAction('resetDefaults')} class="lat-capsule-btn glass text-xs py-1 px-2.5 sm:px-3 text-[#ffd479] border-[#ffd479]/30 hover:border-[#ffd479]/60" title="Restaurar valores de plantilla">
          <i class="fa-solid fa-rotate-left mr-1"></i> Restaurar
        </button>
      </div>
    </div>
  `;
}
