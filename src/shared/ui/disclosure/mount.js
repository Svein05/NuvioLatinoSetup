import { createDisclosureItem } from './item.js';

/** Enhance one native disclosure while retaining native fallback and teardown. */
export function mountDisclosure(details) {
  if (!details || !Element.prototype.animate) return () => {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const lifetime = new AbortController();
  const item = createDisclosureItem(details, reduced);
  item.summary.addEventListener('click', event => {
    event.preventDefault();
    item.setOpen(!item.isOpen());
  }, { signal: lifetime.signal });
  details.addEventListener('toggle', () => {
    if (!item.isAnimating() && details.open !== item.isOpen()) item.setOpen(details.open, true);
  }, { signal: lifetime.signal });
  const settle = () => item.setOpen(item.isOpen(), true);
  reduced.addEventListener('change', settle);
  return () => { lifetime.abort(); reduced.removeEventListener('change', settle); item.dispose(); };
}
