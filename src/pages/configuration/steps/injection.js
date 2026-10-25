import { createLifetime } from '../../../shared/ui/lifetime.js';
import { mountDisclosure } from '../../../shared/ui/disclosure/mount.js';
import {
  updateStep7ExecuteButton,
  updateManualModeButtons,
  renderExecutionProgress,
  renderExecutionSuccess,
  renderExecutionError,
} from './injection-view.js';
import { refreshStep7Summary } from './summary.js';

function bindPasswordControls({ lifetime, root, state, onSync, notify }) {
  const input = root.querySelector?.('#aioPassword');
  const btnGen = root.querySelector?.('#btnGeneratePassword');

  if (input) {
    if (state.aiometadata?.password) input.value = state.aiometadata.password;
    else if (input.value) state.aiometadata.password = input.value.trim();

    const sync = () => {
      state.aiometadata.password = input.value.trim();
      onSync();
    };

    ['input', 'change', 'keyup', 'focus', 'blur'].forEach(evt => lifetime.on(input, evt, sync));
    lifetime.on(input, 'paste', () => setTimeout(sync, 10));
  }

  if (btnGen && input) {
    lifetime.on(btnGen, 'click', () => {
      const random = `Latino-${crypto.randomUUID().replaceAll('-', '')}-${crypto.getRandomValues(new Uint32Array(1))[0]}`;
      input.value = random;
      state.aiometadata.password = random;
      onSync();
      notify?.('Contraseña aleatoria generada y configurada', 'info');
    });
  }
}

function bindManualCopyActions({ lifetime, root, state, actions }) {
  lifetime.on(root.querySelector?.('#btnCopyCollectionsJson'), 'click', async () => {
    state.manualCompletionId ||= crypto.randomUUID();
    try {
      await actions.copyText(JSON.stringify(state.getSynchronizedNuvioCollections(), null, 2));
      state.manualCopiedCollections = true;
      actions.notify?.('✓ Archivo JSON de Colecciones copiado al portapapeles', 'success');
      actions.checkCompletion?.();
    } catch { actions.notify?.('No se pudo copiar automáticamente al portapapeles.', 'warning'); }
  });

  lifetime.on(root.querySelector?.('#btnCopyAioConfig'), 'click', async () => {
    if (!state.aiometadata?.password || state.aiometadata.password.length < 6) {
      actions.notify?.('Debes ingresar o generar una contraseña para tus addons (mínimo 6 caracteres) primero.', 'warning');
      root.querySelector?.('#aioPassword')?.focus();
      return;
    }
    state.manualCompletionId ||= crypto.randomUUID();
    try {
      await actions.copyText(JSON.stringify(state.getSynchronizedMetadataPayload(), null, 2));
      state.manualCopiedAio = true;
      actions.notify?.('✓ Archivo JSON de AIOMetadata copiado al portapapeles', 'success');
      actions.checkCompletion?.();
    } catch { actions.notify?.('No se pudo copiar automáticamente al portapapeles.', 'warning'); }
  });

  lifetime.on(root.querySelector?.('#btnCopyBadgeUrl'), 'click', () => actions.copyBadgeJsonUrl?.());
  lifetime.on(root.querySelector?.('#btnCopyBadgeCompiledJson'), 'click', () => actions.copyCompiledBadgeJson?.());
  lifetime.on(root.querySelector?.('#btnCopyAioStreamsManifest'), 'click', () => actions.copyAioStreamsManifest?.());
}

function bindManualDownloadActions({ lifetime, root, state, actions }) {
  lifetime.on(root.querySelector?.('#btnDownloadCollections'), 'click', () => {
    state.manualCompletionId ||= crypto.randomUUID();
    actions.downloadCollectionsJson?.(state.getSynchronizedNuvioCollections());
    state.manualCopiedCollections = true;
    actions.checkCompletion?.();
  });

  lifetime.on(root.querySelector?.('#btnDownloadAioConfig'), 'click', () => {
    state.manualCompletionId ||= crypto.randomUUID();
    if (state.isManualMode && (!state.aiometadata?.password || state.aiometadata.password.length < 6)) {
      actions.notify?.('Debes ingresar o generar una contraseña para tus addons (mínimo 6 caracteres) primero.', 'warning');
      root.querySelector?.('#aioPassword')?.focus();
      return;
    }
    actions.downloadAioConfigJson?.(state.getSynchronizedMetadataPayload());
    state.manualCopiedAio = true;
    actions.checkCompletion?.();
  });

  lifetime.on(root.querySelector?.('#btnDownloadBadges'), 'click', () => actions.downloadCompiledBadgeJson?.());
}

function bindExecutePipeline({ lifetime, root, state, actions }) {
  const btn = root.querySelector?.('#btnExecutePipeline');
  if (!btn) return;

  lifetime.on(btn, 'click', () => {
    const input = root.querySelector?.('#aioPassword');
    if (input?.value) state.aiometadata.password = input.value.trim();

    for (let i = 1; i <= 7; i++) {
      const val = state.validateStep(i);
      if (!val.valid) {
        actions.notify?.(`Paso ${i} incompleto: ${val.error}`, 'error');
        if (i < 7) actions.goToStep?.(i);
        if (i === 7) input?.focus();
        return;
      }
    }

    renderExecutionProgress(root, { current: 1, total: 5, message: 'Conectando con servidores de AIOMetadata y Nuvio...' });
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Aprovisionando en Nuvio...</span>';
    actions.executePipeline?.();
  });
}

export function mountInjectionStep({ state, actions, root = document } = {}) {
  const lifetime = createLifetime();
  lifetime.add(mountDisclosure(root.querySelector?.('.wizard-config-files')));

  const onSync = () => {
    actions.saveSession?.();
    updateStep7ExecuteButton(root, state);
    updateManualModeButtons(root, state);
    actions.onUpdate?.();
  };

  bindPasswordControls({ lifetime, root, state, onSync, notify: actions.notify });
  bindManualCopyActions({ lifetime, root, state, actions });
  bindManualDownloadActions({ lifetime, root, state, actions });
  bindExecutePipeline({ lifetime, root, state, actions });

  return {
    refreshSummary: () => refreshStep7Summary(root, state),
    updateUI: () => {
      updateStep7ExecuteButton(root, state);
      updateManualModeButtons(root, state);
      refreshStep7Summary(root, state);
    },
    handleLog: log => {
      const match = log?.message?.match(/\[(\d+)\/(\d+)\]/);
      if (match) {
        renderExecutionProgress(root, { current: parseInt(match[1], 10), total: parseInt(match[2], 10), message: log.message });
      }
    },
    handleFinished: ({ isCompleted, profileName, error }) => {
      if (isCompleted) {
        renderExecutionSuccess(root, profileName);
        actions.notify?.('🎉 ¡Aprovisionamiento completado con éxito en Nuvio!', 'success');
      } else {
        renderExecutionError(root, error || 'Ocurrió un error inesperado al procesar la inyección.');
        actions.notify?.('Ocurrió un error durante la inyección. Revisa el detalle.', 'error');
      }
    },
    dispose: () => lifetime.dispose(),
  };
}
