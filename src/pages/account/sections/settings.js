function parseJsonSafe(val) {
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

function extractCredKey(cred) {
  if (!cred) return '';
  const json = parseJsonSafe(cred.credential_json || cred.credentials || cred);
  if (typeof json === 'object' && json !== null) {
    return json.api_key || json.apiKey || json.key || json.value || '';
  }
  return typeof cred.api_key === 'string' ? cred.api_key : '';
}

function parseFeaturesBlob(blob) {
  const raw = parseJsonSafe(blob);
  const pSettings = parseJsonSafe(raw?.p_settings_json || raw?.settings_json || raw?.p_settings || raw?.settings);
  const features = parseJsonSafe(pSettings?.features || raw?.features || pSettings || raw || {});
  return typeof features === 'object' && features !== null ? features : {};
}

export function extractProfileSettings({ blob, credentials = [], aioConfig, currentSettings = {}, fallbackKeys = {} }) {
  const features = parseFeaturesBlob(blob);
  const tmdb = features.tmdb_settings || features.tmdb || {};
  const mdblist = features.mdblist_settings || features.mdblist || {};
  const streamBadges = features.stream_badge_settings || features.stream_badges || features.badges || null;

  const tmdbCred = credentials.find(c => String(c.provider || '').toLowerCase() === 'tmdb');
  const mdblistCred = credentials.find(c => String(c.provider || '').toLowerCase() === 'mdblist');

  const aioKeys = aioConfig?.apiKeys || aioConfig?.config?.apiKeys || {};
  const blobTmdb = tmdb.tmdb_api_key?.value || (typeof tmdb.tmdb_api_key === 'string' ? tmdb.tmdb_api_key : '');
  const blobMdb = mdblist.mdblist_api_key?.value || (typeof mdblist.mdblist_api_key === 'string' ? mdblist.mdblist_api_key : '');

  const resolvedTmdb = (extractCredKey(tmdbCred) || blobTmdb || aioKeys.tmdb || currentSettings.tmdb_api_key || fallbackKeys.tmdb || '').trim();
  const resolvedMdb = (extractCredKey(mdblistCred) || blobMdb || aioKeys.mdblist || currentSettings.mdblist_api_key || fallbackKeys.mdblist || '').trim();

  return {
    streamBadges,
    settings: {
      enrichment_enabled: tmdb.tmdb_enabled?.value !== false,
      ratings_enabled: mdblist.mdblist_enabled?.value !== false,
      tmdb_language: tmdb.tmdb_language?.value || 'es-MX',
      tmdb_api_key: resolvedTmdb,
      mdblist_api_key: resolvedMdb,
    },
  };
}

function buildSettingsHtml(st) {
  return `
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-white flex items-center gap-2">
              <i class="fa-solid fa-film text-amber-300"></i>
              <span>TMDB API Key & Enriquecimiento</span>
            </label>
            <label class="lat-switch" title="Activar/desactivar enriquecimiento oficial">
              <input type="checkbox" id="chkEnrichment" ${st.enrichment_enabled ? 'checked' : ''}>
              <span class="lat-switch-track"><span class="lat-switch-thumb"></span></span>
            </label>
          </div>
          <div>
            <label class="text-xs text-white/60 block mb-1">Clave de API TMDB</label>
            <div class="relative">
              <input type="password" id="inputTmdbKey" value="${st.tmdb_api_key || ''}" 
                     placeholder="API Key v3 de TMDB" class="lat-field w-full text-xs font-mono pr-10">
              <button type="button" class="btn-toggle-key absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 transition-colors cursor-pointer z-10" data-target="inputTmdbKey" title="Mostrar clave">
                <i class="fa-solid fa-eye text-xs pointer-events-none"></i>
              </button>
            </div>
            <p class="text-[11px] text-white/40 mt-1.5 leading-relaxed">
              Utilizada por Nuvio para sinopsis, actores y pósters oficiales en español latino.
            </p>
          </div>
        </div>
        <div class="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-white flex items-center gap-2">
              <i class="fa-solid fa-star text-amber-400"></i>
              <span>MDBList API Key & Calificaciones</span>
            </label>
            <label class="lat-switch" title="Activar/desactivar calificaciones">
              <input type="checkbox" id="chkRatings" ${st.ratings_enabled ? 'checked' : ''}>
              <span class="lat-switch-track"><span class="lat-switch-thumb"></span></span>
            </label>
          </div>
          <div>
            <label class="text-xs text-white/60 block mb-1">Clave de API MDBList</label>
            <div class="relative">
              <input type="password" id="inputMdblistKey" value="${st.mdblist_api_key || ''}" 
                     placeholder="API Key de MDBList" class="lat-field w-full text-xs font-mono pr-10">
              <button type="button" class="btn-toggle-key absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 transition-colors cursor-pointer z-10" data-target="inputMdblistKey" title="Mostrar clave">
                <i class="fa-solid fa-eye text-xs pointer-events-none"></i>
              </button>
            </div>
            <p class="text-[11px] text-white/40 mt-1.5 leading-relaxed">
              Proporciona calificaciones agregadas (IMDb, Rotten Tomatoes, Trakt) en las carátulas de Nuvio.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderSettingsSection(state, { root = document, onDirty, setupPasswordToggles } = {}) {
  const container = root.getElementById?.('accountSettingsContainer');
  if (!container) return;

  container.innerHTML = buildSettingsHtml(state.settings || {});
  setupPasswordToggles?.();
  bindSettingsEvents(container, state, onDirty);
}

function bindSettingsEvents(container, state, onDirty) {
  const chkE = container.querySelector('#chkEnrichment');
  const chkR = container.querySelector('#chkRatings');
  const inTmdb = container.querySelector('#inputTmdbKey');
  const inMdb = container.querySelector('#inputMdblistKey');

  const onSettingsChange = () => {
    if (chkE) state.settings.enrichment_enabled = chkE.checked;
    if (chkR) state.settings.ratings_enabled = chkR.checked;
    if (inTmdb) state.settings.tmdb_api_key = inTmdb.value.trim();
    if (inMdb) state.settings.mdblist_api_key = inMdb.value.trim();

    const orig = state.originalSettings || {};
    const isDiff = Boolean(
      Boolean(state.settings.enrichment_enabled) !== Boolean(orig.enrichment_enabled) ||
      Boolean(state.settings.ratings_enabled) !== Boolean(orig.ratings_enabled) ||
      (state.settings.tmdb_api_key || '') !== (orig.tmdb_api_key || '') ||
      (state.settings.mdblist_api_key || '') !== (orig.mdblist_api_key || '')
    );
    onDirty?.(isDiff);
  };

  chkE?.addEventListener('change', onSettingsChange);
  chkR?.addEventListener('change', onSettingsChange);
  inTmdb?.addEventListener('input', onSettingsChange);
  inMdb?.addEventListener('input', onSettingsChange);
}
