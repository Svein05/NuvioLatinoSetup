import { renderAvatarsCatalog, renderAvatarStylePills, renderModalFranchisesList } from './avatars-catalog.js';
import { updateAvatarComparisonUI, setNewSelectedAvatar } from './avatars-comparison.js';
import { setupAvatarUrlConfirmModal } from './avatars-modal.js';
import { renderRankedAvatars } from './avatar-cards.js';

export function createAccountAvatars({ root, state, services, lifetime, notify, updateUI }) {
  const select = url => {
    if (state.isSaving || state.isLoadingProfile) return;
    setNewSelectedAvatar(url, {
      root, state, resolveCdn: services.resolveAvatarCdnUrl, updateUI,
      onDirty: (key, dirty) => { state.dirty[key] = dirty; },
    });
  };
  const closeFranchises = () => root.getElementById('modalAvatarFranchises')?.classList.replace('flex', 'hidden');
  const reset = () => { state.avatarFilters = { style: 'all', franchise: 'all', query: '' }; render(); };
  function render() {
    updateAvatarComparisonUI(root, state, services.resolveAvatarCdnUrl);
    renderAvatarStylePills({ root, state, getStylesSummary: services.getStylesSummary,
      onSelectStyle: style => { state.avatarFilters.style = style; state.avatarFilters.franchise = 'all'; render(); } });
    renderModalFranchisesList({ root, state, getFranchisesSummary: services.getFranchisesSummary,
      onSelectFranchise: franchise => { state.avatarFilters.franchise = franchise; closeFranchises(); render(); } });
    renderAvatarsCatalog({ root, state, filterAvatars: services.filterAvatars,
      resolveAvatarCdnUrl: services.resolveAvatarCdnUrl, onSelectAvatar: select, onResetFilters: reset,
      onOpenFranchise: franchise => { state.avatarFilters.franchise = franchise; render(); } });
    if (Object.values(state.avatarFilters).every(value => value === 'all' || value === '')) {
      const container = root.getElementById('avatarsCatalogContainer');
      const top = root.createElement('div');
      renderRankedAvatars(top, { avatars: services.getCompiledAvatars(), ranking: state.mostUsedKeys,
        resolveUrl: services.resolveAvatarCdnUrl, selectedUrl: state.selectedAvatarUrl, onSelect: select });
      container?.prepend(top);
    }
  }
  lifetime.on(root.getElementById?.('inputAvatarSearch'), 'input', event => {
    state.avatarFilters.query = event.target.value.trim(); render();
  });
  lifetime.on(root.getElementById?.('btnOpenFranchisesModal'), 'click', () => {
    root.getElementById('modalAvatarFranchises')?.classList.replace('hidden', 'flex');
  });
  lifetime.on(root.getElementById?.('btnCloseFranchisesModal'), 'click', closeFranchises);
  lifetime.on(root.getElementById?.('btnRefreshAvatarsCatalog'), 'click', () => refresh(true));
  setupAvatarUrlConfirmModal({ root, onConfirm: select, showToast: notify });
  async function refresh(force = false) {
    try {
      const [, ranking] = await Promise.all([services.loadAvatarsCatalog(force), services.fetchTopAvatarKeys(8)]);
      state.mostUsedKeys = ranking;
      if (!lifetime.signal.aborted) render();
    } catch (error) { notify(`No se pudo sincronizar el catálogo: ${error.message}`, 'warning'); }
  }
  return { render, refresh };
}
