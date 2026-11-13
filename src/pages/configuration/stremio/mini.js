import { availableStremioCatalogs, catalogKey, defaultStremioSelection, reconcileStremioSelection, selectedStremioCatalogs } from '../../../features/stremio-setup/index.js';
import { selectedConnectionCatalogs } from '../../../features/connections/index.js';
import { escapeHtml } from '../../../shared/ui/safe-markup.js';
import { mountStremioCatalogManager } from './manager.js';

function rowMarkup(catalog, index, total, posters) {
  const connected = catalog.group === 'Conexiones';
  const locked = catalog.id.startsWith('trakt.recommendations.');
  const connection = catalog.id.startsWith('trakt.') ? ' de Trakt' : catalog.id.startsWith('simkl.') ? ' de Simkl' : catalog.id.startsWith('anilist.') ? ' de AniList' : catalog.id.startsWith('mal.') ? ' de MyAnimeList' : '';
  return `<article class="stremio-catalog-row"><header class="stremio-row-header"><div><h3>${escapeHtml(catalog.title)} · ${catalog.type === 'movie' ? 'Películas' : catalog.type === 'series' ? 'Series' : catalog.type === 'anime' ? 'Anime' : 'Películas y series'}</h3>${connected ? `<p>Incluido por tu conexión${connection}</p>` : ''}</div>
    <div class="stremio-row-actions"><button type="button" data-row-move="${index}" data-direction="-1" ${index === 0 || locked ? 'disabled' : ''} aria-label="Subir ${escapeHtml(catalog.title)}"><i class="fa-solid fa-chevron-up" aria-hidden="true"></i></button><button type="button" data-row-move="${index}" data-direction="1" ${index === total - 1 || locked ? 'disabled' : ''} aria-label="Bajar ${escapeHtml(catalog.title)}"><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></button><button type="button" data-stremio-manage aria-label="Editar catálogos"><i class="fa-solid fa-sliders" aria-hidden="true"></i></button></div></header>
    <div class="stremio-poster-rail">${posters.map(poster => `<figure><img src="${escapeHtml(poster.src)}" alt="${escapeHtml(poster.alt)}" loading="lazy" width="160" height="240"><figcaption>${escapeHtml(poster.alt)}</figcaption></figure>`).join('')}</div></article>`;
}

export function mountMiniStremio({ state, root, lifetime, updateUI }) {
  const view = root.querySelector('#stremioCatalogStep');
  const posters = [...view.querySelectorAll('[data-stremio-posters] img')].map(image => ({ src: image.src, alt: image.alt }));
  const series = [...view.querySelectorAll('[data-stremio-series] img')].map(image => ({ src: image.src, alt: image.alt }));
  let page = 0;
  let group = 'Todos';
  let signature;
  let animation;
  lifetime.add(() => animation?.cancel());
  const catalogs = () => availableStremioCatalogs(state.rawMetadataTemplate, state.originalCollectionsTemplate, selectedConnectionCatalogs(state.connections));
  const synchronize = () => {
    const available = catalogs();
    state.stremio.selected ??= defaultStremioSelection(available);
    state.stremio.selected = reconcileStremioSelection(state.stremio.selected, available, selectedConnectionCatalogs(state.connections));
    signature = null;
  };
  const render = () => {
    if (state.stremio.selected === null) synchronize();
    const available = catalogs();
    const chosen = selectedStremioCatalogs(available, state.stremio.selected);
    const filtered = chosen.filter(item => group === 'Todos' || item.group === group);
    page = Math.max(0, Math.min(page, Math.ceil(filtered.length / 2) - 1));
    const currentSignature = JSON.stringify([state.stremio.selected, group, page, chosen.map(item => item.title)]);
    if (currentSignature === signature) return;
    signature = currentSignature;
    view.querySelector('[data-stremio-count]').textContent = `${chosen.length} catálogos seleccionados`;
    view.querySelector('[data-stremio-rows]').innerHTML = filtered.length ? filtered.slice(page * 2, page * 2 + 2).map(item => rowMarkup(item, state.stremio.selected.indexOf(catalogKey(item)), chosen.length, item.type === 'movie' ? posters : series)).join('') : '<p class="p-6 text-sm text-white/60">Añade catálogos para completar tu inicio.</p>';
    const groups = ['Todos', ...new Set(available.map(item => item.group))];
    view.querySelector('[data-stremio-groups]').innerHTML = groups.map(name => `<button type="button" data-stremio-group="${escapeHtml(name)}" aria-pressed="${group === name}">${escapeHtml(name === 'Ahora en Nuvio' ? 'Para descubrir' : name)}<span>${chosen.filter(item => name === 'Todos' || item.group === name).length}</span></button>`).join('');
    view.querySelector('[data-stremio-page-status]').textContent = filtered.length ? `${page * 2 + 1}–${Math.min(page * 2 + 2, filtered.length)} de ${filtered.length}` : 'Sin catálogos';
    view.querySelector('[data-stremio-page="-1"]').disabled = page === 0;
    view.querySelector('[data-stremio-page="1"]').disabled = (page + 1) * 2 >= filtered.length;
    animation?.cancel();
    const rows = view.querySelector('[data-stremio-rows]');
    if (rows.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      animation = rows.animate([{ opacity: .65, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: 'cubic-bezier(.215,.61,.355,1)' });
    }
  };
  const changed = () => { signature = null; if (state.stremio.completed) state.stremio.completionId = null; state.stremio.completed = false; render(); updateUI(); };
  const manager = mountStremioCatalogManager({ root, lifetime, state, catalogs, changed });
  lifetime.on(view, 'click', event => {
    if (event.target.closest('[data-stremio-manage]')) manager.open();
    const filter = event.target.closest('[data-stremio-group]');
    if (filter) { group = filter.dataset.stremioGroup; page = 0; render(); }
    const paging = event.target.closest('[data-stremio-page]');
    if (paging) { page += Number(paging.dataset.stremioPage); render(); }
    const move = event.target.closest('[data-row-move]');
    if (move) {
      const index = Number(move.dataset.rowMove); const destination = index + Number(move.dataset.direction);
      const next = state.stremio.selected[destination];
      if (next && !next.includes(':trakt.recommendations.')) {
        [state.stremio.selected[index], state.stremio.selected[destination]] = [state.stremio.selected[destination], state.stremio.selected[index]];
        changed();
      }
    }
    if (event.target.closest('[data-stremio-restore]')) { state.stremio.selected = null; synchronize(); changed(); }
  });
  return { render, synchronize };
}
