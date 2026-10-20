export function renderAioUnlockPrompt({ root = document, state, onUnlock, setupPasswordToggles }) {
  const card = root.getElementById?.('accountAioCard');
  if (!card) return;

  card.innerHTML = `
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-amber-500/30 space-y-4">
      <div class="flex items-center gap-3 text-amber-300">
        <i class="fa-solid fa-shield-halved text-xl"></i>
        <div>
          <h4 class="text-sm font-semibold text-white">Addon AIOMetadata Protegido</h4>
          <span class="text-xs text-white/60">Este addon requiere su contraseña para sincronizar los catálogos en vivo.</span>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div>
          <label class="text-xs text-white/70 block mb-1 font-medium">UUID del Addon</label>
          <input type="text" id="inputAioUuidPrompt" value="${state.aioUuid || ''}" readonly 
                 class="lat-field w-full text-xs font-mono opacity-80 cursor-not-allowed">
        </div>
        <div>
          <label class="text-xs text-white/70 block mb-1 font-medium">Contraseña de AIOMetadata</label>
          <div class="relative">
            <input type="password" id="inputAioPasswordPrompt" placeholder="Tu contraseña de addon" 
                   class="lat-field w-full text-xs font-mono pr-10">
            <button type="button" class="btn-toggle-key absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 transition-colors cursor-pointer z-10" data-target="inputAioPasswordPrompt" title="Mostrar contraseña">
              <i class="fa-solid fa-eye text-xs pointer-events-none"></i>
            </button>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-between pt-2">
        <div id="aioPromptError" class="text-xs text-rose-400 font-medium"></div>
        <button type="button" id="btnUnlockAio" class="lat-capsule-btn solid text-xs py-2 px-5 font-semibold">
          <i class="fa-solid fa-lock-open mr-1.5"></i> Desbloquear & Sincronizar
        </button>
      </div>
    </div>
  `;

  setupPasswordToggles?.();
  const btnUnlock = root.getElementById?.('btnUnlockAio');
  const passInput = root.getElementById?.('inputAioPasswordPrompt');
  const errorEl = root.getElementById?.('aioPromptError');

  btnUnlock?.addEventListener('click', () => {
    const pass = passInput?.value?.trim();
    if (!pass) {
      if (errorEl) errorEl.textContent = 'Por favor ingresa la contraseña.';
      return;
    }
    onUnlock?.(pass, errorEl);
  });
}

function buildAioHtml({ hasAddon, uuid, manifestUrl, stremioDeepLink, currentEngine, password }) {
  return `
    <div class="space-y-6">
      <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2.5">
            <i class="fa-solid fa-wand-magic-sparkles text-emerald-400 text-lg"></i>
            <div>
              <h4 class="text-sm font-semibold text-white">Addon AIOMetadata Vinculado</h4>
              <span class="text-xs text-white/50">${hasAddon ? 'Detectado y activo en este perfil' : 'No detectado en este perfil'}</span>
            </div>
          </div>
          ${uuid ? `<span class="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">UUID: ${uuid}</span>` : ''}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div>
            <label class="text-xs text-white/60 block mb-1">UUID de Configuración</label>
            <div class="flex gap-2">
              <input type="text" id="inputAioUuid" value="${uuid}" class="lat-field flex-1 text-xs font-mono">
              <button type="button" id="btnLoadAioByUuid" class="lat-capsule-btn glass text-xs py-1.5 px-3">Cargar</button>
            </div>
          </div>
          <div>
            <label class="text-xs text-white/60 block mb-1">Contraseña de AIOMetadata</label>
            <input type="password" id="inputAioPassword" value="${password || ''}" class="lat-field w-full text-xs font-mono">
          </div>
        </div>
        ${manifestUrl ? `
          <div class="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input type="text" id="inputAioManifestUrl" value="${manifestUrl}" readonly class="lat-field flex-1 text-xs font-mono select-all bg-black/30">
            <button type="button" id="btnCopyAioManifest" class="lat-capsule-btn glass text-xs py-2 px-3.5"><i class="fa-regular fa-copy mr-1.5"></i> Copiar</button>
            <a href="${stremioDeepLink}" class="lat-capsule-btn solid text-xs py-2 px-3.5"><i class="fa-solid fa-arrow-up-right-from-square mr-1.5"></i> Abrir</a>
          </div>
        ` : ''}
        <div id="aioLoadingStatus" class="text-xs text-amber-300 font-mono"></div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        <div id="cardPosterDefault" class="p-4 rounded-2xl bg-white/[0.03] border-2 ${currentEngine === 'default' ? 'border-[#ffd479]' : 'border-white/10'} cursor-pointer">
          <span class="text-xs font-semibold text-white">Default (Nativo)</span>
        </div>
        <div id="cardPosterBetter" class="p-4 rounded-2xl bg-white/[0.03] border-2 ${currentEngine === 'betterposter' ? 'border-[#ffd479]' : 'border-white/10'} cursor-pointer">
          <span class="text-xs font-semibold text-white">BetterPoster</span>
        </div>
        <div id="cardPosterPlus" class="p-4 rounded-2xl bg-white/[0.03] border-2 ${currentEngine === 'postersplus' ? 'border-[#ffd479]' : 'border-white/10'} cursor-pointer">
          <span class="text-xs font-semibold text-white">PostersPlus</span>
        </div>
      </div>
    </div>
  `;
}

export function renderAioSection(state, {
  root = document,
  defaultAioUrl = 'https://aiometadata.strem.fun',
  setupPasswordToggles,
  onUnlock,
  onEngineChange,
  onPasswordChange,
  onCopyManifest,
  onLoadByUuid,
} = {}) {
  const card = root.getElementById?.('accountAioCard');
  if (!card) return;

  if (state.aioProtected) {
    renderAioUnlockPrompt({ root, state, onUnlock, setupPasswordToggles });
    return;
  }

  const uuid = state.aioUuid || '';
  const manifestUrl = state.aioAddon?.manifest_url || state.aioAddon?.url || (uuid ? `${defaultAioUrl}/stremio/${uuid}/manifest.json` : '');
  const stremioDeepLink = manifestUrl ? `stremio://${manifestUrl.replace(/^https?:\/\//, '')}` : '';

  card.innerHTML = buildAioHtml({
    hasAddon: Boolean(state.aioAddon || state.aioUuid),
    uuid,
    manifestUrl,
    stremioDeepLink,
    currentEngine: state.posterEngine || 'default',
    password: state.aioPassword,
  });

  setupPasswordToggles?.();
  bindAioActions({ root, onCopyManifest, onLoadByUuid, onPasswordChange, onEngineChange, manifestUrl });
}

function bindAioActions({ root, onCopyManifest, onLoadByUuid, onPasswordChange, onEngineChange, manifestUrl }) {
  root.getElementById?.('btnCopyAioManifest')?.addEventListener('click', () => onCopyManifest?.(manifestUrl));
  root.getElementById?.('btnLoadAioByUuid')?.addEventListener('click', () => {
    const uuid = root.getElementById?.('inputAioUuid')?.value?.trim();
    if (uuid) onLoadByUuid?.(uuid);
  });
  root.getElementById?.('inputAioPassword')?.addEventListener('input', (e) => {
    onPasswordChange?.(e.target.value);
  });
  root.getElementById?.('cardPosterDefault')?.addEventListener('click', () => onEngineChange?.('default'));
  root.getElementById?.('cardPosterBetter')?.addEventListener('click', () => onEngineChange?.('betterposter'));
  root.getElementById?.('cardPosterPlus')?.addEventListener('click', () => onEngineChange?.('postersplus'));
}
