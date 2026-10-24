import { createLifetime } from '../../../shared/ui/lifetime.js';
import { createCounterView } from './counter-view.js';

/** Single mounted polling loop; hidden tabs and overlapping refreshes do not request data. */
export function mountLiveCounter({ counter, reportWarning = console.warn, intervalMs = 25000,
  createView = createCounterView, onUpdate = () => {} }, root = document) {
  const lifetime = createLifetime();
  const view = createView(root);
  let loading = false;
  let revision = 0;
  const render = (result, animate) => { view.render(result, animate); onUpdate(result); };
  async function refresh() {
    if (loading || root.hidden || lifetime.signal.aborted) return;
    loading = true;
    const currentRevision = revision;
    try {
      const result = await counter.refresh({ signal: lifetime.signal });
      if (!lifetime.signal.aborted && currentRevision === revision) render(result, true);
    } catch {
      if (!lifetime.signal.aborted) reportWarning('No se pudo actualizar el contador.');
    } finally { loading = false; }
  }
  render(counter.snapshot());
  void refresh();
  const timer = setInterval(refresh, intervalMs);
  lifetime.add(() => clearInterval(timer));
  lifetime.add(() => view.dispose());
  lifetime.on(root, 'visibilitychange', () => { if (!root.hidden) void refresh(); });
  return {
    async record() {
      revision++;
      const result = await counter.record();
      if (!lifetime.signal.aborted) {
        render(result, true);
        if (result.status === 'confirmed') view.celebrate();
      }
      if (result.warning) reportWarning(result.warning);
      return result;
    },
    dispose: () => lifetime.dispose(),
  };
}
