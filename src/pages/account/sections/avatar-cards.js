import { escapeHtml, safeImageUrl } from '../../../shared/ui/safe-markup.js';
import { normalizeAvatarStorageKey } from '../../../features/avatars/index.js';

export function avatarCardMarkup(avatar, { resolveUrl, selected, score }) {
  const badge = score === undefined ? '' : `<span class="avatar-user-count-badge">${Number(score) || 0}</span>`;
  return `<button type="button" class="netflix-avatar-card ${selected ? 'is-selected' : ''}"
    data-avatar-path="${escapeHtml(avatar.path)}" title="${escapeHtml(avatar.character)}">
    <span class="avatar-circle-wrap"><img class="avatar-card-img" loading="lazy"
      src="${escapeHtml(safeImageUrl(resolveUrl(avatar.path)))}" alt="${escapeHtml(avatar.character)}"></span>
    ${badge}<span class="avatar-card-name-label">${escapeHtml(avatar.character)}</span></button>`;
}

export function renderRankedAvatars(container, { avatars, ranking, resolveUrl, selectedUrl, onSelect }) {
  if (!container) return;
  const entries = (ranking || []).map(item => ({ ...item,
    avatar: avatars.find(av => normalizeAvatarStorageKey(av.path) === item.key),
  })).filter(item => item.avatar);
  container.innerHTML = `<div id="blockMostUsedAvatars" class="space-y-3">
    <h4 class="text-sm font-semibold text-white">Más usados</h4>
    <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
    ${entries.map(({ avatar, score }) => avatarCardMarkup(avatar, {
      resolveUrl, score, selected: avatar.path === selectedUrl,
    })).join('')}</div></div>`;
  container.querySelectorAll('[data-avatar-path]').forEach(card => {
    card.addEventListener('click', () => onSelect(card.dataset.avatarPath));
  });
}
