import { posterResolution } from '../../media/poster-resolution.js';

function promoteImage(image, size, isActive) {
  const previous = image.src;
  if (Number(previous.match(/\/w(185|342|500|780)\//)?.[1]) >= size) return;
  const source = previous.replace(/\/w(185|342|500|780)\//, '/w' + size + '/');
  if (previous === source || !previous.startsWith('https://image.tmdb.org/t/p/')) return;
  const candidate = new Image();
  candidate.src = source;
  candidate.decode().then(() => {
    if (isActive() && image.src === previous) image.src = source;
  }).catch(() => { /* Keep the decoded cached image when its upgrade is unavailable. */ });
}

export function createPosterRow({ row, queue, reverse, onReady }) {
  const width = Math.ceil(row.clientHeight * 2 / 3);
  const count = Math.ceil(window.innerWidth / width) + 3;
  const size = posterResolution(width, window.devicePixelRatio);
  let active = true;
  const track = row.querySelector('.poster-wall-track') || document.createElement('div');
  track.className = 'poster-wall-track';
  track.style.setProperty('--poster-width', width + 'px');
  track.style.setProperty('--poster-step', (row.closest('[data-poster-theme="interior"]') ? 105 : 75) / 8 + 's');
  if (reverse) track.classList.add('is-reversed');
  const fill = (image, retry = false) => {
    if (!retry) image.dataset.failures = '0';
    image.onerror = failed;
    const item = queue.next();
    image.src = 'https://image.tmdb.org/t/p/w' + size + item.posterPath;
  };
  const failed = event => {
    const image = event.currentTarget;
    const failures = Number(image.dataset.failures || 0) + 1;
    image.dataset.failures = String(failures);
    if (failures < 3) fill(image, true);
    else { image.onerror = null; image.src = '/assets/preview/landing/inception.jpg'; }
  };
  const makeImage = () => {
    const image = document.createElement('img');
    image.alt = '';
    image.width = width;
    image.height = Math.ceil(width * 1.5);
    image.decoding = 'async';
    image.onload = onReady;
    fill(image);
    return image;
  };
  if (!track.children.length) track.replaceChildren(...Array.from({ length: count }, makeImage));
  else track.querySelectorAll('img').forEach(image => {
    image.onload = onReady; image.onerror = failed;
    promoteImage(image, size, () => active);
  });
  const cycle = event => {
    if (event.target !== track) return;
    const image = reverse ? track.lastElementChild : track.firstElementChild;
    fill(image);
    if (reverse) track.prepend(image);
    else track.append(image);
  };
  track.addEventListener('animationiteration', cycle);
  if (track.parentElement !== row) row.replaceChildren(track);
  return preserve => {
    active = false;
    track.removeEventListener('animationiteration', cycle);
    track.querySelectorAll('img').forEach(image => { image.onload = null; image.onerror = null; });
    if (!preserve) track.remove();
  };
}
