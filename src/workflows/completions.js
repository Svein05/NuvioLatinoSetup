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
  return { ...store.snapshot(), warning: 'Conteo sin confirmar: se muestra caché o una estimación.' };
}

async function recordCount(context) {
  const { endpoints, incrementCount, store } = context;
  if (context.confirmed || store.recorded()) return { ...store.snapshot(), status: 'duplicate' };
  if (context.uncertain || store.pending()) return {
    ...store.snapshot(), status: 'unknown', warning: 'Hay un incremento pendiente de confirmación; no se repetirá automáticamente.',
  };
  const endpoint = endpoints.find(item => item.hit);
  if (!endpoint) return {
    ...store.snapshot(), status: 'unavailable', warning: 'El registro remoto del contador no está configurado.',
  };
  store.begin();
  try {
    const count = await incrementCount(endpoint.hit);
    context.confirmed = true;
    store.confirm(count);
    return { count, source: 'network', status: 'confirmed' };
  } catch (error) {
    context.uncertain = error.outcome === 'unknown';
    if (!context.uncertain) store.release();
    return {
      ...store.snapshot(), status: context.uncertain ? 'unknown' : 'failed',
      warning: context.uncertain ? 'No se pudo confirmar el incremento remoto; no se repetirá automáticamente.'
        : 'No se pudo registrar el incremento remoto del contador.',
    };
  }
}

/** Read failover is safe; a mutation uses one provider and never invents a confirmed total. */
export function createCompletions({ endpoints, readCount, incrementCount, store, reportWarning = console.warn }) {
  const context = { endpoints, readCount, incrementCount, store, reportWarning,
    confirmed: false, uncertain: false, revision: 0, loadId: 0 };
  let pending;
  return {
    snapshot: () => store.snapshot(),
    refresh: (options = {}) => loadCount(context, options),
    record() {
      if (!pending) {
        context.revision++;
        pending = recordCount(context).finally(() => { pending = null; });
      }
      return pending;
    },
  };
}
