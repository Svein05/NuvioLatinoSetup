import { getBadgePackById } from '../../../features/badges/index.js';

/** The enabled preference and the gallery disclosure are independent states. */
export function mountBadgesDisclosure({ root, state, lifetime, render, fit }) {
  const gallery = root.querySelector('#badgesGalleryContainer');
  const button = root.querySelector('#btnEditBadgePack');
  const label = root.querySelector('#selectedBadgePackLabel');
  let enabled;
  let open = false;
  function setOpen(next) {
    open = next;
    if (!open && gallery?.contains(root.activeElement)) button?.focus({ preventScroll: true });
    if (gallery) {
      gallery.inert = !open;
      gallery.classList.toggle('is-open', open);
    }
    button?.setAttribute('aria-expanded', String(open));
    if (button) button.innerHTML = (open ? 'Cerrar opciones' : 'Cambiar pack') + ' <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';
    if (open) { render(); lifetime.timeout(fit, 350); }
  }
  function sync() {
    const next = Boolean(state.preferences.badgesEnabled);
    if (button) button.hidden = !next;
    if (label) label.textContent = next ? getBadgePackById(state.preferences.selectedBadgePack || 'tinted')?.name || '' : '';
    if (next !== enabled) { enabled = next; setOpen(next); }
  }
  lifetime.on(button, 'click', () => setOpen(!open));
  return { sync, selected: () => { sync(); setOpen(false); button?.focus({ preventScroll: true }); } };
}
