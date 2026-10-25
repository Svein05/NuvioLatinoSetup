import { getMobileHeaderMenu } from '../../../shared/ui/navigation/menu.js';
import { visibleElement, waitEffect } from './celebration-motion.js';

export function resolveCelebrationTarget(root) {
  const counter = [...root.querySelectorAll('.completions-counter-pill')].find(visibleElement);
  if (counter) return { flightTarget: counter, reveal: async () => counter, dispose() {} };
  const menu = getMobileHeaderMenu(root);
  if (!menu || !visibleElement(menu.button)) return { reveal: async () => null, dispose() {} };
  const revision = menu.revision;
  let opened = false;
  return {
    flightTarget: menu.button,
    async reveal(signal) {
      if (signal.aborted || menu.revision !== revision || !visibleElement(menu.button)) return null;
      menu.button.classList.add('is-celebration-target');
      menu.open();
      opened = true;
      await waitEffect(matchMedia('(prefers-reduced-motion: reduce)').matches ? 160 : 240, signal);
      const target = menu.menu.querySelector('.completions-counter-pill');
      return !signal.aborted && menu.revision === revision && visibleElement(target) ? target : null;
    },
    dispose() {
      menu.button.classList.remove('is-celebration-target');
      if (opened && menu.revision === revision) menu.close();
    },
  };
}
