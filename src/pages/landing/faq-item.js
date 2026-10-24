import { animateFaqPanel, faqContentHeight, faqVisualState } from './faq-animation.js';

/** Native disclosure state plus an interruptible, temporary visual transition. */
export function createFaqItem(details, reduced) {
  const summary = details.querySelector('summary');
  const panel = details.querySelector('.faq-panel');
  const content = panel.querySelector('.faq-panel-content');
  let target = details.open;
  let animations = [];
  let revision = 0;
  let measured = 0;
  const cancel = () => { animations.forEach(animation => animation.cancel()); animations = []; };
  const resetStyles = () => {
    panel.style.removeProperty('height');
    panel.style.removeProperty('--faq-content-height');
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
    const from = faqVisualState(details, panel, content);
    cancel();
    target = open;
    details.dataset.faqOpen = String(open);
    summary.setAttribute('aria-expanded', String(open));
    panel.inert = !open;
    if (!open && panel.contains(document.activeElement)) summary.focus({ preventScroll: true });
    if (instant) { finish(); return; }
    details.open = true;
    const motion = animateFaqPanel({ panel, content, open, reduced: reduced.matches, from });
    measured = motion.height;
    animations = motion.animations;
    Promise.all(animations.map(animation => animation.finished)).then(() => {
      if (revision === current) finish();
    }).catch(() => { /* A newer target or disposal owns the visual state. */ });
  };
  const resize = () => {
    if (animations.length && Math.abs(faqContentHeight(content) - measured) > .1) setOpen(target);
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
      delete details.dataset.faqOpen;
      summary.removeAttribute('aria-expanded');
      panel.inert = false;
      details.setAttribute('name', 'landing-faq');
    } };
}
