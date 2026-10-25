/** Keep available catalog data visible while a refresh runs. */
export function createAvatarRefresh({ state, services, lifetime, root, notify, render }) {
  return async function refresh(force = false) {
    if (state.isLoadingAvatars || lifetime.signal.aborted) return;
    state.isLoadingAvatars = true; state.avatarCatalogError = ''; render();
    const refreshButton = root.getElementById('btnRefreshAvatarsCatalog');
    refreshButton?.setAttribute('aria-busy', 'true');
    refreshButton?.querySelector('i')?.classList.add('fa-spin');
    try {
      const [, ranking] = await Promise.all([services.loadAvatarsCatalog(force), services.fetchTopAvatarKeys(32)]);
      if (lifetime.signal.aborted) return;
      state.mostUsedKeys = ranking;
      if (!lifetime.signal.aborted) render();
    } catch {
      if (!lifetime.signal.aborted) {
        state.avatarCatalogError = 'No se pudo cargar el catálogo de avatares.';
        if (services.getCompiledAvatars().length) notify('No se pudo actualizar el catálogo. Se conserva la última versión disponible.', 'warning');
      }
    } finally {
      state.isLoadingAvatars = false;
      if (!lifetime.signal.aborted) { refreshButton?.setAttribute('aria-busy', 'false'); refreshButton?.querySelector('i')?.classList.remove('fa-spin'); render(); }
    }
  };

}
