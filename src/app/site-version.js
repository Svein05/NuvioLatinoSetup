import { CONFIG } from './config.js';
import { renderVersionBadges } from '../shared/ui/version-badges.js';
import './repository-stars.js';

function syncVersionBadges() {
  renderVersionBadges({
    version: CONFIG.VERSION || '1.1.0',
    releaseUrl: CONFIG.RELEASE_URL || 'https://github.com/Svein05/NuvioLatinoSetup/releases',
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', syncVersionBadges, { once: true });
} else {
  syncVersionBadges();
}
