import { createLifetime } from './lifetime.js';

const instances = new WeakMap();

/** One delegated listener also handles password fields rendered after initialization. */
export function initPasswordToggles(root = document) {
  if (instances.has(root)) return instances.get(root);
  const lifetime = createLifetime();
  lifetime.on(root, 'click', event => {
    const button = event.target.closest?.('.btn-toggle-key');
    if (!button || !root.contains(button)) return;
    const input = document.getElementById(button.dataset.target);
    if (!input) return;
    event.preventDefault();
    event.stopPropagation();
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    const icon = button.querySelector('i');
    if (icon) icon.className = `fa-solid fa-eye${visible ? '-slash' : ''} text-xs pointer-events-none`;
    button.title = visible ? 'Ocultar contraseña' : 'Mostrar contraseña';
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', String(visible));
  });
  const dispose = () => { lifetime.dispose(); instances.delete(root); };
  instances.set(root, dispose);
  return dispose;
}
