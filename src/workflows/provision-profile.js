import { runAiometadataStep } from './provisioning/aiometadata-step.js';
import { runAuthStep } from './provisioning/auth-step.js';
import { runSettingsStep } from './provisioning/settings-step.js';
import { runAddonsStep } from './provisioning/addons-step.js';
import { runCollectionsStep } from './provisioning/collections-step.js';

function setupExecution(state, log) {
  state.execution.isRunning = true;
  state.execution.isCompleted = false;
  state.execution.result = null;
  state.clearLogs?.();
  const isSimulation = state.execution.mode === 'simulation';
  log(`🚀 Iniciando proceso en modo: ${isSimulation ? 'SIMULACIÓN (Testing sin API)' : 'REAL (Llamadas a producción)'}`, 'info');
  return isSimulation;
}

export async function executeProfileProvisioning(state, { config = {}, services = {} } = {}) {
  if (!state?.execution || state.execution.isRunning) return;

  const log = (msg, level = 'info') => state.addLog?.(msg, level);
  const isSimulation = setupExecution(state, log);

  try {
    const { manifestUrl } = await runAiometadataStep({ state, config, services, isSimulation, log });
    const { targetProfileId, targetProfileName } = await runAuthStep({ state, config, services, isSimulation, log });
    await runSettingsStep({ state, config, services, isSimulation, targetProfileId, log });
    await runAddonsStep({ state, config, services, isSimulation, manifestUrl, targetProfileId, log });
    const collectionsCount = await runCollectionsStep({ state, config, services, isSimulation, targetProfileId, log });

    const uuid = manifestUrl.split('/stremio/')[1]?.replace('/manifest.json', '') || 'ok';
    state.execution.result = { uuid, manifestUrl, addonId: 'aio-metadata', collectionsCount, profileName: targetProfileName };
    state.execution.isCompleted = true;
    log('🎉 ¡Configuración completada con éxito! Tu Nuvio está listo.', 'success');

    if (!isSimulation && services.recordCompletion) {
      services.recordCompletion().catch(err => console.warn('[Pipeline] Error en contador:', err));
    }
  } catch (err) {
    const errMsg = err?.message || String(err);
    state.execution.error = errMsg;
    log(`❌ Error en el proceso: ${errMsg}`, 'error');
  } finally {
    state.execution.isRunning = false;
    state.notify?.('EXECUTION_FINISHED');
  }
}
