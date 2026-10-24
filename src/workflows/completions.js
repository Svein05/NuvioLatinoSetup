async function loadCount(context, options) {
  const { endpoints, readCount, store, reportWarning, revision } = context;
  const loadId = ++context.loadId;
  for (const endpoint of endpoints) {
    if (!endpoint.get) continue;
    try {
      const count = await readCount(endpoint.get, options);
      options.signal?.throwIfAborted();
      if (revision !== context.revision || loadId !== context.loadId) return store.snapshot();
      store.save(count);
      return { count, source: 'network' };
    } catch {
      options.signal?.throwIfAborted();
      if (revision !== context.revision || loadId !== context.loadId) return store.snapshot();
      reportWarning('No se pudo consultar un proveedor del contador.');
    }
  }
  return { ...store.snapshot(), warning: 'No se pudo confirmar el contador; se conserva el último dato disponible.' };
}

async function recordCount(context, completionId) {
  const { endpoints, incrementCount, store } = context;
  if (store.recorded(completionId)) return { ...store.snapshot(), status: 'duplicate' };
  if (context.uncertain.has(completionId) || store.pending(completionId)) return {
    ...store.snapshot(), status: 'unknown', warning: 'Hay un incremento pendiente de confirmación; no se repetirá automáticamente.',
  };
  const endpoint = endpoints.find(item => item.hit);
  if (!endpoint) return {
    ...store.snapshot(), status: 'unavailable', warning: 'El registro remoto del contador no está configurado.',
  };
  store.begin(completionId);
  try {
    const result = await incrementCount(endpoint.hit, completionId);
    store.confirm(result.value, completionId);
    return { count: result.value, source: 'network', status: result.status };
  } catch (error) {
    if (error.outcome === 'unknown') context.uncertain.add(completionId);
    else store.release(completionId);
    return {
      ...store.snapshot(), status: context.uncertain.has(completionId) ? 'unknown' : 'failed',
      warning: context.uncertain.has(completionId) ? 'No se pudo confirmar el incremento remoto; no se repetirá automáticamente.'
        : 'No se pudo registrar el incremento remoto del contador.',
    };
  }
}

/** Read failover is safe; a mutation uses one provider and never invents a confirmed total. */
export function createCompletions({ endpoints, readCount, incrementCount, store, reportWarning = console.warn }) {
  const context = { endpoints, readCount, incrementCount, store, reportWarning,
    uncertain: new Set(), revision: 0, loadId: 0 };
  const pending = new Map();
  return {
    snapshot: () => store.snapshot(),
    refresh: (options = {}) => loadCount(context, options),
    record(completionId) {
      if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(completionId || '')) {
        return Promise.resolve({ ...store.snapshot(), status: 'unavailable' });
      }
      if (!pending.has(completionId)) {
        context.revision++;
        const task = recordCount(context, completionId).finally(() => pending.delete(completionId));
        pending.set(completionId, task);
      }
      return pending.get(completionId);
    },
  };
}
