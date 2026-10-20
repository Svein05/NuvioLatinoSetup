const pending = new WeakMap();

async function readProfileAddons({ state, client, config, container }, profileId) {
  try {
    const addons = await client.listAddons({ apiUrl: config.apiUrl,
      apikey: state.nuvioAuth?.apikey || config.anonKey, accessToken: state.nuvioAuth?.accessToken,
      userId: state.nuvioAuth?.userId, profileId });
    if (state.selectedProfileId !== profileId) return false;
    state.setProfileAddons?.(addons, profileId);
    return true;
  } catch {
    if (state.selectedProfileId === profileId && container) {
      container.innerHTML = '<p class="p-4 text-amber-300">No se pudieron cargar los addons del perfil.</p><button id="btnRetryWizardAddons" type="button" class="lat-capsule-btn glass">Reintentar</button>';
    }
    return false;
  } finally {
    if (pending.get(state)?.profileId === profileId) pending.delete(state);
  }
}

export async function syncProfileAddonsIfNeeded(context) {
  const { state, container } = context;
  const profileId = state.selectedProfileId;
  if (state.isManualMode || !profileId || state.hasLoadedAddonsForProfile === profileId) return true;
  if (pending.get(state)?.profileId === profileId) return pending.get(state).promise;
  if (container) container.innerHTML = '<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin"></i> Cargando addons del perfil...</div>';
  const promise = readProfileAddons(context, profileId);
  pending.set(state, { profileId, promise });
  return promise;
}
