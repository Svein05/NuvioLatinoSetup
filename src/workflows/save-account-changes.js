import { saveAccountAvatar } from './save-account-avatar.js';
import { saveAccountSettings } from './save-account-settings.js';
import { saveAccountAioMetadata } from './save-account-aiometadata.js';
import { saveAccountAddons } from './save-account-addons.js';

export async function saveAccountChanges(deps) {
  const { state, ui = {} } = deps;
  if (!state) return;
  if (state.isSaving) return;

  const changed = Object.keys(state.dirty || {}).filter(k => state.dirty[k]);
  if (changed.length === 0) {
    ui.notify?.('No hay cambios pendientes por guardar.', 'info');
    return;
  }

  state.isSaving = true;
  ui.onSavingStateChange?.(true);

  try {
    if (state.isLoadingProfile || (state.dirty.addons && state.loadErrors?.addons)
      || (state.dirty.settings && (state.loadErrors?.settings || state.loadErrors?.credentials))) {
      throw new Error('El perfil no se cargó por completo. Recarga antes de guardar cambios.');
    }
    await saveAccountAvatar(deps);
    await saveAccountSettings(deps);
    await saveAccountAioMetadata(deps);
    await saveAccountAddons(deps);

    ui.notify?.('✓ Cambios guardados exitosamente.', 'success');
  } catch (err) {
    console.error('[AccountManager] Error guardando cambios:', err);
    ui.notify?.(`Error al guardar: ${err.message}`, 'error');
    throw err;
  } finally {
    state.isSaving = false;
    ui.onSavingStateChange?.(false);
  }
}
