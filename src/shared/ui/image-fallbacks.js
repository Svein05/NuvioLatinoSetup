const fallbacks = {
  avatar: '/assets/icons/avatar-placeholder.svg',
  addon: '/assets/icons/addon-placeholder.svg',
};

/** Presentation-only fallback: never mutate a profile or its selected avatar URL. */
export function initImageFallbacks(root = document) {
  const replace = image => {
    const fallback = fallbacks[image?.dataset?.imageFallback];
    if (fallback && image.getAttribute('src') !== fallback) image.src = fallback;
  };
  const onError = event => replace(event.target);
  root.addEventListener('error', onError, true);
  root.querySelectorAll('img[data-image-fallback]').forEach(image => {
    if (image.complete && !image.naturalWidth) replace(image);
  });
  return () => root.removeEventListener('error', onError, true);
}
