function resolveAvatarEntity(avatarId, allAvatars, history) {
  let av = allAvatars.find(a => a.id === avatarId);
  if (!av) {
    const action = history.find(a => a.avatarId === avatarId && a.avatar);
    if (action) av = action.avatar;
  }
  return av;
}

export function consolidateStagedOperations({ history = [], overrides = new Map(), allAvatars = [] } = {}) {
  const addedFiles = [];
  const replacedFiles = [];
  const renamedFiles = [];
  const deletedFiles = [];

  for (const action of history) {
    if (action.type !== 'BATCH_UPLOAD') continue;
    for (const f of action.files || []) {
      const repoPath = `assets/profile_icons/${action.style}/${action.franchise}/${f.filename}`;
      addedFiles.push({ path: repoPath, filename: f.filename, characterName: f.characterName, style: action.style, franchise: action.franchise, base64: f.base64 });
    }
  }

  for (const [avatarId, override] of overrides.entries()) {
    const avatar = resolveAvatarEntity(avatarId, allAvatars, history);
    if (!avatar) continue;
    const originalPath = `assets/profile_icons/${avatar.style}/${avatar.franchise}/${avatar.fileName}`;

    if (override.isDeleted) {
      deletedFiles.push({ path: originalPath, filename: avatar.fileName, characterName: avatar.characterName, style: avatar.style, franchise: avatar.franchise });
    } else if (override.isModified) {
      const isRenamed = override.newFilename && override.newFilename !== avatar.fileName;
      const newPath = isRenamed ? `assets/profile_icons/${avatar.style}/${avatar.franchise}/${override.newFilename}` : originalPath;
      if (isRenamed) {
        renamedFiles.push({ oldPath: originalPath, newPath, oldFilename: avatar.fileName, newFilename: override.newFilename, characterName: override.newCharacterName || avatar.characterName, style: avatar.style, franchise: avatar.franchise, newBase64: override.newBase64 || null });
      } else if (override.newBase64) {
        replacedFiles.push({ path: originalPath, filename: avatar.fileName, characterName: avatar.characterName, style: avatar.style, franchise: avatar.franchise, base64: override.newBase64 });
      }
    }
  }

  return { addedFiles, replacedFiles, renamedFiles, deletedFiles };
}

export function buildStagedItemsBreakdown({ history = [], overrides = new Map(), allAvatars = [], resolveCdnUrl = () => '' } = {}) {
  const items = [];
  history.forEach((action) => {
    if (action.type !== 'BATCH_UPLOAD') return;
    (action.files || []).forEach((f, fileIdx) => {
      items.push({
        key: `batch_file:${action.id}:${fileIdx}`,
        actionType: 'NEW_FILE',
        badgeLabel: 'Nuevo archivo',
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        badgeIcon: 'fa-solid fa-plus',
        previewUrl: f.previewUrl || (f.base64 ? `data:image/webp;base64,${f.base64}` : ''),
        primaryText: f.filename,
        secondaryText: `profile_icons/${action.style}/${action.franchise}/`,
        isStrikethrough: false,
      });
    });
  });

  for (const [avatarId, override] of overrides.entries()) {
    const avatar = resolveAvatarEntity(avatarId, allAvatars, history);
    if (!avatar) continue;
    if (override.isDeleted) {
      items.push({
        key: `delete_avatar:${avatarId}`,
        actionType: 'DELETE',
        badgeLabel: 'Eliminación',
        badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        badgeIcon: 'fa-solid fa-trash-can',
        previewUrl: resolveCdnUrl(avatar.path),
        primaryText: avatar.fileName,
        secondaryText: `profile_icons/${avatar.style}/${avatar.franchise}/`,
        isStrikethrough: true,
      });
    } else if (override.isModified) {
      const isRenamed = override.newFilename && override.newFilename !== avatar.fileName;
      const isReplaced = Boolean(override.newBase64);
      const label = isRenamed && isReplaced ? 'Renombrado + Reemplazo' : isRenamed ? 'Renombrado' : 'Reemplazo WebP';
      const badgeClass = isRenamed && isReplaced ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : isRenamed ? 'bg-amber-400/15 text-amber-300 border-amber-400/30' : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      const primaryText = isRenamed ? `${avatar.fileName} ➔ ${override.newFilename}` : (override.newFilename || avatar.fileName);
      items.push({
        key: `update_avatar:${avatarId}`,
        actionType: isRenamed && isReplaced ? 'RENAME_AND_REPLACE' : isRenamed ? 'RENAME' : 'REPLACE',
        badgeLabel: label,
        badgeClass,
        badgeIcon: isRenamed && isReplaced ? 'fa-solid fa-wand-magic-sparkles' : isRenamed ? 'fa-solid fa-pen' : 'fa-solid fa-image',
        previewUrl: override.previewImgUrl || (override.newBase64 ? `data:image/webp;base64,${override.newBase64}` : resolveCdnUrl(avatar.path)),
        primaryText,
        secondaryText: `profile_icons/${avatar.style}/${avatar.franchise}/`,
        isStrikethrough: false,
      });
    }
  }
  return items;
}
