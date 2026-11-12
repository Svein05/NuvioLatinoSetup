import { createLifetime } from '../../../shared/ui/lifetime.js';
import { manageDialog } from '../../../shared/ui/dialog-accessibility.js';

export function connectionTrackingControl(provider) {
  if (provider === 'trakt') return '<button type="button" data-trakt-tracking class="lat-capsule-btn glass text-xs"><i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i> Seguimiento</button>';
  return `<div data-connection-tracking hidden class="connection-tracking">
    <label class="flex items-center justify-between gap-3 text-xs"><span>Registrar vistos</span><span class="lat-switch shrink-0">
      <input type="checkbox" role="switch" data-tracking-toggle aria-label="Registrar vistos" aria-describedby="tracking-help-${provider}">
      <span class="lat-switch-track"><span class="lat-switch-thumb"></span></span></span></label>
    <p id="tracking-help-${provider}" class="text-xs text-white/50">AIOMetadata puede registrar el contenido al solicitar subtítulos, aunque no termines de verlo.${provider === 'simkl' ? '' : ' Solo anime.'}</p>
  </div>`;
}

export function renderConnectionTracking(card, account) {
  const group = card.querySelector('[data-connection-tracking]');
  if (!group) return;
  group.hidden = !account;
  card.querySelector('[data-tracking-toggle]').checked = account?.trackingEnabled !== false;
}

function createInstructions(root) {
  const modal = root.createElement('div');
  modal.id = 'traktTrackingModal';
  modal.className = 'popup-overlay fixed inset-0 z-[110] hidden items-center justify-center p-4';
  modal.innerHTML = `<section class="popup-panel overflow-y-auto max-w-lg w-full p-5 sm:p-6 space-y-4">
    <header class="flex justify-between items-center gap-3 border-b border-white/10 pb-3"><h2 class="popup-title !border-0 !pb-0" tabindex="-1">Seguimiento de Trakt en Nuvio</h2>
      <button id="btnCloseTraktTracking" type="button" aria-label="Cerrar instrucciones" class="w-8 h-8 shrink-0 rounded-lg text-white/60 hover:bg-white/10"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></header>
    <ol class="list-decimal pl-5 space-y-3 text-sm text-white/75">
      <li>Abre Nuvio en tu dispositivo y elige el perfil que vas a utilizar.</li>
      <li>Entra en Ajustes y busca Trakt en las opciones de seguimiento.</li>
      <li>Pulsa conectar o iniciar sesión. Abre el enlace que Nuvio muestre e introduce su código de autorización.</li>
      <li>Autoriza Nuvio en Trakt y vuelve a la aplicación. Si ofrece una opción de scrobbling o registrar reproducción, actívala.</li>
      <li>Comprueba con una reproducción que tu actividad aparece en Trakt.</li>
    </ol>
    <p class="text-xs text-white/50">Esta conexión es independiente de las listas de AIOMetadata. El identificador que pegaste aquí no sirve para iniciar sesión en Nuvio. Las opciones pueden variar según la versión y el dispositivo.</p>
  </section>`;
  root.body.append(modal);
  return modal;
}

export function mountConnectionTracking({ root, view, state, synchronize }) {
  const lifetime = createLifetime();
  const modal = createInstructions(root);
  let opener;
  lifetime.add(manageDialog(modal));
  const close = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); opener?.focus({ preventScroll: true }); };
  lifetime.on(modal.querySelector('#btnCloseTraktTracking'), 'click', close);
  lifetime.on(modal, 'click', event => { if (event.target === modal) close(); });
  lifetime.on(view, 'click', event => {
    const button = event.target.closest('[data-trakt-tracking]');
    if (!button) return;
    opener = button;
    modal.classList.remove('hidden'); modal.classList.add('flex');
    modal.querySelector('h2').focus({ preventScroll: true });
  });
  lifetime.on(view, 'change', event => {
    if (!event.target.matches('[data-tracking-toggle]')) return;
    const provider = event.target.closest('[data-connection-provider]').dataset.connectionProvider;
    const account = state.connections.accounts[provider];
    if (!account) return;
    account.trackingEnabled = event.target.checked;
    synchronize();
  });
  lifetime.add(() => modal.remove());
  return () => lifetime.dispose();
}
