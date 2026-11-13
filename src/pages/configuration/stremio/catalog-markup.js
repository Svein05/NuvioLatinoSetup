import { catalogKey, METADATA_BLOCK } from '../../../features/stremio-setup/index.js';
import { escapeHtml } from '../../../shared/ui/safe-markup.js';

const typeLabel = type => type === 'movie' ? 'Películas' : type === 'series' ? 'Series' : type === 'anime' ? 'Anime' : type;
const grip = kind => `<span class="stremio-drag-handle" data-drag-${kind} title="Arrastrar para ordenar"><i class="fa-solid fa-grip-vertical" aria-hidden="true"></i></span>`;

function moveButtons(attribute, index, total, title) {
  return [-1, 1].map(direction => `<button type="button" ${attribute}="${index}" data-direction="${direction}" ${index + direction < 0 || index + direction >= total ? 'disabled' : ''} aria-label="${direction < 0 ? 'Subir' : 'Bajar'} ${escapeHtml(title)}"><i class="fa-solid fa-chevron-${direction < 0 ? 'up' : 'down'}" aria-hidden="true"></i></button>`).join('');
}

function metadataRow(catalog, index, context) {
  const key = catalogKey(catalog);
  const title = context.names[key] || catalog.title;
  return `<li class="stremio-catalog-row" data-row-key="${escapeHtml(key)}">${grip('row')}<div class="stremio-row-name"><span>${escapeHtml(title)}</span><small>${escapeHtml(typeLabel(catalog.type))}${catalog.group === 'Conexiones' ? ' · Incluido por tu conexión' : ''}</small></div><div class="stremio-row-actions">${moveButtons('data-row-move', index, context.total, title)}<button type="button" data-row-edit="${escapeHtml(key)}" aria-label="Editar nombre de ${escapeHtml(title)}"><i class="fa-solid fa-pen" aria-hidden="true"></i></button><button type="button" data-row-remove="${escapeHtml(key)}" aria-label="Quitar ${escapeHtml(title)}"><i class="fa-solid fa-minus" aria-hidden="true"></i></button></div></li>`;
}

export function blockMarkup(block, index, context) {
  const metadata = block.key === METADATA_BLOCK;
  const open = context.expanded.has(block.key);
  const count = metadata ? context.chosen.length : block.catalogs.length;
  const rows = metadata ? context.chosen.map((catalog, position) => metadataRow(catalog, position, { names: context.names, total: count })).join('') : block.catalogs.map(catalog => `<li class="stremio-catalog-row"><i class="fa-solid fa-list text-white/40" aria-hidden="true"></i><div class="stremio-row-name"><span>${escapeHtml(catalog.name || catalog.id)}</span><small>${escapeHtml(typeLabel(catalog.type))}</small></div></li>`).join('');
  return `<section class="stremio-catalog-block" data-block-key="${escapeHtml(block.key)}" data-expanded="${open}"><header>${grip('block')}<button type="button" class="stremio-block-toggle" data-block-toggle aria-expanded="${open}" aria-controls="stremioBlock${index}"><span>${escapeHtml(block.title)} <small>${count} filas</small></span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></button><div class="stremio-row-actions">${moveButtons('data-block-move', index, context.blockCount, block.title)}</div></header><div id="stremioBlock${index}" class="stremio-block-body" ${open ? '' : 'inert'}><div><ol ${metadata ? 'data-sortable-rows' : ''}>${rows}</ol></div></div></section>`;
}
