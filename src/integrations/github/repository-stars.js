import { HttpError, requestJson } from '../../shared/http/request-json.js';

export async function fetchRepositoryStars(repository, { fetchImpl, signal, timeoutMs = 4000 } = {}) {
  if (typeof repository !== 'string' || !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository)) {
    throw new Error('El repositorio de GitHub no es válido.');
  }
  signal?.throwIfAborted();
  const data = await requestJson(`https://api.github.com/repos/${repository}`, {
    method: 'GET', credentials: 'omit', fetchImpl, signal, timeoutMs,
    headers: { Accept: 'application/vnd.github.v3+json' },
  });
  if (!Number.isSafeInteger(data?.stargazers_count) || data.stargazers_count < 0) {
    throw new HttpError('GitHub devolvió un conteo de estrellas inválido.', { code: 'INVALID_STAR_COUNT' });
  }
  return data.stargazers_count;
}
