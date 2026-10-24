export function createPosterRow({ row, queue, reverse, onReady }) {
  const width = Math.ceil(window.innerHeight / 3);
  const count = Math.ceil(window.innerWidth / width) + 3;
  const track = document.createElement('div');
  track.className = 'poster-wall-track';
  track.style.setProperty('--poster-width', width + 'px');
  track.style.setProperty('--poster-step', (row.closest('[data-poster-theme="interior"]') ? 105 : 75) / 8 + 's');
  if (reverse) track.classList.add('is-reversed');
  const fill = (image, retry = false) => {
    if (!retry) image.dataset.failures = '0';
    image.onerror = failed;
    const item = queue.next();
    image.src = 'https://image.tmdb.org/t/p/' + (window.innerWidth < 640 ? 'w185' : 'w342') + item.posterPath;
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
  track.replaceChildren(...Array.from({ length: count }, makeImage));
  const cycle = event => {
    if (event.target !== track) return;
    const image = reverse ? track.lastElementChild : track.firstElementChild;
    fill(image);
    if (reverse) track.prepend(image);
    else track.append(image);
  };
  track.addEventListener('animationiteration', cycle);
  row.replaceChildren(track);
  return () => {
    track.removeEventListener('animationiteration', cycle);
    track.querySelectorAll('img').forEach(image => { image.onload = null; image.onerror = null; });
    track.remove();
  };
}
