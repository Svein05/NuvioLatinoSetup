import { HttpError, requestJson } from '../../shared/http/request-json.js';

export function githubRepository(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(value)) throw new Error('Repositorio de avatares inválido.');
  return value;
}

export const isCommitSha = value => typeof value === 'string' && /^[a-f0-9]{40,64}$/i.test(value);

/** GitHub tree responses are mapped to file paths, never accepted as a partial catalog. */
export function createAvatarCatalogClient(repository, { fetchImpl = fetch, now = Date.now } = {}) {
  const repo = githubRepository(repository);
  const api = `https://api.github.com/repos/${repo}`;
  const read = (url, options) => {
    options?.signal?.throwIfAborted();
    return requestJson(url, { fetchImpl, cache: 'no-store', credentials: 'omit',
      redirect: 'error', headers: { Accept: 'application/vnd.github.v3+json' }, ...options });
  };
  return {
    async latestCommit({ signal } = {}) {
      const data = await read(`${api}/git/ref/heads/main`, { signal, timeoutMs: 3500 });
      if (!isCommitSha(data?.object?.sha)) throw new HttpError('GitHub devolvió una referencia inválida.');
      return data.object.sha;
    },
    async tree(commitSha, { signal } = {}) {
      const ref = isCommitSha(commitSha) ? commitSha : 'main';
      const data = await read(`${api}/git/trees/${ref}?recursive=1&_t=${now()}`, { signal, timeoutMs: 8000 });
      if (!Array.isArray(data?.tree) || data.truncated === true) {
        throw new HttpError('GitHub devolvió un árbol incompleto.', { code: 'INCOMPLETE_AVATAR_TREE' });
      }
      if (data.tree.some(item => !item || typeof item.path !== 'string' || typeof item.type !== 'string')) {
        throw new HttpError('GitHub devolvió entradas de árbol inválidas.');
      }
      return data.tree.filter(item => item.type === 'blob').map(item => item.path);
    },
    async manifest(commitSha, { signal } = {}) {
      const ref = isCommitSha(commitSha) ? commitSha : 'main';
      const data = await read(`https://raw.githubusercontent.com/${repo}/${ref}/assets/profile_icons/manifest.json?_t=${now()}`,
        { signal, timeoutMs: 8000 });
      if (!Array.isArray(data?.styles)) throw new HttpError('El manifiesto de avatares no es válido.');
      return data.styles.flatMap(style => {
        if (typeof style?.style !== 'string' || !Array.isArray(style.franchises)) throw new HttpError('Estilo de avatares inválido.');
        return style.franchises.map(franchise => {
          if (typeof franchise?.franchise !== 'string' || !Array.isArray(franchise.files)
            || franchise.files.some(file => typeof file !== 'string')) throw new HttpError('Archivos de avatares inválidos.');
          return { style: style.style, franchise: franchise.franchise, files: franchise.files };
        });
      });
    },
  };
}
