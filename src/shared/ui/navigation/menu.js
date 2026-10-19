import { createLifetime } from '../lifetime.js';

const instances = new WeakMap();

export function initMobileHeaderMenu(root = document) {
  const button = root.querySelector('#btnMobileHeaderMenu');
  const menu = root.querySelector('#mobileHeaderDropdown');
  if (!button || !menu) return () => {};
  if (instances.has(button)) return instances.get(button);
  const lifetime = createLifetime();
  lifetime.on(button, 'click', event => {
    event.stopPropagation();
    menu.classList.toggle('is-open');
    button.setAttribute('aria-expanded', String(menu.classList.contains('is-open')));
  });
  const close = () => { menu.classList.remove('is-open'); button.setAttribute('aria-expanded', 'false'); };
  lifetime.on(root, 'click', event => {
    if (!menu.contains(event.target) && !button.contains(event.target)) close();
  });
  lifetime.on(root, 'keydown', event => { if (event.key === 'Escape') close(); });
  button.setAttribute('aria-controls', menu.id);
  button.setAttribute('aria-expanded', 'false');
  const dispose = () => { lifetime.dispose(); instances.delete(button); close(); };
  instances.set(button, dispose);
  return dispose;
}
