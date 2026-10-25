import { createLifetime } from '../lifetime.js';

const instances = new WeakMap();

export function initMobileHeaderMenu(root = document) {
  const button = root.querySelector('#btnMobileHeaderMenu');
  const menu = root.querySelector('#mobileHeaderDropdown');
  if (!button || !menu) return () => {};
  if (instances.has(button)) return instances.get(button).dispose;
  const lifetime = createLifetime();
  let revision = 0;
  const isOpen = () => menu.classList.contains('is-open');
  const setOpen = open => {
    menu.classList.toggle('is-open', open);
    menu.inert = !open;
    menu.setAttribute('aria-hidden', String(!open));
    button.setAttribute('aria-expanded', String(open));
  };
  lifetime.on(button, 'click', event => {
    event.stopPropagation();
    revision++;
    setOpen(!isOpen());
  });
  const close = () => setOpen(false);
  const userClose = () => { revision++; close(); };
  lifetime.on(menu, 'pointerdown', () => { revision++; });
  lifetime.on(menu, 'keydown', () => { revision++; });
  lifetime.on(menu, 'focusin', () => { revision++; });
  lifetime.on(root, 'click', event => {
    if (isOpen() && !menu.contains(event.target) && !button.contains(event.target)) userClose();
  });
  lifetime.on(root, 'keydown', event => {
    if (event.key !== 'Escape' || !isOpen()) return;
    const restoreFocus = menu.contains(root.activeElement);
    userClose();
    if (restoreFocus) button.focus({ preventScroll: true });
  });
  button.setAttribute('aria-controls', menu.id);
  setOpen(false);
  const dispose = () => { lifetime.dispose(); instances.delete(button); close(); };
  instances.set(button, { button, menu, isOpen, open: () => setOpen(true), close,
    get revision() { return revision; }, dispose });
  return dispose;
}

/** Share menu state with confirmed-completion presentation without synthetic clicks. */
export function getMobileHeaderMenu(root = document) {
  const button = root.querySelector('#btnMobileHeaderMenu');
  if (button && !instances.has(button)) initMobileHeaderMenu(root);
  return instances.get(button);
}
