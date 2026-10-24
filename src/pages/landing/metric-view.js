import { renderOdometer } from '../../shared/ui/odometer/render.js';

const format = count => new Intl.NumberFormat('es-MX').format(count);

export function createMetricView(element) {
  const value = element.querySelector('[data-metric-value]');
  const status = element.querySelector('[data-metric-status]');
  const accessible = element.querySelector('[data-metric-accessible]');
  const label = element.querySelector('h2').textContent;
  let latest;
  let painted;
  let cleanup = () => {};
  let revealed = element.dataset.metricRevealed === 'true';
  const paint = (snap = false) => {
    if (!latest || !revealed || (!snap && painted === latest.count)) return;
    const previous = cleanup;
    cleanup = renderOdometer(value, format(latest.count), !snap, {
      animateInitial: element.dataset.metricAnimated !== 'true', durationMs: 900, staggerMs: 40,
    });
    previous();
    element.dataset.metricAnimated = 'true';
    painted = latest.count;
  };
  return {
    update(result) {
      const known = ['network', 'cache'].includes(result.source) && Number.isSafeInteger(result.count) && result.count >= 0;
      latest = known ? result : null;
      status.textContent = !known ? 'Sin datos confirmados' : result.source === 'cache'
        ? 'Último dato guardado' : '';
      accessible.textContent = `${label}: ${known ? format(result.count) : 'sin datos confirmados'}. ${status.textContent}`;
      element.dataset.source = known ? result.source : 'unavailable';
      if (!known) { cleanup(); value.textContent = '—'; painted = undefined; }
      else paint();
    },
    reveal(snap = false) {
      revealed = true;
      element.dataset.metricRevealed = 'true';
      paint(snap);
    },
    dispose() {
      if (latest && revealed) renderOdometer(value, format(latest.count), false)();
      cleanup();
    },
  };
}
