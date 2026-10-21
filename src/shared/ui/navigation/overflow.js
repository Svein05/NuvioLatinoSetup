import { createLifetime } from '../lifetime.js';

const instances = new WeakMap();

export function initNavOverflowMonitor(root = document) {
  const nav = root.querySelector('header.lat-floating-nav');
  if (!nav) return () => {};
  if (instances.has(nav)) return instances.get(nav);
  const lifetime = createLifetime();
  let restoreWidth = 1080;
  const isOverflowing = cluster => cluster && cluster.getBoundingClientRect().right > window.innerWidth - 16;
  function evaluate() {
    const cluster = nav.querySelector('.lat-desktop-nav-cluster');
    if (cluster && getComputedStyle(cluster).display !== 'none' && isOverflowing(cluster)) {
      nav.classList.add('force-compact');
      restoreWidth = Math.max(restoreWidth, window.innerWidth + 12);
      return;
    }
    if (!nav.classList.contains('force-compact') || window.innerWidth < restoreWidth) return;
    nav.classList.remove('force-compact');
    lifetime.frame(() => {
      if (!isOverflowing(cluster)) return;
      nav.classList.add('force-compact');
      restoreWidth = window.innerWidth + 12;
    });
  }
  evaluate();
  document.fonts?.ready.then(() => { if (!lifetime.signal.aborted) evaluate(); });
  lifetime.on(window, 'resize', evaluate, { passive: true });
  if (window.ResizeObserver) {
    const observer = new ResizeObserver(evaluate);
    observer.observe(nav);
    lifetime.add(() => observer.disconnect());
  }
  const dispose = () => { lifetime.dispose(); instances.delete(nav); };
  instances.set(nav, dispose);
  return dispose;
}
