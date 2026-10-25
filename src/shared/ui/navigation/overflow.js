import { createLifetime } from '../lifetime.js';

const instances = new WeakMap();

function requiredWidth(nav, layout) {
  const copy = nav.cloneNode(true);
  copy.dataset.navLayout = layout;
  copy.dataset.navMeasure = '';
  copy.removeAttribute('id');
  copy.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
  copy.setAttribute('aria-hidden', 'true');
  copy.inert = true;
  nav.parentElement.append(copy);
  const width = copy.getBoundingClientRect().width;
  copy.remove();
  return width;
}

/** The three intrinsic clusters must fit together; no absolute centering or magic breakpoint. */
export function initNavOverflowMonitor(root = document) {
  const nav = root.querySelector('header.lat-floating-nav');
  if (!nav) return () => {};
  if (instances.has(nav)) return instances.get(nav);
  const lifetime = createLifetime();
  let pending = false;
  const evaluate = () => {
    pending = false;
    const available = nav.getBoundingClientRect().width;
    const layout = requiredWidth(nav, 'wide') <= available ? 'wide'
      : requiredWidth(nav, 'compact') <= available ? 'compact' : 'icons';
    if (nav.dataset.navLayout === layout) return;
    nav.dataset.navLayout = layout;
    nav.classList.toggle('force-compact', layout !== 'wide');
    nav.dispatchEvent(new Event('navlayoutchange'));
  };
  const schedule = () => {
    if (pending) return;
    pending = true;
    lifetime.frame(evaluate);
  };
  evaluate();
  document.fonts?.ready.then(() => { if (!lifetime.signal.aborted) schedule(); });
  lifetime.on(window, 'resize', schedule, { passive: true });
  if (window.ResizeObserver) {
    const observer = new ResizeObserver(schedule);
    [nav, ...nav.children].forEach(element => observer.observe(element));
    lifetime.add(() => observer.disconnect());
  }
  const mutations = new MutationObserver(schedule);
  mutations.observe(nav, { childList: true, subtree: true, characterData: true });
  lifetime.add(() => mutations.disconnect());
  const dispose = () => { lifetime.dispose(); instances.delete(nav); };
  instances.set(nav, dispose);
  return dispose;
}
