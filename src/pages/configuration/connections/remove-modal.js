import { createLifetime } from '../../../shared/ui/lifetime.js';
import { manageDialog } from '../../../shared/ui/dialog-accessibility.js';
import { connectionProviders } from '../../../features/connections/index.js';

/** Confirmation changes only this setup; it never revokes the external account. */
export function mountConnectionRemoval({ root, view, remove }) {
  const lifetime = createLifetime();
  const modal = root.createElement('div');
  modal.id = 'removeConnectionModal';
  modal.className = 'popup-overlay fixed inset-0 z-[110] hidden items-center justify-center p-4';
  modal.innerHTML = `<section class="popup-panel w-full max-w-md p-5 sm:p-6 space-y-4">
    <header class="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
      <h2 class="popup-title !border-0 !pb-0" tabindex="-1">Quitar conexión</h2>
      <button id="btnCloseRemoveConnection" type="button" aria-label="Cerrar" class="w-8 h-8 shrink-0 rounded-lg text-white/60 hover:bg-white/10"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
    </header>
    <p data-removal-question class="text-sm text-white/80"></p>
    <p class="text-xs text-white/50">Sus listas y opciones dejarán de incluirse en este setup. Tu cuenta, tu historial y la configuración ya instalada no se modificarán.</p>
    <footer class="popup-actions">
      <button id="btnCancelRemoveConnection" type="button" class="lat-capsule-btn glass text-xs">Cancelar</button>
      <button data-confirm-removal type="button" class="lat-capsule-btn text-xs bg-rose-500 text-white border border-rose-400/30 hover:bg-rose-600"><i class="fa-solid fa-trash-can" aria-hidden="true"></i>Quitar conexión</button>
    </footer>
  </section>`;
  root.body.append(modal);
  let card;
  let opener;
  const close = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); opener?.focus({ preventScroll: true }); };
  lifetime.add(manageDialog(modal));
  lifetime.on(modal.querySelector('#btnCloseRemoveConnection'), 'click', close);
  lifetime.on(modal.querySelector('#btnCancelRemoveConnection'), 'click', close);
  lifetime.on(modal, 'click', event => { if (event.target === modal) close(); });
  lifetime.on(view, 'click', event => {
    const button = event.target.closest('[data-connection-remove]');
    if (!button) return;
    opener = button; card = button.closest('[data-connection-provider]');
    modal.querySelector('[data-removal-question]').textContent = `¿Seguro que quieres quitar tu conexión de ${connectionProviders[card.dataset.connectionProvider].name}?`;
    modal.classList.remove('hidden'); modal.classList.add('flex');
    modal.querySelector('h2').focus({ preventScroll: true });
  });
  lifetime.on(modal.querySelector('[data-confirm-removal]'), 'click', () => {
    if (!card?.isConnected) { close(); return; }
    const target = card;
    close(); remove(target);
    target.querySelector('[data-connection-input]').focus({ preventScroll: true });
    card = null;
  });
  lifetime.add(() => modal.remove());
  return () => lifetime.dispose();
}
