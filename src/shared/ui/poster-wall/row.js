import { posterResolution } from '../../media/poster-resolution.js';
import { decodeImage, mountDecodedStrip } from '../../media/decoded-strip.js';

export function createPosterRow({ row, queue, reverse, onReady }) {
  const width = Math.ceil(row.clientHeight * 2 / 3);
  const count = Math.ceil(window.innerWidth / width) + 3;
  const size = posterResolution(width, window.devicePixelRatio);
  const duration = (row.closest('[data-poster-theme="interior"]') ? 105 : 75) / 8 * 1000;
  const track = row.querySelector('.poster-wall-track') || document.createElement('div');
  let active = true;
  let stop = () => {};
  track.className = 'poster-wall-track' + (reverse ? ' is-reversed' : '');
  track.style.setProperty('--poster-width', width + 'px');
  track.style.setProperty('--poster-step', duration / 1000 + 's');
  const makeImage = source => {
    const image = new Image(width, Math.ceil(width * 1.5));
    image.alt = '';
    image.decoding = 'async';
    image.src = source;
    return image;
  };
  const prepare = async () => {
    for (let attempt = 0; attempt < 3 && active; attempt++) {
      const item = queue.next();
      try { return await decodeImage(makeImage('https://image.tmdb.org/t/p/w' + size + item.posterPath)); }
      catch { /* Keep the old decoded frame if replacement artwork is unavailable. */ }
    }
    return null;
  };
  async function start() {
    const existing = [...track.querySelectorAll('img')];
    const images = await Promise.all(Array.from({ length: count }, async (_, index) => {
      const previous = existing[index];
      if (previous) {
        previous.width = width;
        previous.height = Math.ceil(width * 1.5);
        try { await decodeImage(previous); } catch { return await prepare() || previous; }
        const source = previous.src.replace(/\/w(185|342|500|780)\//, '/w' + size + '/');
        const currentSize = Number(previous.src.match(/\/w(185|342|500|780)\//)?.[1]);
        if (currentSize < size) {
          try { return await decodeImage(makeImage(source)); } catch { /* Retain current artwork. */ }
        }
        return previous;
      }
      return await prepare() || await decodeImage(makeImage('/assets/preview/landing/inception.jpg')).catch(() => null);
    }));
    if (!active || images.some(image => !image?.naturalWidth)) return;
    track.replaceChildren(...images);
    if (track.parentElement !== row) row.replaceChildren(track);
    onReady();
    stop = mountDecodedStrip({ track, distance: width, duration, reverse, prepare });
  }
  void start();
  return preserve => {
    active = false;
    stop();
    if (!preserve) track.remove();
  };
}
