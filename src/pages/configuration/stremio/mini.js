import { availableStremioCatalogs, catalogKey, defaultStremioSelection, reconcileStremioSelection, selectedStremioCatalogs, orderedCatalogBlocks, METADATA_BLOCK } from '../../../features/stremio-setup/index.js';
import { selectedConnectionCatalogs } from '../../../features/connections/index.js';
import { escapeHtml } from '../../../shared/ui/safe-markup.js';
import { mountStremioCatalogManager } from './manager.js';

const typeLabel = type => type === 'movie' ? 'Películas' : type === 'series' ? 'Series' : type === 'anime' ? 'Anime' : type;

function moveButtons(attribute, index, total, title) {
  return [-1, 1].map(direction => `<button type="button" ${attribute}="${index}" data-direction="${direction}" ${index + direction < 0 || index + direction >= total ? 'disabled' : ''} aria-label="${direction < 0 ? 'Subir' : 'Bajar'} ${escapeHtml(title)}"><i class="fa-solid fa-chevron-${direction < 0 ? 'up' : 'down'}" aria-hidden="true"></i></button>`).join('');
}

function metadataRow(catalog, index, context) {
  const key = catalogKey(catalog);
  const title = context.names[key] || catalog.title;
  return `<li class="stremio-catalog-row"><span class="stremio-row-number">${index + 1}</span><div class="stremio-row-name"><label class="sr-only" for="catalogName${index}">Nombre del catálogo ${index + 1}</label><input id="catalogName${index}" data-catalog-name="${escapeHtml(key)}" value="${escapeHtml(title)}" maxlength="100"><small>${escapeHtml(typeLabel(catalog.type))}${catalog.group === 'Conexiones' ? ' · Incluido por tu conexión' : ''}</small></div><div class="stremio-row-actions">${moveButtons('data-row-move', index, context.total, title)}<button type="button" data-row-remove="${escapeHtml(key)}" aria-label="Quitar ${escapeHtml(title)}"><i class="fa-solid fa-minus" aria-hidden="true"></i></button></div></li>`;
}

function blockMarkup(block, index, context) {
  const metadata = block.key === METADATA_BLOCK;
  const rows = metadata ? context.chosen.map((catalog, position) => metadataRow(catalog, position, { names: context.names, total: context.chosen.length })).join('') : block.catalogs.map(catalog => `<li class="stremio-catalog-row"><i class="fa-solid fa-list text-white/40" aria-hidden="true"></i><div class="stremio-row-name"><span>${escapeHtml(catalog.name || catalog.id)}</span><small>${escapeHtml(typeLabel(catalog.type))}</small></div></li>`).join('');
  return `<section class="stremio-catalog-block"><header><h3>${escapeHtml(block.title)}</h3><div class="stremio-row-actions">${moveButtons('data-block-move', index, context.blockCount, block.title)}</div></header><ol>${rows || '<li class="stremio-empty">Sin filas de inicio.</li>'}</ol></section>`;
}

export function mountMiniStremio({ state, root, lifetime, updateUI }) {
  const view = root.querySelector('#stremioCatalogStep');
  let signature;
  const catalogs = () => availableStremioCatalogs(state.rawMetadataTemplate, state.originalCollectionsTemplate, selectedConnectionCatalogs(state.connections));
  const synchronize = () => {
    const available = catalogs();
    state.stremio.selected ??= defaultStremioSelection(available);
    state.stremio.selected = reconcileStremioSelection(state.stremio.selected, available, selectedConnectionCatalogs(state.connections));
    signature = null;
  };
  const render = () => {
    if (state.stremio.selected === null) synchronize();
    const chosen = selectedStremioCatalogs(catalogs(), state.stremio.selected);
    const blocks = orderedCatalogBlocks(state);
    const names = state.stremio.names || {};
    const next = JSON.stringify([chosen, blocks, names]);
    if (signature === next) return;
    signature = next;
    const total = chosen.length + blocks.reduce((sum, block) => sum + block.catalogs.length, 0);
    view.querySelector('[data-stremio-count]').textContent = `${total} filas · ${chosen.length} de AIOMetadata`;
    view.querySelector('[data-stremio-rows]').innerHTML = blocks.map((block, index) => blockMarkup(block, index, { chosen, names, blockCount: blocks.length })).join('');
  };
  const changed = () => { signature = null; if (state.stremio.completed) state.stremio.completionId = null; state.stremio.completed = false; render(); updateUI(); };
  const manager = mountStremioCatalogManager({ root, lifetime, state, catalogs, changed });
  lifetime.on(view, 'change', event => {
    const input = event.target.closest('[data-catalog-name]');
    if (!input) return;
    state.stremio.names ??= {};
    const value = input.value.trim();
    if (value) state.stremio.names[input.dataset.catalogName] = value;
    else delete state.stremio.names[input.dataset.catalogName];
    changed();
  });
  lifetime.on(view, 'click', event => {
    if (event.target.closest('[data-stremio-manage]')) manager.open();
    const move = event.target.closest('[data-row-move],[data-block-move]');
    if (move) {
      const block = move.hasAttribute('data-block-move');
      const values = block ? orderedCatalogBlocks(state).map(item => item.key) : state.stremio.selected;
      const index = Number(block ? move.dataset.blockMove : move.dataset.rowMove);
      const destination = index + Number(move.dataset.direction);
      if (destination < 0 || destination >= values.length) return;
      [values[index], values[destination]] = [values[destination], values[index]];
      if (block) state.stremio.addonOrder = values;
      changed();
      view.querySelector(`[${block ? 'data-block-move' : 'data-row-move'}="${destination}"][data-direction="${move.dataset.direction}"]`)?.focus({ preventScroll: true });
    }
    const remove = event.target.closest('[data-row-remove]');
    if (remove) { state.stremio.selected = state.stremio.selected.filter(key => key !== remove.dataset.rowRemove); changed(); }
    if (event.target.closest('[data-stremio-restore]')) { state.stremio.selected = null; state.stremio.names = {}; state.stremio.addonOrder = null; synchronize(); changed(); }
  });
  return { render, synchronize };
}
