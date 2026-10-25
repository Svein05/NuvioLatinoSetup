export function createStagedState() {
  return {
    history: [],
    avatarOverrides: new Map(),
  };
}

export function rebuildAvatarOverrides(history = []) {
  const overrides = new Map();
  for (const action of history) {
    if (action.type === 'UPDATE_AVATAR') {
      const current = overrides.get(action.avatarId);
      overrides.set(action.avatarId, {
        isDeleted: false,
        isModified: true,
        newCharacterName: action.newCharacterName,
        newFilename: action.newFilename,
        newBase64: action.newBase64 || current?.newBase64 || null,
        previewImgUrl: (action.newBase64 ? `data:image/webp;base64,${action.newBase64}` : null) || current?.previewImgUrl || null,
      });
    } else if (action.type === 'DELETE_AVATAR') {
      overrides.set(action.avatarId, { isDeleted: true, isModified: false });
    } else if (action.type === 'RESTORE_AVATAR') {
      if (action.previousOverride && !action.previousOverride.isDeleted) {
        overrides.set(action.avatarId, action.previousOverride);
      } else {
        overrides.delete(action.avatarId);
      }
    }
  }
  return overrides;
}

export function undoLastStagedAction(stagedState) {
  if (!stagedState.history.length) return null;
  const lastAction = stagedState.history.pop();
  if (!lastAction) return null;

  stagedState.avatarOverrides = rebuildAvatarOverrides(stagedState.history);

  let message = 'Cambio deshecho.';
  if (lastAction.type === 'BATCH_UPLOAD') {
    message = `Se deshizo la subida del lote (${lastAction.files.length} avatares de ${lastAction.franchise}).`;
  } else if (lastAction.type === 'UPDATE_AVATAR') {
    message = `Se deshizo la edición de "${lastAction.avatar?.character || lastAction.newFilename}".`;
  } else if (lastAction.type === 'DELETE_AVATAR') {
    message = `Se recuperó el avatar "${lastAction.avatar?.character || lastAction.avatarId}" (eliminación deshecha).`;
  }
  return { lastAction, message };
}

export function discardStagedItem(stagedState, itemKey) {
  if (!itemKey) return null;
  if (itemKey.startsWith('batch_file:')) {
    const [, actionId, fileIdxStr] = itemKey.split(':');
    const fileIdx = parseInt(fileIdxStr, 10);
    const action = stagedState.history.find(a => a.id === actionId && a.type === 'BATCH_UPLOAD');
    if (action?.files[fileIdx]) {
      const removed = action.files.splice(fileIdx, 1)[0];
      if (action.files.length === 0) {
        stagedState.history = stagedState.history.filter(a => a.id !== actionId);
      }
      return { type: 'BATCH_FILE', removed };
    }
  } else if (itemKey.startsWith('delete_avatar:') || itemKey.startsWith('update_avatar:')) {
    const [, avatarId] = itemKey.split(':');
    stagedState.history = stagedState.history.filter(a => a.avatarId !== avatarId);
    stagedState.avatarOverrides = rebuildAvatarOverrides(stagedState.history);
    return { type: 'AVATAR_CHANGE', avatarId };
  }
  return null;
}
