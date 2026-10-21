import { consolidateStagedOperations } from '../features/avatars/index.js';

export function buildPublishPayload({ stagedOps, token, email = '', skipCi = true }) {
  return {
    password: token,
    email,
    skipCi,
    addedFiles: stagedOps.addedFiles.map(f => ({ path: f.path, base64: f.base64 })),
    replacedFiles: stagedOps.replacedFiles.map(f => ({ path: f.path, base64: f.base64 })),
    renamedFiles: stagedOps.renamedFiles.map(f => ({
      oldPath: f.oldPath,
      newPath: f.newPath,
      newBase64: f.newBase64,
    })),
    deletedFiles: stagedOps.deletedFiles.map(f => f.path),
  };
}

export async function publishModderChanges({
  client,
  stagedState,
  token,
  email = '',
  allAvatars = [],
  onProgress = () => {},
}) {
  if (!token) throw new Error('Sesión no autorizada o expirada.');

  onProgress({ percent: 15, statusText: 'Consolidando operaciones en memoria...', type: 'step' });

  const ops = consolidateStagedOperations({
    history: stagedState.history,
    overrides: stagedState.avatarOverrides,
    allAvatars,
  });

  const totalOps = ops.addedFiles.length + ops.replacedFiles.length + ops.renamedFiles.length + ops.deletedFiles.length;
  if (totalOps === 0) throw new Error('No hay cambios pendientes para guardar.');

  onProgress({
    percent: 35,
    statusText: 'Conectando con Cloudflare Worker...',
    type: 'step',
    details: `${ops.addedFiles.length} nuevas, ${ops.replacedFiles.length} reemplazos, ${ops.renamedFiles.length} renombrados, ${ops.deletedFiles.length} eliminados.`,
  });

  const payload = buildPublishPayload({ stagedOps: ops, token, email });
  const result = await client.saveStagedChanges(payload);

  onProgress({ percent: 100, statusText: '¡Publicación completada!', type: 'success' });
  return { result, operations: ops, total: totalOps };
}
