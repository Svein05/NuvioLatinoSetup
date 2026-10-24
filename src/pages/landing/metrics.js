import { createMetricView } from './metric-view.js';

/** Two read-only views; counter polling and avatar reads remain owned by composition. */
export function initLandingMetrics({ root = document, subscribe, ranking }) {
  const section = root.querySelector('[data-landing-metrics]');
  if (!section) return () => {};
  const elements = [...section.querySelectorAll('[data-metric]')];
  const views = new Map(elements.map(element => [element, createMetricView(element)]));
  const setups = views.get(section.querySelector('[data-metric="setups"]'));
  const avatars = views.get(section.querySelector('[data-metric="avatars"]'));
  let disposed = false;
  const unsubscribe = subscribe(result => setups.update(result));
  ranking.then(result => {
    if (!disposed) avatars.update({ count: result.totalUsage, source: result.source });
  }).catch(() => { if (!disposed) avatars.update({ source: 'unavailable' }); });
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const observer = window.IntersectionObserver ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio >= .35) {
        views.get(entry.target).reveal(reduced.matches);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: [.35] }) : null;
  elements.forEach(element => observer ? observer.observe(element) : views.get(element).reveal(true));
  const motion = () => { if (reduced.matches) views.forEach(view => view.reveal(true)); };
  reduced.addEventListener('change', motion);
  return () => {
    disposed = true;
    unsubscribe();
    observer?.disconnect();
    reduced.removeEventListener('change', motion);
    views.forEach(view => view.dispose());
  };
}
