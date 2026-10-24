import { createCompletionCelebration } from './celebration.js';
import { createLifetime } from '../../../shared/ui/lifetime.js';
import { createCounterView } from './counter-view.js';

/** Single mounted polling loop; hidden tabs and overlapping refreshes do not request data. */
export function mountLiveCounter({ counter, reportWarning = console.warn, intervalMs = 25000,
  createView = createCounterView, onUpdate = () => {} }, root = document) {
  const lifetime = createLifetime();
  const view = createView(root);
  const celebration = createCompletionCelebration(root);
  const records = new Map();
  let presenting = 0;
  let loading = false;
  let revision = 0;
  const render = (result, animate) => { view.render(result, animate); onUpdate(result); };
  async function refresh() {
    if (presenting || loading || root.hidden || lifetime.signal.aborted) return;
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
  lifetime.add(() => celebration.dispose());
  lifetime.add(() => view.dispose());
  lifetime.on(root, 'visibilitychange', () => { if (!root.hidden) void refresh(); });
  async function record(completionId) {
    revision++;
    presenting++;
    try {
      const result = await counter.record(completionId);
      const commit = () => {
        if (!lifetime.signal.aborted) render({ ...result,
          count: result.source === 'network' ? Math.max(result.count, counter.snapshot().count ?? result.count) : result.count }, true);
      };
      if (!lifetime.signal.aborted && result.status === 'recorded') await celebration.play(commit);
      else commit();
      if (result.warning) reportWarning(result.warning);
      return result;
    } finally { presenting--; }
  }
  return {
    record(completionId) {
      if (records.has(completionId)) return records.get(completionId);
      const task = record(completionId).finally(() => records.delete(completionId));
      records.set(completionId, task);
      return task;
    },
    dispose: () => lifetime.dispose(),
  };
}
