import { createDisclosureItem } from '../../shared/ui/disclosure/item.js';

export function createFaqItem(details, reduced) {
  return createDisclosureItem(details, reduced, { panelSelector: '.faq-panel', contentSelector: '.faq-panel-content', stateAttribute: 'data-faq-open' });
}
