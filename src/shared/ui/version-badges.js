/** Render version labels and release links without owning application configuration. */
export function renderVersionBadges({ version, releaseUrl }, root = document) {
  const versionText = `v${version}`;
  root.querySelectorAll('.app-version-badge').forEach((badge) => {
    badge.textContent = versionText;
    if (badge.tagName === 'A') {
      badge.setAttribute('href', releaseUrl);
      badge.setAttribute('target', '_blank');
      badge.setAttribute('rel', 'noopener noreferrer');
      badge.setAttribute('title', `Ver notas de la versión ${versionText} en GitHub`);
    }
  });
}
