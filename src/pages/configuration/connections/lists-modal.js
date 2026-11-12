import { createLifetime } from '../../../shared/ui/lifetime.js';
import { manageDialog } from '../../../shared/ui/dialog-accessibility.js';
import { escapeHtml } from '../../../shared/ui/safe-markup.js';
import { connectionProviders } from '../../../features/connections/index.js';
import { renderConnectionAccount } from './view.js';

const identity = catalog => `${catalog.type}:${catalog.id}`;
const media = { movie: 'Películas', series: 'Series', anime: 'Anime', all: 'Películas y series' };

function createModal(root) {
  const modal = root.createElement('div');
  modal.id = 'connectionListsModal';
  modal.className = 'popup-overlay fixed inset-0 z-[110] hidden items-center justify-center p-4';
  modal.innerHTML = `<section class="popup-panel connection-lists-panel w-full max-w-2xl p-5 sm:p-6">
    <header class="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
      <h2 id="connectionListsTitle" tabindex="-1" class="popup-title !border-0 !pb-0">Administrar listas</h2>
      <button id="btnCloseConnectionLists" type="button" aria-label="Cerrar listas" class="w-8 h-8 shrink-0 rounded-lg text-white/60 hover:bg-white/10"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
    </header>
    <div class="popup-search relative"><i class="fa-solid fa-magnifying-glass absolute top-1/2 -translate-y-1/2 text-white/40" aria-hidden="true"></i>
      <input id="connectionListsSearch" class="lat-field w-full text-sm" type="search" placeholder="Buscar una lista…" aria-label="Buscar una lista">
    </div>
    <div data-lists-scroll class="connection-lists-scroll"><fieldset class="connection-catalogs" aria-label="Listas disponibles"></fieldset><p data-lists-empty hidden class="text-sm text-white/50 py-6 text-center">No hay listas que coincidan.</p></div>
    <p data-lists-count role="status" class="text-xs text-white/60 border-t border-white/10 pt-3"></p>
  </section>`;
  root.body.append(modal);
  return modal;
}

function populate(modal, account) {
  modal.querySelector('fieldset').innerHTML = account.catalogs.map((catalog, index) => {
    const included = catalog.id.startsWith('trakt.recommendations.');
    return `<label class="connection-catalog" data-list-row="${index}"><input type="checkbox" data-list-index="${index}" ${account.selected.includes(identity(catalog)) ? 'checked' : ''} ${included ? 'disabled' : ''}>
      <span>${escapeHtml(catalog.name)}<small class="block text-white/50 mt-1">${media[catalog.type]}</small>${included ? '<small class="block text-emerald-400 mt-1">Incluido por tu conexión de Trakt</small>' : ''}</span></label>`;
  }).join('');
}

function orderAndFilter(modal, account, animate = false) {
  const fieldset = modal.querySelector('fieldset');
  const scroll = modal.querySelector('[data-lists-scroll]');
  const top = scroll.scrollTop;
  const focused = modal.ownerDocument.activeElement;
  const query = modal.querySelector('input[type="search"]').value.trim().toLocaleLowerCase('es');
  const rows = [...fieldset.children];
  const positions = new Map(rows.map(row => [row, row.getBoundingClientRect().top]));
  rows.sort((a, b) => Number(b.querySelector('input').checked) - Number(a.querySelector('input').checked)
    || Number(a.dataset.listRow) - Number(b.dataset.listRow));
  for (const row of rows) {
    row.hidden = !account.catalogs[Number(row.dataset.listRow)].name.toLocaleLowerCase('es').includes(query);
    fieldset.append(row);
  }
  scroll.scrollTop = top;
  if (focused?.isConnected) focused.focus({ preventScroll: true });
  if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) rows.filter(row => !row.hidden).forEach(row => {
    const offset = positions.get(row) - row.getBoundingClientRect().top;
    row.animate?.([{ transform: `translateY(${offset}px)` }, { transform: 'none' }], { duration: 220, easing: 'ease-out' });
  });
  modal.querySelector('[data-lists-empty]').hidden = rows.some(row => !row.hidden);
  modal.querySelector('[data-lists-count]').textContent = `${account.selected.length} de ${account.catalogs.length} listas seleccionadas`;
}

export function mountConnectionLists({ root, state, view, synchronize }) {
  const lifetime = createLifetime();
  const modal = createModal(root);
  let provider;
  let card;
  let opener;
  const close = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); opener?.focus({ preventScroll: true }); };
  lifetime.add(manageDialog(modal));
  lifetime.on(modal.querySelector('#btnCloseConnectionLists'), 'click', close);
  lifetime.on(modal, 'click', event => { if (event.target === modal) close(); });
  lifetime.on(view, 'click', event => {
    opener = event.target.closest('[data-connection-manage]');
    if (!opener) return;
    card = opener.closest('[data-connection-provider]');
    provider = card.dataset.connectionProvider;
    const account = state.connections.accounts[provider];
    if (!account) return;
    modal.querySelector('h2').textContent = `Administrar listas · ${connectionProviders[provider].name}`;
    modal.querySelector('input[type="search"]').value = '';
    populate(modal, account);
    modal.classList.remove('hidden'); modal.classList.add('flex');
    orderAndFilter(modal, account);
    modal.querySelector('[data-lists-scroll]').scrollTop = 0;
    modal.querySelector('h2').focus({ preventScroll: true });
  });
  lifetime.on(modal.querySelector('input[type="search"]'), 'input', () => orderAndFilter(modal, state.connections.accounts[provider]));
  lifetime.on(modal, 'change', event => {
    if (!event.target.matches('[data-list-index]')) return;
    const account = state.connections.accounts[provider];
    account.selected = [...modal.querySelectorAll('[data-list-index]:checked')].map(input => identity(account.catalogs[Number(input.dataset.listIndex)]));
    renderConnectionAccount(card, account);
    orderAndFilter(modal, account, true);
    synchronize();
  });
  lifetime.add(() => modal.remove());
  return () => lifetime.dispose();
}
