import { performAccountUndo } from './account-undo.js';
import { saveAccountChanges } from '../../workflows/save-account-changes.js';
import { updateProfileHeader } from './account-profiles.js';

export function createAccountActions({ root, state, deps, notify, updateUI, getSections }) {
  const handleUndo = () => {
    if (state.isSaving) return;
    performAccountUndo(state, { notify, updateUI, renderAddons: () => getSections()?.addons.render(),
      renderSettings: () => getSections()?.settings(), renderAio: () => getSections()?.metadata.render(),
      updateAvatarUI: () => getSections()?.avatars.render() });
  };
  const handleSave = () => saveAccountChanges({ state, config: deps.config, client: deps.client,
    updateMetadataConfiguration: deps.updateMetadataConfiguration,
    resolveOwnerInstanceUrl: deps.resolveOwnerInstanceUrl,
    avatarService: { resolvePublicUrl: deps.resolveAvatarCdnUrl, recordUsage: deps.recordAvatarUsage },
    ui: { notify, onSavingStateChange: updateUI,
      updateAvatarUI: () => {
        updateProfileHeader(root, state, deps.resolveAvatarCdnUrl || (u => u)); getSections()?.avatars.render();
      },
      renderAioSection: () => getSections()?.metadata.render(), renderAddonsSection: () => getSections()?.addons.render() },
  }).catch(() => { /* The workflow reports failure and retains the pending draft. */ });
  return { handleSave, handleUndo };
}
