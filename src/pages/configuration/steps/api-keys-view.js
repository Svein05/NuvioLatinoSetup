export const keyFields = { tmdb: 'keyTmdb', mdblist: 'keyMdblist' };

export function readKeySnapshot(root) {
  const keys = Object.fromEntries(Object.entries(keyFields).map(([key, id]) => [key, root.querySelector(`#${id}`)?.value.trim() || '']));
  Object.assign(keys, { rpdb: 't0-free-rpdb', tvdb: '', gemini: '', openrouter: '' });
  return { keys, aiEnabled: false };
}

export function renderKeyResult(provider, result, root) {
  const badge = root.querySelector(`#badge-${provider}`);
  const input = root.querySelector(`#${keyFields[provider]}`);
  const card = root.querySelector(`[data-api-key-card="${provider}"]`);
  const pending = ['skipped', 'pending'].includes(result.status);
  const invalid = !pending && ['invalid', 'required'].includes(result.status);
  const status = pending ? '' : result.valid === true ? 'valid' : invalid ? 'invalid' : 'unavailable';
  if (card) {
    if (status) card.dataset.keyStatus = status;
    else delete card.dataset.keyStatus;
  }
  input?.classList.remove('border-red-500/60', 'border-emerald-500/50');
  input?.setAttribute('aria-invalid', String(invalid));
  if (!badge) return;
  badge.textContent = pending ? '' : result.valid === true ? 'Clave válida.'
    : result.status === 'required' ? 'Ingresa tu clave API.'
      : invalid ? 'Clave rechazada.' : 'No se pudo verificar la clave. Intenta nuevamente.';
}

export function renderKeySummary(result, root) {
  const badge = root.querySelector('#apiKeyOverallBadge');
  const message = root.querySelector('#apiKeyStatusMessage');
  badge?.classList.toggle('hidden', !result.valid);
  if (badge && result.valid) badge.className = 'text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono flex items-center gap-1.5';
  if (!message) return;
  message.textContent = result.valid
    ? `✓ Claves obligatorias verificadas.${result.warnings.length ? ' Hay proveedores opcionales sin verificar.' : ' Ya puedes avanzar al siguiente paso.'}`
    : 'No se pudieron verificar las claves obligatorias. Revisa los resultados e intenta de nuevo.';
  message.className = `text-[11px] mt-0.5 font-medium ${result.valid ? 'text-emerald-400' : 'text-amber-400'}`;
}

export function invalidateKeySummary(root) {
  root.querySelector('#apiKeyOverallBadge')?.classList.add('hidden');
  const message = root.querySelector('#apiKeyStatusMessage');
  if (message) {
    message.textContent = 'Has modificado tus claves. Debes probarlas nuevamente para continuar.';
    message.className = 'text-[11px] text-amber-400 mt-0.5 font-medium';
  }
}

export function renderKeyBusy(busy, root) {
  const button = root.querySelector('#btnValidateApiKeys');
  if (!button) return;
  button.disabled = busy;
  button.innerHTML = busy ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Probando credenciales...</span>'
    : '<i class="fa-solid fa-vial-circle-check"></i><span>Probar API keys</span>';
}
