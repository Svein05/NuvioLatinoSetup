import { WorkerError } from '../middleware/http.js';

async function readJson(response, limit) {
  if (Number(response.headers.get('content-length')) > limit) throw new WorkerError('Respuesta pública demasiado grande.', 502);
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) { await reader.cancel(); throw new WorkerError('Respuesta pública demasiado grande.', 502); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function publicGitHub(env, fetchImpl, resource) {
  const owner = env.GITHUB_OWNER || 'Svein05';
  const repository = env.GITHUB_REPOSITORY || 'NuvioLatinoSetup';
  if (![owner, repository].every(value => /^[\w.-]+$/.test(value))) throw new WorkerError('Repositorio inválido.', 503);
  const response = await fetchImpl(`https://api.github.com/repos/${owner}/${repository}${resource}`, {
    redirect: 'manual', signal: AbortSignal.timeout(5000),
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'NuvioPublicCatalog',
      ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}) },
  });
  if (!response.ok) throw new WorkerError('No se pudo actualizar la información pública.', 502);
  return readJson(response, resource.includes('/git/trees/') ? 6 * 1024 * 1024 : 128 * 1024);
}

export async function refreshPublicData(kind, previous, env, fetchImpl, now) {
  if (kind === 'stars') {
    const data = await publicGitHub(env, fetchImpl, '');
    if (!Number.isSafeInteger(data.stargazers_count) || data.stargazers_count < 0) throw new WorkerError('Conteo inválido.', 502);
    return { count: data.stargazers_count, updatedAt: now() };
  }
  const branch = encodeURIComponent(env.GITHUB_BRANCH || 'main');
  const reference = await publicGitHub(env, fetchImpl, `/git/ref/heads/${branch}`);
  const revision = reference.object?.sha;
  if (!/^[a-f0-9]{40}$/.test(revision || '')) throw new WorkerError('Revisión inválida.', 502);
  if (previous?.revision === revision) return { ...previous, updatedAt: now() };
  const tree = await publicGitHub(env, fetchImpl, `/git/trees/${revision}?recursive=1`);
  if (tree.truncated || !Array.isArray(tree.tree)) throw new WorkerError('Catálogo incompleto.', 502);
  const groups = new Map();
  const hashes = {};
  for (const entry of tree.tree) {
    if (entry.type !== 'blob' || !entry.path?.startsWith('assets/profile_icons/')) continue;
    const parts = entry.path.slice('assets/profile_icons/'.length).split('/');
    if (![2, 3].includes(parts.length) || parts.some(part => !part || part.startsWith('.'))
      || !/\.(webp|png|jpe?g|svg)$/i.test(parts.at(-1))) continue;
    const [style, franchise] = parts;
    const key = JSON.stringify([style, parts.length === 3 ? franchise : 'General']);
    if (!groups.has(key)) groups.set(key, { style, franchise: parts.length === 3 ? franchise : 'General',
      files: [], ...(parts.length === 2 ? { isDirect: true } : {}) });
    groups.get(key).files.push(parts.at(-1));
    hashes[entry.path] = entry.sha;
  }
  if (!groups.size) throw new WorkerError('Catálogo vacío.', 502);
  return { registry: [...groups.values()], hashes, revision, updatedAt: now() };
}
