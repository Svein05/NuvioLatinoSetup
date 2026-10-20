import { createLifetime } from '../lifetime.js';

const instances = new WeakMap();

function renderStars(root, { count, source, warning }) {
  for (const element of root.querySelectorAll('.github-stars-count')) {
    element.textContent = String(count);
    element.dataset.source = source;
    element.title = warning || '';
  }
}

export function mountRepositoryStars({ initial, refresh, reportWarning = console.warn }, root = document) {
  instances.get(root)?.();
  const lifetime = createLifetime();
  renderStars(root, initial());
  refresh({ signal: lifetime.signal }).then(result => {
    if (lifetime.signal.aborted) return;
    renderStars(root, result);
    if (result.warning) reportWarning(result.warning);
  }).catch(() => {
    if (!lifetime.signal.aborted) reportWarning('No se pudo cargar el conteo del repositorio.');
  });
  const dispose = () => {
    lifetime.dispose();
    if (instances.get(root) === dispose) instances.delete(root);
  };
  instances.set(root, dispose);
  return dispose;
}
