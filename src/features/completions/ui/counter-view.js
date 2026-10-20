import { renderOdometer } from '../../../shared/ui/odometer/render.js';
import { formatCompactNumber, formatFullNumber } from '../model/count.js';

const PILL = '.completions-counter-pill, #completionsCounterPill';

function paintCount(root, count, animate, cleanups) {
  const previousCleanups = cleanups.splice(0);
  const groups = [
    ['.completions-count-compact, .completions-count-number, #completionsCountNumber', formatCompactNumber(count)],
    ['.completions-count-full', formatFullNumber(count)],
  ];
  for (const [selector, text] of groups) {
    root.querySelectorAll(selector).forEach(element => cleanups.push(renderOdometer(element, text, animate)));
  }
  for (const cleanup of previousCleanups) cleanup();
}

export function createCounterView(root = document) {
  let previous;
  let celebrationTimer;
  const cleanups = [];
  const stopCelebration = () => {
    clearTimeout(celebrationTimer);
    root.querySelectorAll(PILL).forEach(pill => pill.classList.remove('is-celebrating'));
  };
  return {
    render(result, animate = false) {
      if (previous !== result.count) paintCount(root, result.count, animate, cleanups);
      previous = result.count;
      root.querySelectorAll(PILL).forEach(pill => {
        pill.dataset.source = result.source;
        pill.dataset.status = result.status || 'ready';
        pill.title = result.warning || '';
        pill.classList.remove('opacity-0');
        pill.classList.add('opacity-100');
      });
    },
    celebrate() {
      stopCelebration();
      root.querySelectorAll(PILL).forEach(pill => {
        void pill.offsetWidth;
        pill.classList.add('is-celebrating');
      });
      celebrationTimer = setTimeout(stopCelebration, 3600);
    },
    dispose() {
      stopCelebration();
      for (const cleanup of cleanups) cleanup();
      cleanups.length = 0;
    },
  };
}
