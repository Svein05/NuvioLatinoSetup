import { animatePanel, contentHeight, visualState } from './animation.js';

/** Native disclosure state plus an interruptible, temporary visual transition. */
export function createDisclosureItem(details, reduced, { panelSelector = '.disclosure-panel', contentSelector = '.disclosure-content', stateAttribute = 'data-disclosure-open' } = {}) {
  const name = details.getAttribute('name'), summary = details.querySelector('summary');
  const panel = details.querySelector(panelSelector);
  const content = panel.querySelector(contentSelector);
  let target = details.open;
  let animations = [];
  let revision = 0;
  let measured = 0;
  const cancel = () => { animations.forEach(animation => animation.cancel()); animations = []; };
  const resetStyles = () => {
    panel.style.removeProperty('height');
    panel.style.removeProperty('--disclosure-content-height');
    panel.removeAttribute('data-animating');
  };
  const finish = () => {
    details.open = target;
    cancel();
    resetStyles();
  };
  const setOpen = (open, instant = false) => {
    if (target === open && !animations.length && !instant) return;
    const current = ++revision;
    const from = visualState(details, panel, content);
    cancel();
    target = open;
    details.setAttribute(stateAttribute, String(open));
    summary.setAttribute('aria-expanded', String(open));
    panel.inert = !open;
    if (!open && panel.contains(document.activeElement)) summary.focus({ preventScroll: true });
    if (instant) { finish(); return; }
    details.open = true;
    const motion = animatePanel({ panel, content, open, reduced: reduced.matches, from });
    measured = motion.height;
    animations = motion.animations;
    Promise.all(animations.map(animation => animation.finished)).then(() => {
      if (revision === current) finish();
    }).catch(() => { /* A newer target or disposal owns the visual state. */ });
  };
  const resize = () => {
    if (animations.length && Math.abs(contentHeight(content) - measured) > .1) setOpen(target);
  };
  const observer = window.ResizeObserver ? new ResizeObserver(resize) : null;
  observer?.observe(content);
  window.addEventListener('resize', resize);
  details.removeAttribute('name');
  summary.setAttribute('aria-controls', panel.id);
  setOpen(target, true);
  return { details, summary, setOpen, isOpen: () => target, isAnimating: () => animations.length > 0,
    dispose() {
      ++revision;
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      finish();
      details.removeAttribute(stateAttribute);
      summary.removeAttribute('aria-expanded');
      panel.inert = false;
      if (name === null) details.removeAttribute('name');
      else details.setAttribute('name', name);
    } };
}
