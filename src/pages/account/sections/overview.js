import { renderRequestError } from '../../../shared/ui/request-error.js';

const fallbackPoster = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80';

function node(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function subtitle(item) {
  const type = String(item.content_type || item.type || 'Película').toLowerCase();
  if (['series', 'tv'].includes(type) || item.season != null) {
    return item.season != null && item.episode != null ? `T${item.season} : E${item.episode}` : 'Serie';
  }
  return 'Película';
}

function progressPercent(item) {
  if (item.duration > 0 && (item.position || item.progress)) {
    return Math.min(100, Math.max(5, Math.round(((item.position || item.progress) / item.duration) * 100)));
  }
  return item.progress_percentage ? Math.min(100, Math.max(5, Number(item.progress_percentage))) : 40;
}

function posterSource(value) {
  try {
    const url = new URL(value || fallbackPoster, window.location.href);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : fallbackPoster;
  } catch { return fallbackPoster; }
}

function cinemaCard({ item, details }, progress) {
  const title = details?.title || item.title || item.name || 'Contenido Nuvio';
  const card = node('div', 'nuvio-cinema-card group select-none');
  const poster = node('div', 'relative w-full aspect-[2/3] overflow-hidden bg-black/60');
  const image = node('img', 'poster-img');
  image.src = posterSource(details?.poster_path || item.poster_url || item.poster);
  image.alt = title;
  image.loading = 'lazy';
  image.addEventListener('error', () => { image.src = fallbackPoster; }, { once: true });
  poster.append(image, node('div', 'card-gradient-overlay'));
  if (progress) {
    const bar = node('div', 'card-progress-bar');
    bar.style.width = `${progressPercent(item)}%`;
    poster.append(bar);
  }
  const caption = node('div', 'p-2.5');
  const heading = node('h5', `text-xs font-semibold text-white truncate transition-colors ${progress ? 'group-hover:text-[#ffd479]' : 'group-hover:text-emerald-300'}`, title);
  heading.title = title;
  caption.append(heading, node('span', 'text-[10px] text-white/40 font-mono', subtitle(item)));
  card.append(poster, caption);
  return card;
}

export function renderOverviewMetrics(data, { addonsCount, settings }) {
  for (const [id, value, error] of [
    ['metricPluginsCount', data.pluginsCount, 'plugins'],
    ['metricAddonsCount', addonsCount || data.addonsCount],
    ['metricProgressCount', data.progressCount, 'progressItems'],
    ['metricLibraryCount', data.libraryCount, 'libraryItems'],
    ['metricWatchedCount', data.watchedCount, 'watchedItems'],
  ]) {
    const element = document.getElementById(id);
    if (element) element.textContent = data.loadErrors?.[error] ? '—' : value;
  }
  const visible = Boolean(settings.enrichment_enabled && settings.tmdb_api_key?.trim());
  document.getElementById('overviewCinemaContainer')?.classList.toggle('hidden', !visible);
  document.getElementById('overviewTmdbNotice')?.classList.toggle('hidden', visible);
  return visible;
}

export function renderOverviewRow(cards, { progress, error, loading = false }) {
  const container = document.getElementById(progress ? 'rowCurrentlyWatchingCards' : 'rowRecentlyWatchedCards');
  if (!container) return;
  if (error) {
    renderRequestError(container, `No se pudo cargar ${progress ? 'el progreso' : 'el historial'} de Nuvio. Recarga la página para reintentar.`);
    return;
  }
  if (loading) {
    container.replaceChildren(node('div', 'col-span-full py-4 text-center text-xs text-white/40', 'Cargando metadatos en Latino...'));
    return;
  }
  if (cards.length) {
    container.replaceChildren(...cards.map(card => cinemaCard(card, progress)));
    return;
  }
  const empty = node('div', 'col-span-full py-8 text-center text-xs text-white/40 bg-white/[0.02] border border-white/[0.06] rounded-2xl');
  empty.append(node('i', `fa-solid fa-${progress ? 'play' : 'check'} text-white/20 text-lg mb-1 block`),
    document.createTextNode(progress ? 'Sin reproducciones en curso en este perfil.' : 'Sin contenidos marcados como vistos en este perfil.'));
  container.replaceChildren(empty);
}
