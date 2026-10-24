import { WorkerError } from './http.js';

// Origin is browser isolation, not authentication. Writes also need server-side deduplication.
export function requireProductionMetrics(request) {
  if (request.headers.get('Origin') !== 'https://guia.lat-add.com') {
    throw new WorkerError('Los contadores solo registran actividad de producción.', 403);
  }
}
