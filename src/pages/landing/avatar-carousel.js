export function avatarPaths(manifest) {
  return manifest.styles.flatMap(({ style, franchises }) =>
    franchises.flatMap(({ franchise, files }) => files.map(file =>
      `/assets/profile_icons/${[style, franchise, file].map(encodeURIComponent).join('/')}`)));
}

/** Recycle a bounded strip through the entire bundled GitHub catalog. */
export function initAvatarCarousel(manifest, root = document) {
  const track = root.querySelector('[data-avatar-carousel]');
  if (!track) return () => {};
  const paths = avatarPaths(manifest);
  let cursor = 0;
  const nextImage = () => {
    const image = document.createElement('img');
    image.src = paths[cursor++ % paths.length];
    image.width = 56;
    image.height = 56;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    return image;
  };
  track.replaceChildren(...Array.from({ length: Math.min(14, paths.length) }, nextImage));
  const advance = event => {
    if (event.target !== track) return;
    const image = track.firstElementChild;
    image.src = paths[cursor++ % paths.length];
    track.append(image);
  };
  track.addEventListener('animationiteration', advance);
  return () => track.removeEventListener('animationiteration', advance);
}
