import { WorkerError } from '../middleware/http.js';

/** No automatic retries: a failed write response can have an unknown remote outcome. */
export function createGitHubClient(env, fetchImpl) {
  const owner = env.GITHUB_OWNER || 'Svein05';
  const repository = env.GITHUB_REPOSITORY || 'NuvioLatinoSetup';
  const branch = env.GITHUB_BRANCH || 'main';
  if (!env.GITHUB_TOKEN) throw new WorkerError('Falta configurar GITHUB_TOKEN en el Worker.', 503);
  async function request(resource, { method = 'GET', body } = {}) {
    let response;
    try {
      response = await fetchImpl(`https://api.github.com/repos/${owner}/${repository}/${resource}`, {
        method, signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json',
          'User-Agent': 'NuvioModderWorker', 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch { throw new WorkerError('No se pudo confirmar la respuesta de GitHub.', 502, method === 'GET' ? 'failed' : 'unknown'); }
    if (!response.ok) throw new WorkerError(`GitHub rechazó la operación (HTTP ${response.status}).`, 502);
    try { return await response.json(); }
    catch { throw new WorkerError('GitHub devolvió una respuesta inválida.', 502, method === 'GET' ? 'failed' : 'unknown'); }
  }
  return { request, owner, repository, branch };
}
