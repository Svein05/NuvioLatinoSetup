function normalizeWebpFilename(raw) {
  const clean = String(raw || '').trim().toLowerCase();
  return clean.endsWith('.webp') ? clean : `${clean}.webp`;
}

function checkCatalogCollision({ allAvatars, overrides, style, franchise, cleanTarget, excludeId }) {
  for (const av of allAvatars) {
    if (excludeId && av.id === excludeId) continue;
    if (av.style !== style || av.franchise !== franchise) continue;
    const override = overrides?.get(av.id);
    if (override?.isDeleted) continue;

    const current = override?.newFilename || av.fileName;
    if (normalizeWebpFilename(current) === cleanTarget) {
      return { hasCollision: true, conflictingFileName: current, isStagedBatch: false };
    }
  }
  return null;
}

function checkStagedBatchCollision(history, style, franchise, cleanTarget) {
  for (const action of history || []) {
    if (action.type !== 'BATCH_UPLOAD' || action.style !== style || action.franchise !== franchise) continue;
    for (const f of action.files || []) {
      if (normalizeWebpFilename(f.filename) === cleanTarget) {
        return { hasCollision: true, conflictingFileName: f.filename, isStagedBatch: true };
      }
    }
  }
  return null;
}

export function checkAvatarFilenameCollision({
  style,
  franchise,
  targetFilename,
  excludeAvatarId = null,
  allAvatars = [],
  history = [],
  overrides = new Map(),
}) {
  if (!targetFilename || !style || !franchise) return { hasCollision: false };
  const cleanTarget = normalizeWebpFilename(targetFilename);

  const catMatch = checkCatalogCollision({
    allAvatars,
    overrides,
    style,
    franchise,
    cleanTarget,
    excludeId: excludeAvatarId,
  });
  if (catMatch) return catMatch;

  const stagedMatch = checkStagedBatchCollision(history, style, franchise, cleanTarget);
  if (stagedMatch) return stagedMatch;

  return { hasCollision: false };
}
