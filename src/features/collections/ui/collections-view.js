import { renderToolbar } from './toolbar.js';
import { renderHeroBanner } from './hero-banner.js';
import { renderSectionView } from './section-view.js';

export function renderCollectionsView(collections, focusedFolder) {
  if (!collections.length) return '<p class="p-8 text-center text-white/50">Cargando colecciones nativas de Nuvio...</p>';
  const folders = collections.flatMap(section => (section.folders || [])
    .map(folder => ({ enabled: section.enabled !== false && folder.enabled !== false })));
  return `<div class="flex flex-col gap-5">
    ${renderToolbar({ totalFolders: folders.length, activeFolders: folders.filter(folder => folder.enabled).length })}
    ${renderHeroBanner(focusedFolder)}
    <div id="miniNuvioSectionsList" class="space-y-6">${collections.map((section, sIndex) =>
    renderSectionView({ section, sIndex, totalSections: collections.length, focusedFolder })).join('')}</div></div>`;
}
