export function posterPlaybackRate(progress) {
  const value = Math.max(0, Math.min(1, progress));
  const eased = value * value * (3 - 2 * value);
  return 1 - eased * .72;
}

/** Adjust CSS animation speed without changing its duration or restarting its phase. */
export function createPosterMotion(root) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 639px), (hover: none) and (pointer: coarse)');
  const interior = root.dataset.posterTheme === 'interior';
  let frame = 0;
  let end = 1;
  const paint = () => {
    frame = 0;
    const progress = interior ? 0 : Math.min(1, Math.max(0, window.scrollY / end));
    root.style.setProperty('--wall-visibility', interior ? '.22' : String(.9 - progress * .72));
    const paused = media.matches || document.hidden || (mobile.matches && progress === 1);
    root.classList.toggle('is-paused', paused);
    if (paused) return;
    const rate = interior ? 1 : posterPlaybackRate(progress);
    root.querySelectorAll('.poster-wall-track').forEach(track => {
      track.getAnimations().forEach(animation => {
        if (Math.abs(animation.playbackRate - rate) > .001) animation.updatePlaybackRate(rate);
      });
    });
  };
  const schedule = () => {
    if (mobile.matches && window.scrollY >= end && root.classList.contains('is-paused')) return;
    if (!frame) frame = requestAnimationFrame(paint);
  };
  const refresh = () => {
    const chapter = document.querySelector('[data-chapter]');
    end = Math.max(1, chapter ? chapter.getBoundingClientRect().top + window.scrollY - root.clientHeight * .18
      : Math.max(600, root.clientHeight));
    paint();
  };
  document.addEventListener('visibilitychange', paint);
  window.addEventListener('scroll', schedule, { passive: true });
  media.addEventListener('change', paint);
  mobile.addEventListener('change', paint);
  return { refresh, dispose() {
    cancelAnimationFrame(frame);
    document.removeEventListener('visibilitychange', paint);
    window.removeEventListener('scroll', schedule);
    media.removeEventListener('change', paint);
    mobile.removeEventListener('change', paint);
  } };
}
