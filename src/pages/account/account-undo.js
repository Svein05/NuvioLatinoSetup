export function pushAddonsHistory(state, onUpdate) {
  if (!state.addonHistory) state.addonHistory = [];
  state.addonHistory.push(JSON.parse(JSON.stringify(state.installedAddons)));
  if (state.addonHistory.length > 30) {
    state.addonHistory.shift();
  }
  onUpdate?.();
}

export function canAccountUndo(state) {
  const currentSec = state.activeSection;
  if (currentSec === 'avatars') return Boolean(state.dirty?.avatar);
  if (currentSec === 'settings') return Boolean(state.dirty?.settings);
  if (currentSec === 'addons') return Boolean((state.addonHistory && state.addonHistory.length > 0) || state.dirty?.addons);
  if (currentSec === 'aiometadata') return Boolean(state.dirty?.aiometadata);

  return Boolean(
    state.dirty?.avatar ||
    state.dirty?.settings ||
    state.dirty?.addons ||
    state.dirty?.aiometadata ||
    (state.addonHistory && state.addonHistory.length > 0)
  );
}

export function updateUndoButtonUI(root = document, state) {
  const btn = root.querySelector?.('#btnAccountUndo');
  const canUndo = canAccountUndo(state);

  if (btn) {
    btn.disabled = !canUndo;
    if (canUndo) {
      btn.classList.remove('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
      btn.classList.add('opacity-100', 'cursor-pointer');
    } else {
      btn.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
      btn.classList.remove('opacity-100', 'cursor-pointer');
    }
  }
}

export function undoAddonsChange(state, { renderAddons, updateUI, notify } = {}) {
  if (!state.addonHistory || state.addonHistory.length === 0) return;
  const previousState = state.addonHistory.pop();
  state.installedAddons = previousState;

  const isBackToOriginal = JSON.stringify(state.installedAddons) === JSON.stringify(state.originalInstalledAddons);
  state.dirty.addons = !isBackToOriginal;

  updateUI?.();
  renderAddons?.();
  notify?.('Cambio deshecho.', 'info');
}

function revertAvatar(state, { updateAvatarUI } = {}) {
  state.selectedAvatarUrl = state.originalAvatarUrl;
  state.dirty.avatar = false;
  updateAvatarUI?.();
}

function revertSettings(state, { renderSettings } = {}) {
  if (state.originalSettings) {
    state.settings = JSON.parse(JSON.stringify(state.originalSettings));
  }
  state.dirty.settings = false;
  renderSettings?.();
}

function revertAio(state, { renderAio } = {}) {
  if (state.originalAioConfig) {
    state.aioConfig = JSON.parse(JSON.stringify(state.originalAioConfig));
  }
  if (state.originalPosterEngine !== undefined) {
    state.posterEngine = state.originalPosterEngine;
  }
  if (state.originalCustomPosterUrl !== undefined) {
    state.customPosterUrl = state.originalCustomPosterUrl;
  }
  state.dirty.aiometadata = false;
  renderAio?.();
}

export function performAccountUndo(state, actions = {}) {
  const { notify, updateUI, renderAddons } = actions;
  const sec = state.activeSection;

  if (sec === 'avatars' || (state.dirty.avatar && !state.dirty.settings && !state.dirty.addons && !state.dirty.aiometadata)) {
    if (state.dirty.avatar) {
      revertAvatar(state, actions);
      updateUI?.();
      notify?.('Avatar revertido al original.', 'info');
      return;
    }
  }

  if (sec === 'settings' || (state.dirty.settings && !state.dirty.avatar && !state.dirty.addons && !state.dirty.aiometadata)) {
    if (state.dirty.settings) {
      revertSettings(state, actions);
      updateUI?.();
      notify?.('Ajustes revertidos a los valores por defecto.', 'info');
      return;
    }
  }

  if (sec === 'addons' || (state.dirty.addons && !state.dirty.avatar && !state.dirty.settings && !state.dirty.aiometadata)) {
    if (state.addonHistory && state.addonHistory.length > 0) {
      undoAddonsChange(state, actions);
      return;
    } else if (state.dirty.addons && state.originalInstalledAddons) {
      state.installedAddons = JSON.parse(JSON.stringify(state.originalInstalledAddons));
      state.dirty.addons = false;
      renderAddons?.();
      updateUI?.();
      notify?.('Addons restaurados a la lista original.', 'info');
      return;
    }
  }

  if (sec === 'aiometadata' || (state.dirty.aiometadata && !state.dirty.avatar && !state.dirty.settings && !state.dirty.addons)) {
    if (state.dirty.aiometadata) {
      revertAio(state, actions);
      updateUI?.();
      notify?.('Configuración de AIOMetadata restaurada.', 'info');
      return;
    }
  }

  updateUI?.();
}
