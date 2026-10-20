export async function syncProfileAddonsIfNeeded({ state, client, config, container }) {
  if (state.isManualMode || !state.selectedProfileId) return;
  if (state.hasLoadedAddonsForProfile === state.selectedProfileId) return;

  if (container) {
    container.innerHTML = `
      <div class="py-12 flex flex-col items-center justify-center text-center space-y-3">
        <i class="fa-solid fa-spinner fa-spin text-2xl text-[#ffd479]"></i>
        <p class="text-xs text-white/60">Cargando addons de tu cuenta de Nuvio...</p>
      </div>
    `;
  }

  try {
    const addons = await client.listAddons({
      apiUrl: config.apiUrl,
      apikey: state.nuvioAuth?.apikey || config.anonKey,
      accessToken: state.nuvioAuth?.accessToken,
      userId: state.nuvioAuth?.userId,
      profileId: state.selectedProfileId,
    });
    state.setProfileAddons?.(addons, state.selectedProfileId);
  } catch (err) {
    console.warn('[AppController] Error cargando addons de perfil:', err);
  }
}
