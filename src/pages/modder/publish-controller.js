import { publishModderChanges } from '../../workflows/publish-modder-changes.js';
import { showModderToast } from './ui/modder-toast.js';
import { updatePublishProgress, appendPublishLog, showPublishSuccess, showPublishError, resetPublishConsole } from './ui/publish-modal.js';

function createPublishAction({ controller, client, getAvatars, patchCatalog, close }) {
  return async () => {
    if (controller.modderState.isPublishing || controller.modderState.publicationUncertain) return;
    controller.modderState.isPublishing = true;
    document.getElementById('publishStagedModal')?.setAttribute('aria-busy', 'true');
    const button = document.getElementById('btnConfirmPublish');
    if (button) button.disabled = true;
    document.getElementById('publishPhaseConfirm')?.classList.add('hidden');
    document.getElementById('publishPhaseProgress')?.classList.remove('hidden');
    resetPublishConsole(); updatePublishProgress(10, 'Iniciando publicación...');
    try {
      const result = await publishModderChanges({ client,
        stagedState: structuredClone(controller.stagedState), token: controller.modderState.token,
        email: controller.modderState.email, allAvatars: getAvatars(),
        onProgress: ({ percent, statusText, type, details }) => {
          updatePublishProgress(percent, statusText);
          appendPublishLog(type, details ? `${statusText} (${details})` : statusText);
        },
      });
      patchCatalog(result.operations);
      controller.clearStaged(); controller.updateToolbar(); controller.renderCatalog();
      showPublishSuccess(result.result?.commit, result.total, close);
      showModderToast('✓ Cambios guardados correctamente.', 'success');
    } catch (error) {
      controller.modderState.publicationUncertain = error.outcome === 'unknown';
      const detail = error.outcome === 'unknown'
        ? 'No se pudo confirmar la publicación. Conservamos el borrador; revisa GitHub antes de reintentar.' : error.message;
      appendPublishLog('error', detail);
      showPublishError('Error al publicar', detail, error.outcome === 'unknown' ? null
        : () => document.getElementById('btnConfirmPublish')?.click(), close);
    } finally {
      controller.modderState.isPublishing = false;
      document.getElementById('publishStagedModal')?.setAttribute('aria-busy', 'false');
      if (button) button.disabled = Boolean(controller.modderState.publicationUncertain);
    }
  };
}

export function bindPublishModalEvents(controller, { client, getAvatars, patchCatalog, renderBreakdown }) {
  const modal = document.getElementById('publishStagedModal');
  const close = () => { if (!controller.modderState.isPublishing) modal?.classList.add('hidden'); };
  document.getElementById('btnSaveAllChanges')?.addEventListener('click', () => {
    if (controller.modderState.isPublishing || controller.modderState.publicationUncertain) {
      showModderToast('Revisa el resultado de la publicación anterior antes de volver a publicar.', 'warning'); return;
    }
    if (!controller.modderState.token) { showModderToast('La sesión de colaborador no está disponible.', 'error'); return; }
    document.getElementById('publishPhaseConfirm')?.classList.remove('hidden');
    document.getElementById('publishPhaseProgress')?.classList.add('hidden');
    document.getElementById('publishPhaseResult')?.classList.add('hidden');
    renderBreakdown(); modal?.classList.remove('hidden');
  });
  for (const id of ['btnPublishModalClose', 'btnCancelPublish']) document.getElementById(id)?.addEventListener('click', close);
  document.getElementById('btnUndoChange')?.addEventListener('click', () => {
    if (!controller.modderState.isPublishing) controller.undo();
  });
  document.getElementById('btnConfirmPublish')?.addEventListener('click',
    createPublishAction({ controller, client, getAvatars, patchCatalog, close }));
}
