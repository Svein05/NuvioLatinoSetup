import { WorkerError } from '../middleware/http.js';

function blobEntry(path, sha) { return { path, mode: '100644', type: 'blob', sha }; }

function requireSha(value) {
  if (typeof value !== 'string' || !value) throw new WorkerError('GitHub no confirmó el identificador del recurso.', 502);
  return value;
}

async function uploadBlob(client, content) {
  const blob = await client.request('git/blobs', { method: 'POST', body: { content, encoding: 'base64' } });
  return requireSha(blob.sha);
}

async function renamedEntries(client, file) {
  let sha;
  if (file.newBase64) sha = await uploadBlob(client, file.newBase64);
  else {
    const path = file.oldPath.split('/').map(encodeURIComponent).join('/');
    const data = await client.request(`contents/${path}?ref=${encodeURIComponent(client.branch)}`);
    sha = requireSha(data.sha);
  }
  const entries = [blobEntry(file.newPath, sha)];
  if (file.oldPath !== file.newPath) entries.push(blobEntry(file.oldPath, null));
  return entries;
}

async function treeEntries(batch, client) {
  const entries = [];
  for (const file of [...batch.addedFiles, ...batch.replacedFiles]) {
    entries.push(blobEntry(file.path, await uploadBlob(client, file.base64)));
  }
  for (const file of batch.renamedFiles) entries.push(...await renamedEntries(client, file));
  entries.push(...batch.deletedFiles.map(path => blobEntry(path, null)));
  return entries;
}

/** Publish one non-forced reference update; failed/unknown writes never trigger a second attempt. */
export async function publishAvatars(batch, client) {
  const reference = await client.request(`git/ref/heads/${encodeURIComponent(client.branch)}`);
  const parent = requireSha(reference.object?.sha);
  const commit = await client.request(`git/commits/${parent}`);
  const baseTree = requireSha(commit.tree?.sha);
  const entries = await treeEntries(batch, client);
  const tree = await client.request('git/trees', { method: 'POST', body: { base_tree: baseTree, tree: entries } });
  const message = batch.customCommitMessage || `feat(avatars): save modder changes (${entries.length} files staged)`;
  const created = await client.request('git/commits', { method: 'POST', body: {
    message: message + (batch.skipCi ? ' [skip ci]' : ''), tree: requireSha(tree.sha), parents: [parent],
  } });
  const sha = requireSha(created.sha);
  const updated = await client.request(`git/refs/heads/${encodeURIComponent(client.branch)}`, {
    method: 'PATCH', body: { sha, force: false },
  });
  if (updated.object?.sha !== sha) throw new WorkerError('No se pudo confirmar la actualización de la rama.', 502, 'unknown');
  return { success: true, commit: `https://github.com/${client.owner}/${client.repository}/commit/${sha}`, count: entries.length };
}
