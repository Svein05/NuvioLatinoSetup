import { escapeHtml } from '../../../shared/ui/safe-markup.js';
export function formatUserCount(num) {
  const n = Number(num) || 0;
  if (n < 1000) return String(n);
  if (n < 1000000) {
    const k = n / 1000;
    return (k % 1 === 0 || k >= 10 ? k.toFixed(0) : k.toFixed(1)).replace('.0', '') + 'k';
  }
  const m = n / 1000000;
  return (m % 1 === 0 || m >= 10 ? m.toFixed(0) : m.toFixed(1)).replace('.0', '') + 'm';
}

export function renderModalFranchisesList({ root = document, state, getFranchisesSummary, onSelectFranchise }) {
  const gridEl = root.getElementById?.('modalFranchisesListGrid');
  const labelEl = root.getElementById?.('avatarFranchiseDropdownLabel');
  const countEl = root.getElementById?.('avatarFranchiseDropdownCount');
  if (!getFranchisesSummary) return;

  const franchises = getFranchisesSummary(state.avatarFilters?.style || 'all');
  const currentFranchiseId = state.avatarFilters?.franchise || 'all';
  const activeItem = franchises.find(f => f.id === currentFranchiseId) || franchises[0];

  if (labelEl) labelEl.textContent = activeItem?.name || 'Todas las obras';
  if (countEl) countEl.textContent = activeItem?.count ?? 0;
  if (!gridEl) return;

  gridEl.innerHTML = franchises.map(f => {
    const isAct = f.id === currentFranchiseId;
    return `
      <button type="button" class="modal-franchise-card ${isAct ? 'is-selected' : ''}" data-franchise-id="${escapeHtml(f.id)}">
        <div class="flex items-center gap-2.5 min-w-0">
          <i class="fa-solid fa-masks-theater text-xs ${isAct ? 'text-[#ffd479]' : 'text-white/40'}"></i>
          <span class="truncate">${escapeHtml(f.name)}</span>
        </div>
        <span class="pill-badge">${f.count}</span>
      </button>
    `;
  }).join('');

  gridEl.querySelectorAll('.modal-franchise-card').forEach(item => {
    item.addEventListener('click', () => {
      onSelectFranchise?.(item.dataset.franchiseId);
    });
  });
}

export function renderAvatarStylePills({ root = document, state, getStylesSummary, onSelectStyle }) {
  const container = root.getElementById?.('avatarStyleFilterPills');
  if (!container || !getStylesSummary) return;

  const styles = getStylesSummary();
  const currentStyle = state.avatarFilters?.style || 'all';

  container.innerHTML = styles.map(s => {
    const isAct = s.id === currentStyle;
    return `
      <button type="button" class="style-pill-btn ${isAct ? 'is-active' : ''}" data-style-id="${escapeHtml(s.id)}">
        <span>${escapeHtml(s.name)}</span>
        <span class="pill-count">${s.count}</span>
      </button>
    `;
  }).join('');

  container.querySelectorAll('.style-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      onSelectStyle?.(btn.dataset.styleId);
    });
  });
}

function renderCard(av, { isSelected, cdnUrl, extraClass = '', badgeHtml = '' }) {
  return `
    <div class="netflix-avatar-card ${isSelected ? 'is-selected' : ''} ${extraClass}"
         data-avatar-path="${escapeHtml(av.path)}"
         data-avatar-name="${escapeHtml(av.character)}"
         title="${escapeHtml(av.character)} (${escapeHtml(av.franchiseName || '')})">
      <div class="relative w-full aspect-square">
        <div class="avatar-circle-wrap">
          <img src="${escapeHtml(cdnUrl)}" alt="${escapeHtml(av.character)}" class="avatar-card-img" loading="lazy" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=Nuvio'">
        </div>
        ${badgeHtml}
      </div>
      <span class="avatar-card-name-label">${escapeHtml(av.character)}</span>
    </div>
  `;
}

export function renderAvatarsCatalog({
  root = document,
  state,
  filterAvatars,
  resolveAvatarCdnUrl = u => u,
  onSelectAvatar,
  _onOpenFranchise,
  onResetFilters,
}) {
  const container = root.getElementById?.('avatarsCatalogContainer');
  if (!container || !filterAvatars) return;

  const filtered = filterAvatars(state.avatarFilters || {});
  const activeAvatar = state.selectedAvatarUrl || '';

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center bg-white/[0.02] border border-white/10 rounded-2xl max-w-md mx-auto my-6 space-y-3">
        <h4 class="text-sm font-semibold text-white">Sin avatares encontrados</h4>
        <button type="button" id="btnResetAvatarFilters" class="lat-capsule-btn glass text-xs py-2 px-4 text-[#ffd479]">
          Restablecer filtros
        </button>
      </div>
    `;
    container.querySelector('#btnResetAvatarFilters')?.addEventListener('click', () => onResetFilters?.());
    return;
  }

  container.innerHTML = `
    <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
      ${filtered.map(av => renderCard(av, {
        isSelected: av.path === activeAvatar,
        cdnUrl: resolveAvatarCdnUrl(av.path),
      })).join('')}
    </div>
  `;

  container.querySelectorAll('.netflix-avatar-card').forEach(card => {
    card.addEventListener('click', () => onSelectAvatar?.(card.dataset.avatarPath));
  });
}
