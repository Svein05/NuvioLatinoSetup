import { compileStreamingConfig } from '../features/addons/index.js';

export async function generateAioStreamsManifest({
  state,
  config,
  createConfiguration,
  fetchTemplate,
  notify,
  copyText,
  button,
  passwordInput,
}) {
  const hasPassword = Boolean(state.aiometadata?.password && state.aiometadata.password.length >= 6);
  if (!hasPassword) {
    notify?.('Debes ingresar o generar una contraseña para tus addons (mínimo 6 caracteres) primero.', 'warning');
    passwordInput?.focus?.();
    return;
  }

  const originalHtml = button?.innerHTML;
  try {
    if (button) {
      button.disabled = true;
      button.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-cyan-400"></i><span>Generando...</span>';
    }

    let manifestUrl = state.aiostreams?.manifestUrl;
    if (!manifestUrl) {
      notify?.('Generando manifest de AIOStreams en la instancia oficial...', 'info');
      let template = state.rawAioStreamsTemplate;
      if (!template) {
        template = await fetchTemplate();
        state.rawAioStreamsTemplate = template;
      }
      const aioConfig = compileStreamingConfig(template, state.aiostreams.debrids);
      const res = await createConfiguration(config.aiostreamsInstance, aioConfig, state.aiometadata.password.trim());
      manifestUrl = res.manifestUrl;
      state.aiostreams.manifestUrl = manifestUrl;
    }

    await copyText(manifestUrl);
    notify?.('✓ Enlace del Manifiesto de AIOStreams copiado al portapapeles', 'success');
  } catch (err) {
    notify?.(`Error al generar o copiar AIOStreams: ${err.message}`, 'error');
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalHtml;
    }
  }
}
