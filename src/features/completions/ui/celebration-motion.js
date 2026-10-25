export function visibleElement(element) {
  if (!element || (element.checkVisibility && !element.checkVisibility())) return false;
  if (getComputedStyle(element).visibility === 'hidden') return false;
  for (let parent = element; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    if (parent.inert || parent.hidden || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) <= .01) return false;
  }
  const box = element.getBoundingClientRect();
  return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
}

export async function waitForProgress(element, signal) {
  const animations = element?.getAnimations() || [];
  if (!animations.length || signal.aborted) return;
  let stop;
  const aborted = new Promise(resolve => { stop = resolve; signal.addEventListener('abort', stop, { once: true }); });
  try { await Promise.race([Promise.allSettled(animations.map(animation => animation.finished)), aborted]); }
  finally { signal.removeEventListener('abort', stop); }
}

export async function animateEffect(element, frames, options, signal) {
  if (signal.aborted) return;
  const animation = element.animate(frames, { fill: 'forwards', ...options });
  const cancel = () => animation.cancel();
  signal.addEventListener('abort', cancel, { once: true });
  try { await animation.finished; } catch { /* Cancellation settles the confirmed number immediately. */ }
  finally { signal.removeEventListener('abort', cancel); animation.cancel(); }
}

export function waitEffect(duration, signal) {
  return new Promise(resolve => {
    if (signal.aborted) return resolve();
    const finish = () => { clearTimeout(timer); signal.removeEventListener('abort', finish); resolve(); };
    const timer = setTimeout(finish, duration);
    signal.addEventListener('abort', finish, { once: true });
  });
}

export function flightFrames(start, end) {
  const bend = Math.min(120, innerWidth * .15);
  return Array.from({ length: 33 }, (_, index) => {
    const t = index / 32, u = 1 - t;
    const x = u * u * start.x + 2 * u * t * Math.max(16, end.x - bend) + t * t * end.x;
    const y = u * u * start.y + 2 * u * t * Math.max(20, end.y - 80) + t * t * end.y;
    return { transform: `translate(${x}px,${y}px) rotate(${540 * t}deg) scale(${1 - .6 * t})`, offset: t };
  });
}
