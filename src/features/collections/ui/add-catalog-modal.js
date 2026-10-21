import { escapeHtml } from '../../../shared/ui/safe-markup.js';
import { collectionAction } from './actions.js';
function renderCatalogItem(cat, isAlreadyAdded, sectionId, folderId) {
  const typeLabel = cat.type === 'series' || cat.displayType === 'series' ? 'Series' : cat.type === 'anime' ? 'Anime' : 'Películas';
  const actionBtn = isAlreadyAdded
    ? '<span class="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-white/40 font-mono">En uso</span>'
    : `<button type="button" ${collectionAction('doAddCatalog', sectionId, folderId, cat.id)} class="lat-capsule-btn solid text-xs py-1 px-3"><i class="fa-solid fa-plus text-[10px]"></i> <span>Añadir</span></button>`;

  return `
    <div class="p-2.5 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-between gap-3 hover:border-white/20 transition-colors">
      <div class="min-w-0">
        <h4 class="text-xs font-semibold text-white truncate">${escapeHtml(cat.name || cat.id)}</h4>
        <p class="text-[10px] text-white/40 font-mono truncate">${escapeHtml(cat.id)} • ${typeLabel}</p>
      </div>
      <div>${actionBtn}</div>
    </div>
  `;
}

export function openAddCatalogModalView({
  sectionId,
  folderId,
  folderTitle,
  allCatalogs,
  currentIds,
  doc = document,
}) {
  const existing = doc.getElementById('addCatalogModal');
  if (existing) existing.remove();

  const addEl = doc.createElement('div');
  addEl.id = 'addCatalogModal';
  addEl.setAttribute?.('role', 'dialog');
  addEl.className = 'fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-[#08090c]/85 backdrop-blur-xl';
  addEl.innerHTML = `
    <div class="bg-[#0b0d12]/95 border border-white/10 rounded-3xl max-w-xl w-full p-5 shadow-[var(--shadow-lift)] backdrop-blur-[34px] flex flex-col max-h-[85vh] text-white/90">
      <div class="flex items-center justify-between border-b border-white/10 pb-3 mb-3 shrink-0">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-white/[0.06] text-[#ffd479] border border-white/10 flex items-center justify-center"><i class="fa-solid fa-plus text-xs"></i></div>
          <div><h3 class="text-sm font-bold text-white">Añadir Catálogo a "${escapeHtml(folderTitle)}"</h3><p class="text-[11px] text-white/50">Selecciona un catálogo disponible de la biblioteca</p></div>
        </div>
        <button type="button" data-close-collection-modal class="text-white/40 hover:text-white p-1 rounded-full hover:bg-white/10"><i class="fa-solid fa-xmark text-sm"></i></button>
      </div>
      <div class="mb-3 shrink-0">
        <div class="relative"><i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-xs"></i><input id="searchAddCatalogInput" type="text" placeholder="Buscar por título, streaming, anime, género..." class="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 focus:outline-none focus:border-[#ffd479] text-xs text-white"></div>
      </div>
      <div id="addCatalogList" class="overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-white/10 flex-1"></div>
      <div class="pt-3 mt-3 border-t border-white/10 flex justify-end shrink-0">
        <button type="button" data-close-collection-modal class="lat-capsule-btn glass text-xs py-1.5 px-4">Cerrar</button>
      </div>
    </div>
  `;

  doc.body.appendChild(addEl);
  const renderList = (filter = '') => {
    const listEl = doc.getElementById('addCatalogList');
    if (!listEl) return;
    const lower = filter.toLowerCase().trim();
    const filtered = allCatalogs.filter(c => c?.id && (!lower || (c.name || '').toLowerCase().includes(lower) || c.id.toLowerCase().includes(lower)));
    if (filtered.length === 0) {
      listEl.innerHTML = `<div class="p-6 text-center text-white/40 text-xs">No se encontraron catálogos con "${escapeHtml(filter)}".</div>`;
      return;
    }
    listEl.innerHTML = filtered.slice(0, 80).map(cat => renderCatalogItem(cat, currentIds.has(cat.id), sectionId, folderId)).join('');
  };

  renderList();
  const searchInput = doc.getElementById('searchAddCatalogInput');
  if (searchInput) {
    searchInput.oninput = (e) => renderList(e.target.value);
    searchInput.focus();
  }
}
