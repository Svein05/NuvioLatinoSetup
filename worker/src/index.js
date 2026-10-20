import { corsHeaders, json } from './middleware/http.js';
import { collaboratorRoute } from './routes/collaborators.js';
import { proxyRoute } from './routes/proxy.js';
import { avatarRankingRoute } from './routes/avatar-ranking.js';

/** Dependency injection keeps all tests offline and independent of private credentials. */
export function createWorker({ fetchImpl = fetch } = {}) {
  return {
    async fetch(request, env) {
      try {
        if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
        const { pathname } = new URL(request.url);
        if (['/api/avatars/ranking', '/api/avatars/usage'].includes(pathname)) return await avatarRankingRoute(request, env, fetchImpl);
        if (['/api/verify-auth', '/api/save-staged-changes'].includes(pathname)) {
          return await collaboratorRoute(request, env, { publish: pathname.endsWith('save-staged-changes'), fetchImpl });
        }
        if (pathname.startsWith('/http')) return await proxyRoute(request, env, fetchImpl);
        if (pathname !== '/') return json({ error: 'Ruta no encontrada.' }, 404);
        return json({ status: 'active', message: 'Nuvio Worker activo' });
      } catch (error) {
        return json({ error: error.status ? error.message : 'No se pudo completar la operación.',
          outcome: error.outcome || 'unknown' }, error.status || 502);
      }
    },
  };
}

export default createWorker();
