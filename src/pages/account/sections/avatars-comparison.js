export function areAvatarUrlsEqual(urlA, urlB, resolveCdn = u => u) {
  if (!urlA && !urlB) return true;
  if (!urlA || !urlB) return false;
  if (urlA === urlB) return true;
  const cleanA = resolveCdn(urlA).split('?')[0];
  const cleanB = resolveCdn(urlB).split('?')[0];
  return cleanA === cleanB;
}

export function updateAvatarComparisonUI(root = document, state, resolveCdn = u => u) {
  const profileName = root.getElementById?.('avatarCurrentProfileName');
  if (profileName) profileName.textContent = state.profiles?.find(profile => profile.id === state.selectedProfileId)?.name || 'Tu perfil';
  const origPreview = root.getElementById?.('avatarOriginalPreview');
  const currentPreview = root.getElementById?.('avatarCurrentPreview');
  const arrow = root.getElementById?.('avatarTransitionArrow');
  const newWrap = root.getElementById?.('avatarNewWrap');
  const origBadge = root.getElementById?.('avatarOriginalBadge');
  const modBadge = root.getElementById?.('avatarModifiedBadge');
  const headerMainWrap = root.getElementById?.('avatarHeaderMainWrap');

  const origUrl = resolveCdn(state.originalAvatarUrl || '') || '/assets/icons/avatar-placeholder.svg';
  const selectedUrl = resolveCdn(state.selectedAvatarUrl || origUrl) || origUrl;
  const isChanged = Boolean(state.selectedAvatarUrl && !areAvatarUrlsEqual(state.selectedAvatarUrl, state.originalAvatarUrl, resolveCdn));

  if (origPreview) origPreview.src = origUrl;
  headerMainWrap?.classList.toggle('has-comparison', isChanged);

  if (isChanged) {
    arrow?.classList.remove('hidden');
    arrow?.classList.add('flex');
    newWrap?.classList.remove('hidden');
    if (currentPreview) currentPreview.src = selectedUrl;
    origBadge?.classList.remove('hidden');
    modBadge?.classList.remove('hidden');
  } else {
    arrow?.classList.add('hidden');
    arrow?.classList.remove('flex');
    newWrap?.classList.add('hidden');
    origBadge?.classList.add('hidden');
    modBadge?.classList.add('hidden');
  }
}

export function setNewSelectedAvatar(newUrl, { root = document, state, resolveCdn = u => u, onDirty, updateUI }) {
  if (!newUrl) return;

  const isEqualToOriginal = areAvatarUrlsEqual(newUrl, state.originalAvatarUrl, resolveCdn);

  if (isEqualToOriginal) {
    if (!state.dirty?.avatar) return;
    state.selectedAvatarUrl = state.originalAvatarUrl;
    onDirty?.('avatar', false);
    updateAvatarComparisonUI(root, state, resolveCdn);
    updateUI?.();
    updateCatalogCards(root, state.originalAvatarUrl, resolveCdn);
    return;
  }

  state.selectedAvatarUrl = newUrl;
  onDirty?.('avatar', true);
  updateAvatarComparisonUI(root, state, resolveCdn);
  updateUI?.();
  updateCatalogCards(root, newUrl, resolveCdn);
}

function updateCatalogCards(root, targetUrl, resolveCdn) {
  root.querySelectorAll?.('.netflix-avatar-card').forEach(card => {
    const cardPath = card.dataset.avatarPath;
    const isSelected = areAvatarUrlsEqual(cardPath, targetUrl, resolveCdn);
    card.classList.toggle('is-selected', isSelected);
  });
}
