import { escapeHtml, safeImageUrl } from '../../../shared/ui/safe-markup.js';
export function setupProfilePopover({ root = document, onToggle } = {}) {
  const trigger = root.getElementById?.('btnAccountProfileTrigger');
  const popover = root.getElementById?.('accountProfilePopover');
  const chevron = root.getElementById?.('sidebarActiveChevron');

  if (!trigger || !popover || trigger.dataset.bound === 'true') return;
  trigger.dataset.bound = 'true';

  const togglePopover = (forceState = null) => {
    const isCurrentlyHidden = popover.classList.contains('hidden');
    const shouldShow = forceState !== null ? forceState : isCurrentlyHidden;

    if (shouldShow) {
      onToggle?.(true);
      popover.classList.remove('hidden');
      trigger.setAttribute('aria-expanded', 'true');
      chevron?.classList.add('rotate-180');
    } else {
      popover.classList.add('hidden');
      trigger.setAttribute('aria-expanded', 'false');
      chevron?.classList.remove('rotate-180');
    }
  };

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePopover();
  });

  document.addEventListener('click', (e) => {
    if (!popover.classList.contains('hidden') && !popover.contains(e.target) && !trigger.contains(e.target)) {
      togglePopover(false);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !popover.classList.contains('hidden')) {
      togglePopover(false);
    }
  });
}

export function renderProfilePopover({ root = document, state, resolveAvatarCdnUrl, onSelectProfile, onEditProfile }) {
  const list = root.getElementById?.('popoverProfilesList');
  const countBadge = root.getElementById?.('popoverProfileCount');
  const addContainer = root.getElementById?.('popoverAddProfileContainer');
  if (!list) return;

  const profiles = state.profiles || [];
  if (countBadge) countBadge.textContent = `${profiles.length}/6`;
  if (addContainer?.classList?.toggle) {
    addContainer.classList.toggle('hidden', profiles.length >= 6);
  }

  list.innerHTML = profiles.map(p => {
    const id = Number(p.profile_index ?? p.id);
    const isSelected = id === Number(state.selectedProfileId);
    const avatarUrl = (resolveAvatarCdnUrl ? resolveAvatarCdnUrl(p.avatar_url) : p.avatar_url) || '/assets/logo/logo.webp';

    return `
      <div class="popover-profile-row ${isSelected ? 'is-active' : ''}" data-profile-id="${id}">
        <div class="flex items-center gap-2.5 min-w-0 flex-1 pointer-events-none">
          <img src="${escapeHtml(safeImageUrl(avatarUrl))}" alt="${escapeHtml(p.name)}" class="w-7 h-7 rounded-full border border-white/20 bg-black/40 object-cover shrink-0" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=Nuvio'">
          <div class="min-w-0 flex-1">
            <div class="text-xs font-semibold text-white truncate profile-row-name">${escapeHtml(p.name)}</div>
          </div>
          ${isSelected ? '<i class="fa-solid fa-check text-xs text-[#ffd479] mr-1"></i>' : ''}
        </div>
        <button type="button" class="btn-popover-edit" data-id="${id}" title="Editar perfil">
          <i class="fa-solid fa-pencil text-[11px] pointer-events-none"></i>
        </button>
      </div>
    `;
  }).join('');

  list.querySelectorAll?.('.popover-profile-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.btn-popover-edit')) return;
      const id = row.dataset.profileId;
      if (id && Number(id) !== Number(state.selectedProfileId)) {
        onSelectProfile?.(id);
      }
      root.getElementById?.('accountProfilePopover')?.classList.add('hidden');
      root.getElementById?.('sidebarActiveChevron')?.classList.remove('rotate-180');
    });
  });

  list.querySelectorAll?.('.btn-popover-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      root.getElementById?.('accountProfilePopover')?.classList.add('hidden');
      root.getElementById?.('sidebarActiveChevron')?.classList.remove('rotate-180');
      onEditProfile?.(btn.dataset.id);
    });
  });
}

export function showSelectProfilePrompt({ root = document, state, resolveAvatarCdnUrl, onSelectProfile }) {
  const modal = root.getElementById?.('modalSelectProfilePrompt');
  const grid = root.getElementById?.('modalProfileCardsGrid');
  if (!modal || !grid) return;

  const profiles = state.profiles || [];
  grid.innerHTML = profiles.map(p => {
    const id = Number(p.profile_index ?? p.id);
    const isSelected = id === Number(state.selectedProfileId);
    const avatarUrl = (resolveAvatarCdnUrl ? resolveAvatarCdnUrl(p.avatar_url) : p.avatar_url) || '/assets/logo/logo.webp';
    return `
      <div class="p-4 rounded-2xl bg-white/[0.04] border ${isSelected ? 'border-[#ffd479] bg-white/[0.08]' : 'border-white/10'} hover:border-[#ffd479]/60 hover:bg-white/[0.08] transition-all cursor-pointer flex flex-col items-center gap-2.5 group select-none shadow-sm" data-profile-id="${id}">
        <div class="relative">
          <img src="${escapeHtml(safeImageUrl(avatarUrl))}" alt="${escapeHtml(p.name)}" class="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white/20 group-hover:border-[#ffd479] group-hover:scale-105 transition-all object-cover shadow-lg" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=Nuvio'">
          ${isSelected ? '<span class="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#ffd479] text-black text-[10px] flex items-center justify-center font-bold shadow-md"><i class="fa-solid fa-check"></i></span>' : ''}
        </div>
        <div class="text-center w-full">
          <h4 class="text-xs sm:text-sm font-semibold text-white group-hover:text-[#ffd479] transition-colors truncate max-w-[130px] mx-auto">${escapeHtml(p.name)}</h4>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('[data-profile-id]').forEach(card => {
    card.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      onSelectProfile?.(card.dataset.profileId);
    });
  });

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

export function closeSelectProfilePrompt(root = document) {
  const modal = root.getElementById?.('modalSelectProfilePrompt');
  modal?.classList.add('hidden');
  modal?.classList.remove('flex');
}
