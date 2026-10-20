import { getBadgePackById, getBadgePackUrl } from '../../../features/badges/index.js';

async function copyBadgeUrl(state, notify, copyText) {
  try {
    const packId = state.preferences?.selectedBadgePack || 'tinted';
    const badgeUrl = getBadgePackUrl(packId);
    const pack = getBadgePackById(packId);
    await copyText(badgeUrl);
    notify?.(`✓ Enlace JSON de badges (${pack?.name || packId}) copiado al portapapeles`, 'success');
  } catch {
    notify?.('No se pudo copiar automáticamente al portapapeles.', 'warning');
  }
}

function checkManualCompletion(state, showCompletionModal) {
  if (state.isManualMode && state.manualCopiedCollections && state.manualCopiedAio) {
    setTimeout(() => showCompletionModal?.({ isManual: true }), 600);
  }
}

export function createInjectionStepActions({
  state,
  controller,
  notify,
  executePipeline,
  recordCompletion,
  downloadCollectionsJson,
  downloadAioConfigJson,
  copyText = text => navigator.clipboard.writeText(text),
}) {
  return {
    notify: (msg, type) => notify?.(msg, type),
    saveSession: () => controller.saveSession?.(),
    onUpdate: () => {
      controller.updateNavigationButtons?.();
      controller.updateStep7ExecuteButton?.();
      controller.updateManualModeButtons?.();
    },
    copyText,
    copyBadgeJsonUrl: () => copyBadgeUrl(state, notify, copyText),
    copyCompiledBadgeJson: () => controller.copyCompiledBadgeJson?.(),
    copyAioStreamsManifest: () => controller.copyAioStreamsManifest?.(),
    downloadCollectionsJson: col => downloadCollectionsJson(col),
    downloadAioConfigJson: meta => downloadAioConfigJson(meta),
    downloadCompiledBadgeJson: () => controller.downloadCompiledBadgeJson?.(),
    recordCompletion: () => recordCompletion?.().catch(() => {}),
    goToStep: stepNum => (typeof window !== 'undefined' ? window.goToStep?.(stepNum) : null),
    executePipeline: () => executePipeline?.(),
    showCompletionModal: opt => controller.showCompletionModal?.(opt),
    checkCompletion: () => checkManualCompletion(state, opt => controller.showCompletionModal?.(opt)),
  };
}
