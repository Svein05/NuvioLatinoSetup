/** Hold each step's endpoint until a decoded replacement can be committed atomically. */
export function mountDecodedStrip({ track, distance, duration, reverse = false, prepare }) {
  if (!track.animate) return () => {};
  let active = true;
  let animation;
  let replacement;
  let intersecting = true;
  let rate = 1;
  let phase = Number(track.dataset.stripPhase || 0);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const frames = [
    { transform: `translateX(${reverse ? -distance : 0}px)` },
    { transform: `translateX(${reverse ? 0 : -distance}px)` },
  ];
  const shouldPause = () => document.hidden || reduced.matches || !intersecting;
  const synchronize = () => {
    if (!animation || animation.playState === 'finished') return;
    if (shouldPause()) animation.pause();
    else animation.play();
  };
  const preload = () => Promise.resolve().then(prepare).catch(() => null);
  async function step() {
    if (!active) return;
    animation = track.animate(frames, { duration, easing: 'linear', fill: 'both' });
    animation.currentTime = Math.min(.999, phase) * duration;
    animation.playbackRate = rate;
    synchronize();
    try { await animation.finished; } catch { return; }
    const image = await replacement;
    if (!active) return;
    rate = animation.playbackRate;
    const departing = reverse ? track.lastElementChild : track.firstElementChild;
    const next = image || departing;
    departing.remove();
    if (reverse) track.prepend(next);
    else track.append(next);
    animation.cancel();
    phase = 0;
    replacement = preload();
    void step();
  }
  const observer = window.IntersectionObserver ? new IntersectionObserver(entries => {
    intersecting = entries[0].isIntersecting;
    synchronize();
  }, { rootMargin: '150px' }) : null;
  observer?.observe(track.parentElement);
  document.addEventListener('visibilitychange', synchronize);
  reduced.addEventListener('change', synchronize);
  replacement = preload();
  void step();
  return () => {
    active = false;
    track.dataset.stripPhase = String(Math.min(.999, Number(animation?.currentTime || 0) / duration));
    animation?.cancel();
    observer?.disconnect();
    document.removeEventListener('visibilitychange', synchronize);
    reduced.removeEventListener('change', synchronize);
  };
}

export async function decodeImage(image) {
  if (image.decode) await image.decode();
  else if (!image.complete) await new Promise((resolve, reject) => {
    image.addEventListener('load', resolve, { once: true });
    image.addEventListener('error', reject, { once: true });
  });
  if (!image.naturalWidth) throw new Error('Image unavailable');
  return image;
}
