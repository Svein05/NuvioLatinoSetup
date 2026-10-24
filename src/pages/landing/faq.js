import { createFaqItem } from './faq-item.js';

export function initLandingFaq(root = document) {
  const section = root.querySelector('[data-faq]');
  if (!section || !Element.prototype.animate) return () => {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const lifetime = new AbortController();
  const items = [...section.querySelectorAll('.faq-details')].map(details => createFaqItem(details, reduced));
  const select = (item, open, instant = false) => {
    if (open) items.forEach(other => { if (other !== item && other.isOpen()) other.setOpen(false, instant); });
    item.setOpen(open, instant);
  };
  items.forEach(item => {
    item.summary.addEventListener('click', event => {
      event.preventDefault();
      select(item, !item.isOpen());
    }, { signal: lifetime.signal });
    item.details.addEventListener('toggle', () => {
      if (!item.isAnimating() && item.details.open !== item.isOpen()) select(item, item.details.open, true);
    }, { signal: lifetime.signal });
  });
  const motion = () => items.forEach(item => item.setOpen(item.isOpen(), true));
  reduced.addEventListener('change', motion);
  return () => {
    lifetime.abort();
    reduced.removeEventListener('change', motion);
    items.forEach(item => item.dispose());
  };
}
