/** Decorative scenes are prepared near the viewport, without delaying real controls. */
export function initDeferredImages(root = document) {
  const reveal = image => {
    for (const name of ['sizes', 'srcset', 'src']) {
      const value = image.getAttribute('data-deferred-' + name);
      if (value) image.setAttribute(name, value);
      image.removeAttribute('data-deferred-' + name);
    }
  };
  const images = [...root.querySelectorAll('img[data-deferred-src]')];
  if (!globalThis.IntersectionObserver) { images.forEach(reveal); return () => {}; }
  const groups = new Map();
  images.forEach(image => {
    const scene = image.closest('.story-stage, .account-showcase-panels') || image;
    if (!groups.has(scene)) groups.set(scene, []);
    groups.get(scene).push(image);
  });
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      groups.get(entry.target)?.forEach(reveal);
      groups.delete(entry.target);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '200px' });
  groups.forEach((_images, scene) => observer.observe(scene));
  return () => observer.disconnect();
}
