import { createPosterQueue } from './queue.js';
import { createPosterRow } from './row.js';
import { createPosterMotion } from './motion.js';

function prepareFeed(root, feed) {
  if (!feed) return;
  if (root.dataset.posterStamp !== feed.generatedAt) root.querySelectorAll('.poster-wall-track').forEach(track => track.remove());
  root.dataset.posterStamp = feed.generatedAt;
}

export function initPosterWall({ root, feed, storage }) {
  const queue = feed ? createPosterQueue(feed.items, { storage }) : null;
  prepareFeed(root, feed);
  let rows = [];
  let resizeTimer;
  let width = window.innerWidth;
  const motion = createPosterMotion(root);
  const ready = () => {
    const images = [...root.querySelectorAll('.poster-wall-track img')];
    if (images.length && images.every(image => image.complete && image.naturalWidth > 0)) root.classList.add('is-ready');
  };
  const build = () => {
    rows.forEach(dispose => dispose());
    if (!queue) { motion.refresh(); return; }
    rows = [...root.querySelectorAll('[data-poster-row]')].map((row, index) =>
      createPosterRow({ row, queue, reverse: index === 1, onReady: ready }));
    motion.refresh();
  };
  const resize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (width !== window.innerWidth) { width = window.innerWidth; build(); }
      else motion.refresh();
    }, 120);
  };
  window.addEventListener('resize', resize);
  build();
  return preserve => {
    motion.dispose();
    clearTimeout(resizeTimer);
    rows.forEach(dispose => dispose(preserve));
    window.removeEventListener('resize', resize);
    if (!preserve) root.classList.remove('is-ready');
  };
}
