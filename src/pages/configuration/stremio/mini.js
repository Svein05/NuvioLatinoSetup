import { availableStremioCatalogs, defaultStremioSelection, reconcileStremioSelection, selectedStremioCatalogs, orderedCatalogBlocks } from '../../../features/stremio-setup/index.js';
import { selectedConnectionCatalogs } from '../../../features/connections/index.js';
import { mountStremioCatalogManager } from './manager.js';

import { blockMarkup } from './catalog-markup.js';
import { mountCatalogSorting } from './catalog-sorting.js';
import { mountCatalogRename } from './catalog-rename.js';

export function mountMiniStremio({ state, root, lifetime, updateUI }) {
  const view = root.querySelector('#stremioCatalogStep');
  let signature;
  let sorting;
  const expanded = new Set();
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
    sorting?.clear();
    view.querySelector('[data-stremio-rows]').innerHTML = blocks.map((block, index) => blockMarkup(block, index, { chosen, names, expanded, blockCount: blocks.length })).join('');
    sorting?.refresh();
  };
  const changed = () => { signature = null; if (state.stremio.completed) state.stremio.completionId = null; state.stremio.completed = false; render(); updateUI(); };
  const manager = mountStremioCatalogManager({ root, lifetime, state, catalogs, changed });
  sorting = mountCatalogSorting({ view, state, lifetime, changed });
  const rename = mountCatalogRename({ root, lifetime, state, changed });
  lifetime.on(view, 'click', event => {
    if (event.target.closest('[data-stremio-manage]')) manager.open();
    const toggle = event.target.closest('[data-block-toggle]');
    if (toggle) {
      const block = toggle.closest('[data-block-key]');
      const open = !expanded.has(block.dataset.blockKey);
      if (open) expanded.add(block.dataset.blockKey); else expanded.delete(block.dataset.blockKey);
      block.dataset.expanded = String(open); toggle.setAttribute('aria-expanded', String(open));
      block.querySelector('.stremio-block-body').inert = !open;
    }
    const edit = event.target.closest('[data-row-edit]');
    if (edit) rename.open(edit.dataset.rowEdit, edit.closest('li').querySelector('.stremio-row-name>span').textContent);
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
