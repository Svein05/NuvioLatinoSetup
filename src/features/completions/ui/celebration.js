import { animateEffect, flightFrames, visibleElement, waitEffect, waitForProgress } from './celebration-motion.js';

function createStar(root) {
  const star = root.createElement('div');
  star.className = 'completion-star';
  star.setAttribute('aria-hidden', 'true');
  star.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 1.8 3.15 6.38 7.05 1.02-5.1 4.97 1.2 7.03L12 17.88l-6.3 3.32 1.2-7.03-5.1-4.97 7.05-1.02Z"/></svg>';
  root.body.append(star);
  return star;
}

async function travel({ root, star, target, signal }) {
  const bar = root.querySelector('#injectionProgressBar');
  const source = visibleElement(bar) ? bar : root.activeElement;
  if (!visibleElement(source)) return;
  if (bar === source) await waitForProgress(bar, signal);
  if (signal.aborted) return;
  const box = source.getBoundingClientRect();
  const start = { x: Math.max(16, Math.min(innerWidth - 16, box.right)),
    y: Math.max(16, Math.min(innerHeight - 16, box.top + box.height / 2)) };
  const transform = `translate(${start.x}px,${start.y}px)`;
  star.style.transform = transform;
  if (!target || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    await animateEffect(star, [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 280 }, signal);
    return;
  }
  await animateEffect(star, [{ opacity: 0, transform: transform + ' scale(.6)' },
    { opacity: 1, transform: transform + ' scale(1)' }], { duration: 140 }, signal);
  if (signal.aborted) return;
  star.style.opacity = '1';
  const destination = target.getBoundingClientRect();
  await animateEffect(star, flightFrames(start, { x: destination.left + destination.width / 2,
    y: destination.top + destination.height / 2 }), { duration: 800, easing: 'cubic-bezier(.25,.1,.25,1)' }, signal);
}

/** Registration is already confirmed: effects may delay presentation, never the write. */
export function createCompletionCelebration(root = document) {
  let job;
  const cancel = () => {
    if (!job) return;
    job.controller.abort();
    job.commit();
    job.star.remove();
    job.target?.classList.remove('is-celebrating');
    job = null;
  };
  const visibility = () => { if (root.hidden) cancel(); };
  window.addEventListener('resize', cancel);
  window.addEventListener('scroll', cancel, { passive: true });
  root.addEventListener('visibilitychange', visibility);
  return {
    async play(update) {
      cancel();
      if (root.hidden || !Element.prototype.animate) { update(); return; }
      const target = [...root.querySelectorAll('.completions-counter-pill')].find(visibleElement);
      let committed = false;
      const current = { star: createStar(root), target, controller: new AbortController(),
        commit: () => { if (!committed) { committed = true; update(); } } };
      job = current;
      const signal = current.controller.signal;
      try {
        await travel({ root, star: current.star, target, signal });
        current.star.remove();
        if (signal.aborted) return;
        target?.classList.add('is-celebrating');
        await waitEffect(matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 320, signal);
        current.commit();
        await waitEffect(1800, signal);
      } finally { if (job === current) cancel(); }
    },
    dispose() {
      cancel();
      window.removeEventListener('resize', cancel);
      window.removeEventListener('scroll', cancel);
      root.removeEventListener('visibilitychange', visibility);
    },
  };
}
