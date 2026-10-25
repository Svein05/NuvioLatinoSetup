function renderAvatarCard(av, selectedUrl, resolveCdnUrl) {
  const cdnUrl = resolveCdnUrl(av.path);
  const isSelected = selectedUrl && (selectedUrl === cdnUrl || selectedUrl === av.path);
  return `
    <div class="netflix-avatar-card ${isSelected ? 'is-selected' : ''}" data-avatar-path="${av.path}" data-avatar-name="${av.character}" title="${av.character} (${av.franchiseName || ''})">
      <div class="avatar-circle-wrap"><img src="${cdnUrl}" alt="${av.character}" class="avatar-card-img" loading="lazy" data-image-fallback="avatar"></div>
      <span class="avatar-card-name-label">${av.character}</span>
    </div>
  `;
}

function renderFranchisesModal(grid, franchises, currentId, onSelectFranchise) {
  grid.innerHTML = franchises.map(f => {
    const isAct = f.id === currentId;
    return `
      <button type="button" class="modal-franchise-card ${isAct ? 'is-selected' : ''}" data-franchise-id="${f.id}">
        <div class="flex items-center gap-2.5 min-w-0"><i class="fa-solid fa-masks-theater text-xs ${isAct ? 'text-[#ffd479]' : 'text-white/40'}"></i><span class="truncate">${f.name}</span></div>
        <span class="pill-badge">${f.count}</span>
      </button>
    `;
  }).join('');

  grid.querySelectorAll('.modal-franchise-card').forEach(btn => {
    btn.addEventListener('click', () => onSelectFranchise(btn.dataset.franchiseId));
  });
}

function renderAvatarsContainer({ container, filtered, selectedUrl, resolveCdnUrl, onPicked, closePicker }) {
  if (!container) return;
  if (!filtered.length) {
    container.innerHTML = '<div class="p-8 text-center text-white/50 text-xs">No hay avatares que coincidan con la búsqueda.</div>';
    return;
  }
  container.innerHTML = `<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">${filtered.map(av => renderAvatarCard(av, selectedUrl, resolveCdnUrl)).join('')}</div>`;
  container.querySelectorAll('.netflix-avatar-card').forEach(card => {
    card.addEventListener('click', () => {
      const url = resolveCdnUrl(card.dataset.avatarPath);
      onPicked(url);
      closePicker();
    });
  });
}

export function createWizardAvatarPicker({ loadCatalog, filterAvatarsList, getFranchises, resolveCdnUrl, onAvatarPicked }) {
  const filters = { franchise: 'all', query: '' };
  let selectedAvatarUrl = null;

  const updateFranchiseLabel = () => {
    const label = document.getElementById('wizardFranchiseLabel');
    const count = document.getElementById('wizardFranchiseCount');
    const cur = getFranchises('all').find(f => f.id === filters.franchise) || getFranchises('all')[0];
    if (label) label.textContent = cur?.name || 'Todas las obras';
    if (count) count.textContent = cur?.count ?? 0;
  };

  const closePicker = () => document.getElementById('modalWizardAvatarPicker')?.classList.replace('flex', 'hidden');
  const renderAvatars = () => renderAvatarsContainer({
    container: document.getElementById('wizardAvatarsCatalogContainer'),
    filtered: filterAvatarsList(filters),
    selectedUrl: selectedAvatarUrl,
    resolveCdnUrl,
    onPicked: (url) => { selectedAvatarUrl = url; onAvatarPicked(url); },
    closePicker,
  });

  return {
    openPicker: async () => {
      await loadCatalog();
      filters.franchise = 'all';
      filters.query = '';
      const input = document.getElementById('inputWizardAvatarSearch');
      if (input) input.value = '';
      updateFranchiseLabel();
      renderAvatars();
      document.getElementById('modalWizardAvatarPicker')?.classList.replace('hidden', 'flex');
    },
    closePicker,
    openFranchises: async () => {
      await loadCatalog();
      const grid = document.getElementById('wizardFranchisesListGrid');
      if (grid) renderFranchisesModal(grid, getFranchises('all'), filters.franchise, (fId) => {
        filters.franchise = fId;
        updateFranchiseLabel();
        document.getElementById('modalWizardFranchises')?.classList.replace('flex', 'hidden');
        renderAvatars();
      });
      document.getElementById('modalWizardFranchises')?.classList.replace('hidden', 'flex');
    },
    setFilterQuery: (q) => { filters.query = q; renderAvatars(); },
  };
}
