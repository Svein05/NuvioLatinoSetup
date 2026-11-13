import { manageDialog } from '../../../shared/ui/dialog-accessibility.js';
import { escapeHtml } from '../../../shared/ui/safe-markup.js';
import { catalogKey } from '../../../features/stremio-setup/index.js';

export function mountStremioCatalogManager({ root, lifetime, state, catalogs, changed }) {
  const modal = root.createElement('div');
  modal.className = 'popup-overlay fixed inset-0 z-[110] hidden items-center justify-center p-4';
  modal.id = 'stremioCatalogManager';
  modal.innerHTML = `<section class="popup-panel stremio-manager"><header><h2 class="popup-title !border-0 !pb-0" tabindex="-1">Añadir catálogos</h2><button type="button" data-close aria-label="Cerrar" class="w-8 h-8 rounded-lg text-white/60"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></header><input type="search" class="lat-field w-full p-3" placeholder="Buscar por título, plataforma o género…" aria-label="Buscar catálogos"><div class="stremio-groups !flex-row !flex-wrap" data-filters></div><div class="stremio-manager-options" data-options></div><footer><span data-count role="status"></span><button type="button" data-close class="lat-capsule-btn solid text-xs">Listo</button></footer></section>`;
  root.body.append(modal);
  lifetime.add(manageDialog(modal));
  lifetime.add(() => modal.remove());
  let opener;
  let group = 'Todos';
  const input = modal.querySelector('input[type=search]');
  const render = () => {
    const query = input.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const available = catalogs();
    const selected = new Set(state.stremio.selected);
    const filtered = available.filter(item => !selected.has(catalogKey(item)) && (group === 'Todos' || item.group === group)
      && `${item.title} ${item.group} ${item.folder || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query));
    modal.querySelector('[data-options]').innerHTML = filtered.map(item => `<div class="stremio-manager-option"><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.folder || item.group)} · ${item.type === 'movie' ? 'Películas' : item.type === 'series' ? 'Series' : 'Anime'}</small></span><button type="button" data-catalog-add="${escapeHtml(catalogKey(item))}" class="stremio-catalog-add" aria-label="Añadir ${escapeHtml(item.title)}"><i class="fa-solid fa-plus" aria-hidden="true"></i></button></div>`).join('') || '<p class="text-sm text-white/60 p-4">No quedan catálogos por añadir con este filtro.</p>';
    modal.querySelector('[data-count]').textContent = `${selected.size} seleccionados`;
    modal.querySelector('[data-filters]').innerHTML = ['Todos', ...new Set(available.map(item => item.group))].map(name => `<button type="button" data-group="${escapeHtml(name)}" aria-pressed="${name === group}">${escapeHtml(name === 'Ahora en Nuvio' ? 'Para descubrir' : name)}</button>`).join('');
  };
  const close = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); opener?.focus({ preventScroll: true }); };
  lifetime.on(modal, 'click', event => {
    if (event.target === modal || event.target.closest('[data-close]')) close();
    const add = event.target.closest('[data-catalog-add]');
    if (add && !state.stremio.selected.includes(add.dataset.catalogAdd)) {
      const position = [...modal.querySelectorAll('[data-catalog-add]')].indexOf(add);
      state.stremio.selected.push(add.dataset.catalogAdd); changed(); render();
      const buttons = [...modal.querySelectorAll('[data-catalog-add]')];
      (buttons[Math.min(position, buttons.length - 1)] || input).focus({ preventScroll: true });
    }
    const filter = event.target.closest('[data-group]');
    if (filter) { group = filter.dataset.group; render(); }
  });
  lifetime.on(input, 'input', render);
  return { open() { opener = root.activeElement; render(); modal.classList.remove('hidden'); modal.classList.add('flex'); modal.querySelector('h2').focus({ preventScroll: true }); } };
}
