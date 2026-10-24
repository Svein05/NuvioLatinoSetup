export function metricsScope(origin = globalThis.location?.origin) {
  try {
    const url = new URL(origin);
    if (url.origin === 'https://testing-latinosetup.pages.dev'
      || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return 'testing';
  } catch { /* Non-browser callers default to public production data. */ }
  return 'production';
}

export function scopedMetricsStorage(storage) {
  const prefix = `nuvio_metrics_v2:${metricsScope()}:`;
  return {
    getItem: key => storage.getItem(prefix + key),
    setItem: (key, value) => storage.setItem(prefix + key, value),
    removeItem: key => storage.removeItem(prefix + key),
  };
}

export function requireMetricsScope(data) {
  if ((data?.environment || 'production') !== metricsScope()) throw new Error('El servicio aún no tiene configuradas las estadísticas de este entorno.');
}
