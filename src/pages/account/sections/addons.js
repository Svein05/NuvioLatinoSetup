import { escapeHtml, safeImageUrl } from '../../../shared/ui/safe-markup.js';
export {
  isDuplicateManifestUrl,
  normalizeManifestUrl,
  getAddonFallbackLogo,
  fetchAddonManifestInfo,
} from './addons-manifest.js';

export {
  openAccountEditAddonModal,
  closeAccountEditAddonModal,
  saveAccountEditAddon,
  openAccountAddAddonModal,
  closeAccountAddAddonModal,
  confirmAccountAddAddon,
} from './addons-modals.js';

export {
  moveAddon,
  setupAddonsSortable,
} from './addons-sortable.js';

function buildAddonRowHtml(addon, idx, isFirst, isLast) {
  const isEnabled = addon.enabled !== false;
  return `
    <div class="p-3 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 group" data-index="${idx}">
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <i class="fa-solid fa-grip-vertical text-white/20 hover:text-white/60 cursor-grab active:cursor-grabbing sortable-drag-handle p-1"></i>
        <img src="${escapeHtml(safeImageUrl(addon.logo, `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(addon.name || 'Addon')}`))}" alt="${escapeHtml(addon.name)}" class="w-8 h-8 rounded-lg object-contain bg-black/40 border border-white/10 shrink-0">
        <div class="min-w-0 flex-1">
          <h5 class="text-xs sm:text-sm font-semibold text-white truncate">${escapeHtml(addon.name)}</h5>
          <span class="text-[11px] font-mono text-white/40 truncate block">${escapeHtml(addon.manifest_url || addon.url || '')}</span>
        </div>
        <span class="w-2 h-2 rounded-full shrink-0 ${isEnabled ? 'bg-emerald-400' : 'bg-rose-500'}"></span>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <button type="button" class="btn-move-up lat-capsule-btn glass text-xs py-1 px-2 ${isFirst ? 'opacity-20 cursor-not-allowed pointer-events-none' : ''}" data-index="${idx}" title="Subir">
          <i class="fa-solid fa-chevron-up text-[10px]"></i>
        </button>
        <button type="button" class="btn-move-down lat-capsule-btn glass text-xs py-1 px-2 ${isLast ? 'opacity-20 cursor-not-allowed pointer-events-none' : ''}" data-index="${idx}" title="Bajar">
          <i class="fa-solid fa-chevron-down text-[10px]"></i>
        </button>
        <button type="button" class="btn-edit-addon lat-capsule-btn glass text-xs py-1 px-2.5 text-white/80" data-index="${idx}" title="Editar">
          <i class="fa-solid fa-pen text-[10px]"></i>
        </button>
        <button type="button" class="btn-delete-addon lat-capsule-btn glass text-xs py-1 px-2.5 text-rose-400" data-index="${idx}" title="Eliminar">
          <i class="fa-regular fa-trash-can text-[11px]"></i>
        </button>
      </div>
    </div>
  `;
}

export function renderAddonsSection(state, { root = document, onEditAddon, onDeleteAddon, onMoveAddon } = {}) {
  const container = root.getElementById?.('accountAddonsListContainer');
  const countBadge = root.getElementById?.('accountAddonsCountLabel');
  if (!container) return;

  const addons = state.installedAddons || [];
  if (countBadge) countBadge.textContent = `${addons.length} addons instalados`;

  if (addons.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center bg-white/[0.02] border border-white/10 rounded-2xl max-w-md mx-auto my-6 space-y-3">
        <h4 class="text-sm font-semibold text-white">Sin addons instalados</h4>
        <p class="text-xs text-white/50">Agrega tus addons de Stremio favoritos para sincronizarlos con tu perfil.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = addons.map((addon, idx) => buildAddonRowHtml(addon, idx, idx === 0, idx === addons.length - 1)).join('');

  container.querySelectorAll('.btn-edit-addon').forEach(btn => {
    btn.addEventListener('click', () => onEditAddon?.(Number(btn.dataset.index)));
  });
  container.querySelectorAll('.btn-delete-addon').forEach(btn => {
    btn.addEventListener('click', () => onDeleteAddon?.(Number(btn.dataset.index)));
  });
  container.querySelectorAll('.btn-move-up').forEach(btn => {
    btn.addEventListener('click', () => onMoveAddon?.(Number(btn.dataset.index), -1));
  });
  container.querySelectorAll('.btn-move-down').forEach(btn => {
    btn.addEventListener('click', () => onMoveAddon?.(Number(btn.dataset.index), 1));
  });
}
