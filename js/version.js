import { CONFIG } from './config.js';

/**
 * Inicializa y sincroniza los badges de versión en todas las páginas web.
 * Busca cualquier elemento con la clase .app-version-badge y asegura:
 * 1. El texto correcto con formato vX.Y.Z
 * 2. El enlace a los Releases de GitHub
 * 3. Tooltip descriptivo
 */
export function syncVersionBadges() {
  const versionText = `v${CONFIG.VERSION || '1.1.0'}`;
  const releaseUrl = CONFIG.RELEASE_URL || 'https://github.com/Svein05/NuvioLatinoSetup/releases';

  document.querySelectorAll('.app-version-badge').forEach((badge) => {
    badge.textContent = versionText;
    if (badge.tagName === 'A') {
      badge.setAttribute('href', releaseUrl);
      badge.setAttribute('target', '_blank');
      badge.setAttribute('rel', 'noopener noreferrer');
      badge.setAttribute('title', `Ver notas de la versión ${versionText} en GitHub`);
    }
  });
}

// Auto-ejecución al cargar el DOM
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncVersionBadges);
  } else {
    syncVersionBadges();
  }
}
