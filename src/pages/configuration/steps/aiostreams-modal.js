import { renderVerifiedKeyStatus, renderUnverifiedKeyStatus } from '../../../shared/ui/verified-key-status.js';

const DEBRID_IDS = ['Torbox', 'Alldebrid', 'Realdebrid', 'Premiumize', 'Debridlink', 'Easydebrid', 'Debrider', 'Torrin', 'Offcloud'];

const DEBRID_LINKS = {
  Torbox: 'https://torbox.app/settings',
  Alldebrid: 'https://alldebrid.com/apikeys',
  Realdebrid: 'https://real-debrid.com/apitoken',
  Premiumize: 'https://www.premiumize.me/account',
  Debridlink: 'https://debrid-link.com/webapp/apikey',
};

function renderDebridLink(statusEl, id) {
  if (!statusEl) return;
  if (DEBRID_LINKS[id]) {
    statusEl.innerHTML = `<a href="${DEBRID_LINKS[id]}" target="_blank" rel="noopener noreferrer" class="text-white/50 hover:text-white underline flex items-center gap-1" title="Obtener clave"><span class="hidden sm:inline">Obtener clave</span> <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i></a>`;
  } else {
    statusEl.innerHTML = '';
  }
}

export function updateInstallButtonState(root, draft, isEditing) {
  const btn = root.querySelector?.('#btnInstallAioStreams');
  if (!btn) return;
  const hasValidated = Object.values(draft?.validatedKeys || {}).some(Boolean);
  let hasUnvalidated = false;

  for (const id of DEBRID_IDS) {
    const val = (root.querySelector?.(`#inputDebrid${id}`)?.value || '').trim();
    if (val && !draft?.validatedKeys?.[id.toLowerCase()]) { hasUnvalidated = true; break; }
  }

  const enabled = hasValidated && !hasUnvalidated;
  btn.disabled = !enabled;
  btn.className = `lat-capsule-btn solid text-xs py-1.5 px-3.5 flex items-center gap-1.5 ${enabled ? 'opacity-100 cursor-pointer shadow-[var(--shadow-pill)]' : 'opacity-40 cursor-not-allowed shadow-[var(--shadow-pill)]'}`;
  btn.title = enabled
    ? (isEditing ? 'Actualizar AIOStreams con tus proveedores Debrid validados' : 'Instalar AIOStreams con tus proveedores Debrid validados')
    : (!hasValidated ? 'Debes validar al menos una clave API Debrid para continuar' : 'Hay claves modificadas sin validar. Pulsa Validar Claves o borra el campo.');
}

export function syncDebridModalInputs(root, draft, isEditing = false) {
  const iconEl = root.querySelector?.('#iconInstallAioStreams');
  const textEl = root.querySelector?.('#textInstallAioStreams');
  if (iconEl && textEl) {
    iconEl.className = isEditing ? 'fa-solid fa-arrows-rotate text-[10px]' : 'fa-solid fa-plus text-[10px]';
    textEl.innerText = isEditing ? 'Actualizar Addon' : 'Instalar Addon';
  }

  DEBRID_IDS.forEach(id => {
    const key = id.toLowerCase();
    const input = root.querySelector?.(`#inputDebrid${id}`);
    if (input) input.value = draft.debrids[key] || '';
    const statusEl = root.querySelector?.(`#statusDebrid${id}`);
    if (!statusEl) return;
    if (draft.validatedKeys[key]) {
      statusEl.innerHTML = '<span class="text-emerald-400 font-medium flex items-center gap-1"><i class="fa-solid fa-check text-[10px]"></i> Verificada</span>';
    } else {
      renderDebridLink(statusEl, id);
    }
  });
}

async function validateSingleKey(item, validateKey, draft, statusEl) {
  if (statusEl) statusEl.innerHTML = '<span class="text-amber-300 flex items-center gap-1"><i class="fa-solid fa-spinner fa-spin text-[10px]"></i> Verificando...</span>';
  try {
    const res = await validateKey(item.key, item.val);
    if (res.valid) {
      draft.validatedKeys[item.key] = true;
      draft.debrids[item.key] = item.val;
      if (statusEl) renderVerifiedKeyStatus(statusEl, res);
      return true;
    }
    delete draft.validatedKeys[item.key];
    delete draft.debrids[item.key];
    if (statusEl) renderUnverifiedKeyStatus(statusEl, res);
    return false;
  } catch (err) {
    delete draft.validatedKeys[item.key];
    delete draft.debrids[item.key];
    if (statusEl) statusEl.innerHTML = `<span class="text-rose-400 font-medium flex items-center gap-1" title="${err.message}"><i class="fa-solid fa-xmark text-[10px]"></i> Error de red</span>`;
    return false;
  }
}

export async function validateDraftKeys({ root, draft, validateKey, notify }) {
  const btnValidate = root.querySelector?.('#btnValidateDebridKeys');
  const btnText = root.querySelector?.('#btnValidateDebridKeysText');
  const entries = [];
  DEBRID_IDS.forEach(id => {
    const val = (root.querySelector?.(`#inputDebrid${id}`)?.value || '').trim();
    if (val) entries.push({ id, key: id.toLowerCase(), val });
  });

  if (!entries.length) {
    notify?.('Ingresa la clave API de al menos un proveedor Debrid para validar.', 'warning');
    root.querySelector?.('#inputDebridTorbox')?.focus();
    return;
  }

  if (btnValidate) btnValidate.disabled = true;
  if (btnText) btnText.innerText = 'Validando en vivo...';
  let passed = 0;
  let failed = 0;

  for (const item of entries) {
    const statusEl = root.querySelector?.(`#statusDebrid${item.id}`);
    const ok = await validateSingleKey(item, validateKey, draft, statusEl);
    if (ok) passed++; else failed++;
  }

  if (btnValidate) btnValidate.disabled = false;
  if (btnText) btnText.innerText = 'Validar Claves';
  updateInstallButtonState(root, draft, false);

  if (passed > 0 && failed === 0) notify?.(`✓ ${passed} clave(s) Debrid verificada(s) con éxito.`, 'success');
  else if (passed > 0) notify?.(`Se verificaron ${passed} clave(s), pero ${failed} falló. Corrige las erróneas para guardar.`, 'warning');
  else notify?.('No se pudo validar ninguna de las claves ingresadas. Verifica tus credenciales.', 'error');
}

export function commitAioStreamsInstall({ root, draft, state, onClose, notify }) {
  const activeDebrids = {};
  DEBRID_IDS.forEach(id => {
    const key = id.toLowerCase();
    const val = (root.querySelector?.(`#inputDebrid${id}`)?.value || '').trim();
    if (val && draft.validatedKeys[key]) activeDebrids[key] = val;
  });

  const hasUnvalidated = DEBRID_IDS.some(id => {
    const key = id.toLowerCase();
    const val = (root.querySelector?.(`#inputDebrid${id}`)?.value || '').trim();
    return val && !draft.validatedKeys[key];
  });

  if (hasUnvalidated) { notify?.('Tienes claves sin validar. Corrige o borra los campos erróneos.', 'error'); return; }
  if (!Object.keys(activeDebrids).length) { notify?.('Debes validar al menos una clave API Debrid antes de guardar.', 'warning'); return; }

  const isEditing = state.hasAioStreamsInstance();
  state.setAioStreamsConfig(activeDebrids, draft.validatedKeys);
  onClose?.();
  notify?.(isEditing ? '✓ Configuración de AIOStreams actualizada con éxito.' : '✓ AIOStreams Latino configurado y agregado a tus addons.', 'success');
}

export function bindAioStreamsModalEvents({ lifetime, root, handlers }) {
  const modalConflict = root.querySelector?.('#modalAioStreamsConflict');
  const modalReq = root.querySelector?.('#modalAioStreamsRequirement');
  const modalDebrids = root.querySelector?.('#modalAioStreamsDebrids');

  lifetime.on(root.querySelector?.('#btnOpenAddAioStreamsModal'), 'click', handlers.onOpenFlow);
  lifetime.on(root.querySelector?.('#btnCancelAioStreamsConflict'), 'click', handlers.onCloseConflict);
  lifetime.on(root.querySelector?.('#btnConfirmAioStreamsConflict'), 'click', handlers.onConfirmReplace);
  if (modalConflict) lifetime.on(modalConflict, 'click', e => { if (e.target === modalConflict) handlers.onCloseConflict(); });

  lifetime.on(root.querySelector?.('#btnCancelAioStreamsReq'), 'click', handlers.onCloseReq);
  lifetime.on(root.querySelector?.('#btnAcceptAioStreamsReq'), 'click', handlers.onAcceptReq);
  if (modalReq) lifetime.on(modalReq, 'click', e => { if (e.target === modalReq) handlers.onCloseReq(); });

  lifetime.on(root.querySelector?.('#btnCloseAioStreamsDebridsModal'), 'click', handlers.onCloseDebrids);
  lifetime.on(root.querySelector?.('#btnCancelAioStreamsDebrids'), 'click', handlers.onCloseDebrids);
  lifetime.on(root.querySelector?.('#btnValidateDebridKeys'), 'click', handlers.onValidate);
  lifetime.on(root.querySelector?.('#btnInstallAioStreams'), 'click', handlers.onInstall);
  if (modalDebrids) lifetime.on(modalDebrids, 'click', e => { if (e.target === modalDebrids) handlers.onCloseDebrids(); });
}
