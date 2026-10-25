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

export function renderRankedAvatars(container, { avatars, ranking, resolveUrl, selectedUrl, onSelect, mountGrid }) {
  if (!container) return;
  const entries = (ranking || []).map(item => ({ ...item,
    avatar: avatars.find(av => normalizeAvatarStorageKey(av.path) === item.key),
  })).filter(item => item.avatar);
  const known = new Set(entries.map(item => normalizeAvatarStorageKey(item.avatar.path)));
  for (const avatar of avatars) {
    const key = normalizeAvatarStorageKey(avatar.path);
    if (key && !known.has(key)) {
      entries.push({ avatar, score: 0 });
      known.add(key);
    }
  }
  container.innerHTML = `<div id="blockMostUsedAvatars" class="avatar-collection-block space-y-3">
    <h4 class="text-sm font-semibold text-white">Más usados</h4>
    <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
    ${(mountGrid ? [] : entries.slice(0, 8)).map(({ avatar, score }) => avatarCardMarkup(avatar, {
      resolveUrl, score, selected: normalizeAvatarStorageKey(avatar.path) === normalizeAvatarStorageKey(selectedUrl),
    })).join('')}</div></div>`;
  if (mountGrid) mountGrid(container.querySelector('.grid'), entries, ({ avatar, score }) => avatarCardMarkup(avatar, {
    resolveUrl, score, selected: normalizeAvatarStorageKey(avatar.path) === normalizeAvatarStorageKey(selectedUrl),
  }));
  container.onclick = event => {
    const card = event.target.closest('[data-avatar-path]');
    if (card && container.contains(card)) { event.stopPropagation(); onSelect(card.dataset.avatarPath); }
  };
}
