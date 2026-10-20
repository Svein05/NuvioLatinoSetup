import { escapeHtml, safeImageUrl } from '../../../shared/ui/safe-markup.js';

const nativePoster = 'https://upload.wikimedia.org/wikipedia/en/3/32/Superman_%282025_film%29_poster.jpg';
const engines = [
  { id: 'default', card: 'cardPosterDefault', label: 'Default (Nativo)', preview: nativePoster },
  { id: 'betterposter', card: 'cardPosterBetter', label: 'BetterPoster', site: 'https://btttr.cc',
    preview: 'https://btttr.cc/poster/imdb/poster-default/tt5950044.jpg?lang=es-MX&rs=IM' },
  { id: 'postersplus', card: 'cardPosterPlus', label: 'PostersPlus', site: 'https://postersplus.stremio.ru',
    preview: 'https://postersplus.stremio.ru/poster?imdb_id=tt5950044&type=movie' },
];

function posterCard(engine, { currentEngine, customUrl }) {
  const external = engine.id === 'default' && currentEngine === 'custom_external';
  const active = engine.id === currentEngine || external;
  const preview = external ? safeImageUrl(customUrl.replace(/\{imdb_id\??\}|\{id\??\}/g, 'tt5950044')
    .replace(/\{tmdb_id\??\}/g, '1061474').replace(/\{type\??\}/g, 'movie'), nativePoster) : engine.preview;
  return `<div id="${engine.card}" data-poster-engine="${engine.id}" role="button" tabindex="0"
    aria-pressed="${active}" class="poster-option-card p-4 rounded-2xl bg-white/[0.03] border-2
    ${active ? 'border-[#ffd479]' : 'border-white/10'} cursor-pointer space-y-3">
    <span class="text-xs font-semibold text-white">${external ? 'Motor Personalizado' : engine.label}</span>
    <div class="w-36 aspect-[2/3] mx-auto rounded-xl overflow-hidden bg-black/40 border border-white/10">
      <img src="${escapeHtml(preview)}" alt="Vista previa ${engine.label}" class="w-full h-full object-cover"></div>
    ${engine.site ? `<a href="${engine.site}" target="_blank" rel="noopener noreferrer" class="text-xs text-[#ffd479]">Personalizar</a>` : ''}
    ${engine.site || external ? `<label class="block text-xs text-white/60">URL propia
      <input data-poster-url="${external ? 'custom_external' : engine.id}" type="url" class="lat-field w-full text-xs"
        value="${escapeHtml(active ? customUrl : '')}" placeholder="https://..."></label>` : ''}
    ${external ? '<button type="button" data-reset-poster class="lat-capsule-btn glass text-xs">Cambiar a TMDB Limpio</button>' : ''}
  </div>`;
}

export function renderMetadataPosters(options) {
  return `<div class="space-y-3"><h4 class="text-sm font-semibold">Motor de Carátulas & Calificaciones</h4>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">${engines.map(engine => posterCard(engine, options)).join('')}</div></div>`;
}

export function bindMetadataPosters(root, { onEngineChange, onCustomUrlChange }) {
  root.querySelectorAll('[data-poster-engine]').forEach(card => {
    card.addEventListener('click', event => {
      if (!event.target.closest('input,a,button,label')) onEngineChange?.(card.dataset.posterEngine);
    });
    card.addEventListener('keydown', event => {
      if (event.target === card && ['Enter', ' '].includes(event.key)) {
        event.preventDefault(); onEngineChange?.(card.dataset.posterEngine);
      }
    });
  });
  root.querySelectorAll('[data-poster-url]').forEach(input => input.addEventListener('input', () => {
    onCustomUrlChange?.(input.dataset.posterUrl, input.value.trim());
  }));
  root.querySelector('[data-reset-poster]')?.addEventListener('click', () => onCustomUrlChange?.('default', ''));
}
