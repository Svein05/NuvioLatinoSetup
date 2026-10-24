import { createPosterQueue } from './queue.js';
import { createPosterRow } from './row.js';

const PAUSE_KEY = 'nuvio_poster_wall_paused';

function prepareFeed(root, feed) {
  if (!feed) return;
  if (root.dataset.posterStamp !== feed.generatedAt) root.querySelectorAll('.poster-wall-track').forEach(track => track.remove());
  root.dataset.posterStamp = feed.generatedAt;
}

export function initPosterWall({ root, button, feed, storage }) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const queue = feed ? createPosterQueue(feed.items, { storage }) : null;
  prepareFeed(root, feed);
  let paused = false;
  try { paused = storage.getItem(PAUSE_KEY) === 'true'; } catch { /* Use the default preference. */ }
  let rows = [];
  let frame = 0;
  let resizeTimer;
  let width = window.innerWidth;
  const interior = root.dataset.posterTheme === 'interior';
  const ready = () => root.classList.add('is-ready');
  const paint = () => {
    frame = 0;
    const progress = interior ? 0 : Math.min(1, window.scrollY / Math.max(600, window.innerHeight));
    root.style.setProperty('--wall-visibility', interior ? '.22' : String(.9 - progress * .72));
    root.classList.toggle('is-paused', paused || media.matches || document.hidden || (!interior && progress >= .95));
    button.setAttribute('aria-pressed', String(paused));
    button.setAttribute('aria-label', paused ? 'Reanudar fondo animado' : 'Pausar fondo animado');
    button.textContent = paused ? '▶' : 'Ⅱ';
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
  const build = () => {
    rows.forEach(dispose => dispose());
    if (!queue) { paint(); return; }
    rows = [...root.querySelectorAll('[data-poster-row]')].map((row, index) =>
      createPosterRow({ row, queue, reverse: index === 1, onReady: ready }));
    paint();
  };
  const toggle = () => {
    paused = !paused;
    try { storage.setItem(PAUSE_KEY, String(paused)); } catch { /* Keep the preference in memory. */ }
    paint();
  };
  const resize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (width !== window.innerWidth) { width = window.innerWidth; build(); }
    }, 120);
  };
  button.hidden = !feed;
  button.addEventListener('click', toggle);
  document.addEventListener('visibilitychange', paint);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', resize);
  media.addEventListener('change', paint);
  build();
  return preserve => {
    cancelAnimationFrame(frame);
    clearTimeout(resizeTimer);
    rows.forEach(dispose => dispose(preserve));
    button.hidden = true;
    button.removeEventListener('click', toggle);
    document.removeEventListener('visibilitychange', paint);
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', resize);
    media.removeEventListener('change', paint);
    if (!preserve) root.classList.remove('is-ready');
  };
}
