import { WorkerError } from './http.js';

export function metricsResponse(response) {
  response.headers.set('Vary', 'Origin');
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

// Origin is browser isolation, not authentication. Writes also need server-side deduplication.
export function metricsEnvironment(request, write = false) {
  const origin = request.headers.get('Origin');
  if (origin === 'https://guia.lat-add.com') return 'production';
  try {
    const url = new URL(origin);
    if (url.origin === 'https://testing-latinosetup.pages.dev'
      || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return 'testing';
  } catch { /* Unknown origins may read the public production totals only. */ }
  if (write) throw new WorkerError('Origen de estadísticas no permitido.', 403);
  return 'production';
}
