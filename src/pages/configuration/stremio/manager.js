import { manageDialog } from '../../../shared/ui/dialog-accessibility.js';
import { escapeHtml } from '../../../shared/ui/safe-markup.js';
import { catalogKey } from '../../../features/stremio-setup/index.js';

export function mountStremioCatalogManager({ root, lifetime, state, catalogs, changed }) {
  const modal = root.createElement('div');
  modal.className = 'popup-overlay fixed inset-0 z-[110] hidden items-center justify-center p-4';
  modal.id = 'stremioCatalogManager';
  modal.innerHTML = `<section class="popup-panel stremio-manager"><header><h2 class="popup-title !border-0 !pb-0" tabindex="-1">Administrar catálogos</h2><button type="button" data-close aria-label="Cerrar" class="w-8 h-8 rounded-lg text-white/60"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></header><input type="search" class="lat-field w-full p-3" placeholder="Buscar por título, plataforma o género…" aria-label="Buscar catálogos"><div class="stremio-groups !flex-row !flex-wrap" data-filters></div><div class="stremio-manager-options" data-options></div><footer><span data-count role="status"></span><button type="button" data-close class="lat-capsule-btn solid text-xs">Listo</button></footer></section>`;
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
    const filtered = available.filter(item => (group === 'Todos' || item.group === group)
      && `${item.title} ${item.group} ${item.folder || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query));
    filtered.sort((a, b) => Number(selected.has(catalogKey(b))) - Number(selected.has(catalogKey(a))));
    modal.querySelector('[data-options]').innerHTML = filtered.map(item => `<label class="stremio-manager-option"><input type="checkbox" value="${escapeHtml(catalogKey(item))}" ${selected.has(catalogKey(item)) ? 'checked' : ''} ${item.id.startsWith('trakt.recommendations.') ? 'disabled' : ''}><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.folder || item.group)} · ${item.type === 'movie' ? 'Películas' : item.type === 'series' ? 'Series' : item.type === 'anime' ? 'Anime' : 'Películas y series'}</small></span></label>`).join('') || '<p class="text-sm text-white/60 p-4">No hay catálogos que coincidan.</p>';
    modal.querySelector('[data-count]').textContent = `${selected.size} seleccionados`;
    modal.querySelector('[data-filters]').innerHTML = ['Todos', ...new Set(available.map(item => item.group))].map(name => `<button type="button" data-group="${escapeHtml(name)}" aria-pressed="${name === group}">${escapeHtml(name === 'Ahora en Nuvio' ? 'Para descubrir' : name)}</button>`).join('');
  };
  const close = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); opener?.focus({ preventScroll: true }); };
  lifetime.on(modal, 'click', event => {
    if (event.target === modal || event.target.closest('[data-close]')) close();
    const filter = event.target.closest('[data-group]');
    if (filter) { group = filter.dataset.group; render(); }
  });
  lifetime.on(input, 'input', render);
  lifetime.on(modal, 'change', event => {
    if (event.target.type !== 'checkbox') return;
    const key = event.target.value;
    if (event.target.checked) state.stremio.selected.push(key);
    else state.stremio.selected = state.stremio.selected.filter(value => value !== key);
    changed();
    render();
    [...modal.querySelectorAll('[data-options] input')].find(node => node.value === key)?.focus({ preventScroll: true });
  });
  return { open() { opener = root.activeElement; render(); modal.classList.remove('hidden'); modal.classList.add('flex'); modal.querySelector('h2').focus({ preventScroll: true }); } };
}
