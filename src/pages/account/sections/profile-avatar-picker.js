import { avatarCardMarkup } from './avatar-cards.js';
import { escapeHtml } from '../../../shared/ui/safe-markup.js';

export function bindProfileAvatarPicker({ root, services, lifetime, notify }) {
  const modal = root.getElementById('modalCreateProfileAvatarPicker');
  const container = root.getElementById('createProfileAvatarsCatalogContainer');
  const filters = { style: 'all', franchise: 'all', query: '' };
  const close = () => modal?.classList.replace('flex', 'hidden');
  function render() {
    if (!container) return;
    const items = services.filterAvatars(filters);
    container.innerHTML = `<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
      ${items.map(avatar => avatarCardMarkup(avatar, { resolveUrl: services.resolveAvatarCdnUrl })).join('')}</div>`;
    container.querySelectorAll('[data-avatar-path]').forEach(card => card.addEventListener('click', () => {
      const preview = root.getElementById('createProfileAvatarPreview');
      if (preview) {
        preview.src = services.resolveAvatarCdnUrl(card.dataset.avatarPath);
        preview.dataset.selectedUrl = preview.src;
      }
      close();
    }));
  }
  lifetime.on(root.getElementById('btnPickCreateProfileAvatar'), 'click', async () => {
    try { await services.loadAvatarsCatalog(); }
    catch (error) { notify(error.message, 'warning'); }
    if (lifetime.signal.aborted) return;
    render(); modal?.classList.replace('hidden', 'flex');
  });
  lifetime.on(root.getElementById('btnCloseCreateProfileAvatarPicker'), 'click', close);
  lifetime.on(root.getElementById('inputCreateProfileAvatarSearch'), 'input', event => {
    filters.query = event.target.value.trim(); render();
  });
  lifetime.on(root.getElementById('btnCreateProfileFranchisesTrigger'), 'click', () => {
    if (!container) return;
    container.innerHTML = services.getFranchisesSummary('all').map(franchise =>
      `<button type="button" class="modal-franchise-card" data-franchise="${escapeHtml(franchise.id)}">${escapeHtml(franchise.name)}</button>`).join('');
    container.querySelectorAll('[data-franchise]').forEach(button => button.addEventListener('click', () => {
      filters.franchise = button.dataset.franchise;
      root.getElementById('createProfileFranchiseLabel').textContent = button.textContent;
      render();
    }));
  });
}
