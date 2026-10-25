import { decodeImage, mountDecodedStrip } from '../../shared/media/decoded-strip.js';

export function avatarPaths(manifest) {
  if (Array.isArray(manifest)) return manifest;
  return manifest.styles.flatMap(({ style, franchises }) =>
    franchises.flatMap(({ franchise, files }) => files.map(file =>
      '/assets/profile_icons/' + [style, franchise, file].map(encodeURIComponent).join('/'))));
}

/** Keep the strip mounted while its ranked source pool changes. */
export function initAvatarCarousel(manifest, root = document) {
  const track = root.querySelector('[data-avatar-carousel]');
  if (!track) return () => {};
  let paths = avatarPaths(manifest);
  let cursor = 0;
  let active = true;
  let started = false;
  let stop = () => {};
  const prepare = async () => {
    for (let attempt = 0; attempt < Math.min(3, paths.length) && active; attempt++) {
      const image = new Image(56, 56);
      image.src = paths[cursor++ % paths.length];
      image.alt = '';
      image.decoding = 'async';
      try { return await decodeImage(image); } catch { /* Skip unavailable catalog artwork. */ }
    }
    return null;
  };
  const start = () => {
    if (started || !active) return;
    started = true;
    Promise.all(Array.from({ length: 14 }, prepare)).then(async images => {
      if (!active || !images.some(Boolean)) return;
      const valid = images.filter(Boolean);
      const complete = await Promise.all(Array.from({ length: 14 }, (_, index) =>
        index < valid.length ? valid[index] : decodeImage(valid[index % valid.length].cloneNode(true)).catch(() => null)));
      if (!active || complete.some(image => !image)) return;
      track.replaceChildren(...complete);
      stop = mountDecodedStrip({ track, distance: 72, duration: 2400, prepare });
    });
  };
  const observer = window.IntersectionObserver ? new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); start(); }
  }, { rootMargin: '200px' }) : null;
  if (observer) observer.observe(track.parentElement);
  else start();
  const dispose = () => { active = false; observer?.disconnect(); stop(); };
  dispose.update = manifest => {
    const next = avatarPaths(manifest);
    if (next.length) paths = next;
  };
  return dispose;
}
