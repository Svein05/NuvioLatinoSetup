import { isDuplicateManifestUrl, normalizeManifestUrl, getAddonFallbackLogo, fetchAddonManifestInfo } from './addons-manifest.js';

export function openAccountEditAddonModal({ root = document, state, index }) {
  const addon = state.installedAddons?.[index];
  if (!addon) return;

  state._editingAddonIndex = index;
  const modal = root.getElementById?.('modalAccountEditAddon');
  const nameInput = root.getElementById?.('inputAccountEditAddonName');
  const urlInput = root.getElementById?.('inputAccountEditAddonUrl');
  const enabledInput = root.getElementById?.('inputAccountEditAddonEnabled');

  if (nameInput) nameInput.value = addon.name || '';
  if (urlInput) urlInput.value = addon.manifest_url || addon.url || '';
  const isEnabled = addon.enabled !== false;
  if (enabledInput) enabledInput.checked = isEnabled;

  modal?.classList.remove('hidden');
  modal?.classList.add('flex');
}

export function closeAccountEditAddonModal({ root = document, state }) {
  state._editingAddonIndex = null;
  const modal = root.getElementById?.('modalAccountEditAddon');
  modal?.classList.add('hidden');
  modal?.classList.remove('flex');
}

export function saveAccountEditAddon({ root = document, state, pushHistory, onDirty, renderAddons, showToast }) {
  const idx = state._editingAddonIndex;
  if (idx === null || idx === undefined || !state.installedAddons?.[idx]) return;

  const nameInput = root.getElementById?.('inputAccountEditAddonName');
  const urlInput = root.getElementById?.('inputAccountEditAddonUrl');
  const enabledInput = root.getElementById?.('inputAccountEditAddonEnabled');

  const newName = (nameInput?.value || '').trim();
  const rawUrl = (urlInput?.value || '').trim();
  const isEnabled = enabledInput ? enabledInput.checked : true;

  if (!rawUrl) {
    showToast?.('Por favor ingresa la URL del manifiesto.', 'warning');
    return;
  }

  if (isDuplicateManifestUrl(state.installedAddons, rawUrl, idx)) {
    showToast?.('Ya existe otro addon en la lista con este mismo enlace de manifiesto.', 'warning');
    return;
  }

  const newUrl = normalizeManifestUrl(rawUrl);
  pushHistory?.();
  const addon = state.installedAddons[idx];
  addon.name = newName || addon.name || `Addon ${idx + 1}`;
  addon.manifest_url = newUrl;
  addon.url = newUrl;
  addon.transport_url = newUrl;
  addon.enabled = isEnabled;
  addon._manifestEnriched = false;

  closeAccountEditAddonModal({ root, state });
  onDirty?.('addons', true);
  renderAddons?.();
  showToast?.('✓ Addon modificado correctamente.', 'success');
}

export function openAccountAddAddonModal(root = document) {
  const modal = root.getElementById?.('modalAccountAddAddon');
  const urlInput = root.getElementById?.('inputAccountAddonManifestUrl');
  if (urlInput) urlInput.value = '';
  modal?.classList.remove('hidden');
  modal?.classList.add('flex');
}

export function closeAccountAddAddonModal(root = document) {
  const modal = root.getElementById?.('modalAccountAddAddon');
  modal?.classList.add('hidden');
  modal?.classList.remove('flex');
}

export async function confirmAccountAddAddon({ root = document, state, requestJson, pushHistory, onDirty, renderAddons, showToast }) {
  const urlInput = root.getElementById?.('inputAccountAddonManifestUrl');
  const rawUrl = (urlInput?.value || '').trim();

  if (!rawUrl) {
    showToast?.('Por favor ingresa la URL del manifiesto (.json).', 'warning');
    return;
  }

  if (isDuplicateManifestUrl(state.installedAddons, rawUrl)) {
    showToast?.('Este enlace de manifiesto ya se encuentra agregado en tu perfil.', 'warning');
    return;
  }

  const normUrl = normalizeManifestUrl(rawUrl);
  const info = requestJson ? await fetchAddonManifestInfo(normUrl, requestJson) : null;
  const name = info?.name || 'Nuevo Addon';

  const newAddon = {
    name,
    manifest_url: normUrl,
    url: normUrl,
    transport_url: normUrl,
    logo: info?.logo || getAddonFallbackLogo(normUrl, name),
    configurable: info?.configurable,
    sort_order: (state.installedAddons?.length || 0) + 1,
  };

  pushHistory?.();
  state.installedAddons.push(newAddon);
  closeAccountAddAddonModal(root);
  onDirty?.('addons', true);
  renderAddons?.();
  showToast?.('✓ Addon agregado correctamente.', 'success');
}
