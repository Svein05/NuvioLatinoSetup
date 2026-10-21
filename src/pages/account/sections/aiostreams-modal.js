export function openAccountAioStreamsDebridsModal({ root = document, state }) {
  state._aioStreamsDraft = { debrids: {}, validatedKeys: {} };
  const modal = root.getElementById?.('modalAccountAioStreamsDebrids');
  modal?.classList.remove('hidden');
  modal?.classList.add('flex');
}

export function closeAccountAioStreamsDebridsModal(root = document) {
  const modal = root.getElementById?.('modalAccountAioStreamsDebrids');
  modal?.classList.add('hidden');
  modal?.classList.remove('flex');
}

export async function validateAccountDebridKeys({ root = document, state, validateKeyFn, showToast }) {
  const btnValidate = root.getElementById?.('btnAccountValidateDebridKeys');
  if (btnValidate) {
    btnValidate.disabled = true;
    btnValidate.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Validando claves...';
  }

  try {
    const keys = state._aioStreamsDraft?.debrids || {};
    const keyEntries = Object.entries(keys).filter(([, v]) => Boolean(v?.trim()));
    if (keyEntries.length === 0) {
      showToast?.('Por favor ingresa al menos una clave Debrid.', 'warning');
      return;
    }

    for (const [provider, key] of keyEntries) {
      const res = await validateKeyFn?.(provider, key.trim());
      if (res?.isValid) {
        state._aioStreamsDraft.validatedKeys[provider] = true;
      }
    }
    showToast?.('✓ Claves validadas con éxito.', 'success');
  } catch (err) {
    showToast?.(`Error al validar claves: ${err.message}`, 'error');
  } finally {
    if (btnValidate) {
      btnValidate.disabled = false;
      btnValidate.innerHTML = '<i class="fa-solid fa-key mr-1.5"></i> Validar Claves';
    }
  }
}

export function buildAioStreamsAddon(manifestUrl, sortOrder) {
  return {
    name: 'AIOStreams',
    manifest_url: manifestUrl,
    url: manifestUrl,
    transport_url: manifestUrl,
    logo: 'https://numb3rs.stream/assets/images/aiostreams.svg',
    configurable: true,
    isAioStreams: true,
    sort_order: sortOrder,
  };
}
