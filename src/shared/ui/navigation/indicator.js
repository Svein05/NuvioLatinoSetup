import { createLifetime } from '../lifetime.js';

const instances = new WeakMap();
const transition = 'all 0.28s cubic-bezier(0.32, 0.72, 0, 1)';

function normalizeLinks(links, selected, hovering = false) {
  links.forEach(link => {
    link.classList.add('lat-nav-tab');
    link.classList.remove('bg-white', 'text-black', 'text-white/70', 'hover:text-white', 'hover:bg-white/[0.08]');
    link.classList.toggle('is-active', !hovering && link === selected);
    link.classList.toggle('is-hovered', hovering && link === selected);
  });
}

function moveIndicator(indicator, target, animate) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  indicator.style.transition = animate && !reduced ? transition : 'none';
  for (const [property, value] of Object.entries({ left: target.offsetLeft, top: target.offsetTop,
    width: target.offsetWidth, height: target.offsetHeight })) indicator.style[property] = `${value}px`;
}

function bindCounterExpansion(header, refresh, lifetime) {
  let tracker;
  lifetime.add(() => tracker?.dispose());
  function track() {
    tracker?.dispose();
    tracker = createLifetime();
    const started = performance.now();
    function step(now) {
      refresh();
      if (now - started < 340) tracker.frame(step);
    }
    tracker.frame(step);
  }
  header.querySelectorAll('.completions-counter-pill').forEach(pill => {
    const update = () => {
      header.classList.toggle('is-counter-expanded', pill.matches(':hover') || pill.classList.contains('is-celebrating'));
      track();
    };
    lifetime.on(pill, 'mouseenter', update);
    lifetime.on(pill, 'mouseleave', update);
    if (window.MutationObserver) {
      const observer = new MutationObserver(update);
      observer.observe(pill, { attributes: true, attributeFilter: ['class'] });
      lifetime.add(() => observer.disconnect());
    }
  });
}

export function initNavIndicator(root = document) {
  const header = root.querySelector('header.lat-floating-nav');
  const nav = header?.querySelector('nav');
  const links = Array.from(nav?.querySelectorAll('a') || []);
  if (!nav || !links.length) return () => {};
  if (instances.has(nav)) return instances.get(nav);
  const lifetime = createLifetime();
  let indicator = nav.querySelector('.nav-pill-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'nav-pill-indicator';
    nav.prepend(indicator);
  }
  const active = links.find(link => ['is-active', 'active', 'bg-white'].some(name => link.classList.contains(name))) || links[0];
  let hovered;
  const refresh = () => {
    normalizeLinks(links, hovered || active, Boolean(hovered));
    moveIndicator(indicator, hovered || active, false);
  };
  refresh();
  links.forEach(link => lifetime.on(link, 'mouseenter', () => {
    hovered = link;
    normalizeLinks(links, link, true);
    moveIndicator(indicator, link, true);
  }));
  lifetime.on(nav, 'mouseleave', () => {
    hovered = null;
    normalizeLinks(links, active);
    moveIndicator(indicator, active, true);
  });
  lifetime.on(window, 'resize', refresh);
  lifetime.on(header, 'navlayoutchange', refresh);
  document.fonts?.ready.then(() => { if (!lifetime.signal.aborted) refresh(); });
  bindCounterExpansion(header, refresh, lifetime);
  const dispose = () => { lifetime.dispose(); instances.delete(nav); };
  instances.set(nav, dispose);
  return dispose;
}
