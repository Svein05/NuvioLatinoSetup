import { createAvatarRefresh } from './avatar-refresh.js';
import { renderReadFeedback } from '../read-feedback.js';
import { renderAvatarsCatalog, renderAvatarStylePills, renderModalFranchisesList } from './avatars-catalog.js';
import { updateAvatarComparisonUI, setNewSelectedAvatar } from './avatars-comparison.js';
import { setupAvatarUrlConfirmModal } from './avatars-modal.js';
import { renderRankedAvatars } from './avatar-cards.js';
import { createAvatarGridLayout } from './avatar-grid.js';

export function createAccountAvatars({ root, state, services, lifetime, notify, updateUI }) {
  const grids = createAvatarGridLayout();
  lifetime.add(grids.dispose);
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
    grids.clear();
    if (renderReadFeedback(root.getElementById('avatarsCatalogContainer'), { loading: state.isLoadingAvatars && !services.getCompiledAvatars().length,
      error: !services.getCompiledAvatars().length ? state.avatarCatalogError : '', shape: 'avatars', retry: () => refresh(true) })) return;
    updateAvatarComparisonUI(root, state, services.resolveAvatarCdnUrl);
    renderAvatarStylePills({ root, state, getStylesSummary: services.getStylesSummary,
      onSelectStyle: style => { state.avatarFilters.style = style; state.avatarFilters.franchise = 'all'; render(); } });
    renderModalFranchisesList({ root, state, getFranchisesSummary: services.getFranchisesSummary,
      onSelectFranchise: franchise => { state.avatarFilters.franchise = franchise; closeFranchises(); render(); } });
    renderAvatarsCatalog({ root, state, filterAvatars: services.filterAvatars,
      resolveAvatarCdnUrl: services.resolveAvatarCdnUrl, onSelectAvatar: select, onResetFilters: reset, mountGrid: grids.mount,
      onOpenFranchise: franchise => { state.avatarFilters.franchise = franchise; render(); } });
    if (state.avatarFilters.franchise === 'all' && !state.avatarFilters.query) {
      const container = root.getElementById('avatarsCatalogContainer');
      const top = root.createElement('div');
      const avatars = services.getCompiledAvatars().filter(avatar =>
        state.avatarFilters.style === 'all' || avatar.style === state.avatarFilters.style);
      renderRankedAvatars(top, { avatars, ranking: state.mostUsedKeys,
        resolveUrl: services.resolveAvatarCdnUrl, selectedUrl: state.selectedAvatarUrl, onSelect: select, mountGrid: grids.mount });
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
  const refresh = createAvatarRefresh({ state, services, lifetime, root, notify, render });
  return { render, refresh };
}
