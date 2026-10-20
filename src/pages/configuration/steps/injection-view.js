export function updateStep7ExecuteButton(root, state) {
  const btn = root.querySelector?.('#btnExecutePipeline');
  if (!btn) return;

  if (state.isManualMode) {
    btn.classList.add('hidden');
    btn.style.display = 'none';
    return;
  }

  btn.classList.remove('hidden');
  btn.style.display = 'flex';

  const hasPassword = Boolean(state.aiometadata?.password && state.aiometadata.password.length >= 6);
  btn.disabled = !hasPassword;
  btn.className = hasPassword
    ? 'lat-capsule-btn solid px-7 py-3 text-sm flex items-center gap-2 shadow-[var(--shadow-lift)] cursor-pointer'
    : 'lat-capsule-btn glass opacity-40 px-7 py-3 text-sm flex items-center gap-2 cursor-not-allowed shadow-none';
  btn.title = hasPassword
    ? 'Ejecutar la inyección y configuración automática'
    : 'Ingresa o genera una contraseña maestra (mínimo 6 caracteres) para activar';
}

export function updateManualModeButtons(root, state) {
  const hasPassword = Boolean(state.aiometadata?.password?.trim().length >= 6);
  for (const id of ['#btnCopyAioConfig', '#btnDownloadAioConfig']) {
    const button = root.querySelector?.(id);
    if (!button) continue;
    button.disabled = !hasPassword;
    button.classList.toggle('opacity-40', !hasPassword);
    button.classList.toggle('cursor-not-allowed', !hasPassword);
    button.title = hasPassword ? 'Exportar configuración de AIOMetadata' : 'Define una contraseña de al menos 6 caracteres';
  }
  const isBadgesEnabled = Boolean(state.preferences?.badgesEnabled);
  const isAioStreamsInstalled = Boolean(state.aiostreams?.installed || (state.profileAddons || []).some(a => a.isAioStreams));

  const toggle = (id, visible) => {
    const el = root.querySelector?.(id);
    if (el) el.classList.toggle('hidden', !visible);
  };

  toggle('#btnCopyBadgeUrl', isBadgesEnabled);
  toggle('#btnCopyBadgeCompiledJson', isBadgesEnabled);
  toggle('#btnDownloadBadges', isBadgesEnabled);
  toggle('#btnCopyAioStreamsManifest', isAioStreamsInstalled);
}

export function renderExecutionProgress(root, { current, total, message }) {
  root.querySelector?.('#injectionStatusContainer')?.classList.remove('hidden');
  const stepEl = root.querySelector?.('#injectionPhaseStep');
  const barEl = root.querySelector?.('#injectionProgressBar');
  const detailEl = root.querySelector?.('#injectionPhaseDetail');
  if (stepEl) stepEl.innerText = `Fase ${current} de ${total}`;
  if (barEl) barEl.style.width = `${(current / total) * 100}%`;
  if (detailEl && message) detailEl.innerText = message;
}

export function renderExecutionSuccess(root, profileName = 'Principal') {
  const btn = root.querySelector?.('#btnExecutePipeline');
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i><span>Configuración Lista (Re-ejecutar)</span>';
  }
  const title = root.querySelector?.('#injectionPhaseTitle');
  if (title) title.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-400"></i><span class="text-emerald-400">¡Configuración inyectada con éxito!</span>';
  const bar = root.querySelector?.('#injectionProgressBar');
  if (bar) { bar.style.width = '100%'; bar.className = 'bg-emerald-500 h-1.5 rounded-full transition-all duration-300'; }
  const detail = root.querySelector?.('#injectionPhaseDetail');
  if (detail) {
    detail.innerText = `Perfil "${profileName}" configurado y listo en tu app Nuvio.`;
    detail.className = 'text-[11px] text-emerald-300 font-medium';
  }
}

export function renderExecutionError(root, errorDetail) {
  const btn = root.querySelector?.('#btnExecutePipeline');
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i><span>Configuración Lista (Re-ejecutar)</span>';
  }
  const title = root.querySelector?.('#injectionPhaseTitle');
  if (title) title.innerHTML = '<i class="fa-solid fa-circle-exclamation text-rose-400"></i><span class="text-rose-400 font-bold">Error durante la inyección</span>';
  const bar = root.querySelector?.('#injectionProgressBar');
  if (bar) bar.className = 'bg-rose-500 h-1.5 rounded-full transition-all duration-300';
  const detail = root.querySelector?.('#injectionPhaseDetail');
  if (detail) {
    detail.innerHTML = `
      <div class="mt-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1.5">
        <div class="flex items-center gap-2 text-rose-400 font-semibold text-xs"><i class="fa-solid fa-bug"></i><span>Detalle técnico del error:</span></div>
        <p class="text-rose-200 text-xs font-mono break-words leading-relaxed select-text">${errorDetail}</p>
      </div>
      <p class="text-[11px] text-slate-400 mt-2">💡 Puedes reintentar o usar los botones de descarga manual.</p>
    `;
    detail.className = 'text-xs text-slate-300';
  }
}
