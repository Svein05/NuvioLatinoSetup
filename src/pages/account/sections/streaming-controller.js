import { renderVerifiedKeyStatus, renderUnverifiedKeyStatus } from '../../../shared/ui/verified-key-status.js';

const providers = ['torbox', 'alldebrid', 'realdebrid', 'premiumize', 'debridlink', 'easydebrid', 'debrider', 'torrin', 'offcloud'];
const suffix = key => key[0].toUpperCase() + key.slice(1);

export function createAccountStreaming({ root, state, services, lifetime, notify, onAddon }) {
  const draft = { keys: {}, validated: {}, revision: 0, pending: false };
  const input = key => root.getElementById(`inputAccountDebrid${suffix(key)}`);
  const install = root.getElementById('btnAccountInstallAioStreams');
  const modal = root.getElementById('modalAccountAioStreamsDebrids');
  const setOpen = open => {
    if (draft.pending) return;
    modal?.classList.toggle('hidden', !open); modal?.classList.toggle('flex', open);
  };
  const update = () => { if (install) install.disabled = draft.pending || !Object.keys(draft.validated).length; };
  providers.forEach(key => lifetime.on(input(key), 'input', () => {
    draft.keys[key] = input(key).value.trim(); delete draft.validated[key]; draft.revision++; update();
  }));
  lifetime.on(root.getElementById('btnAccountValidateDebridKeys'), 'click', () => verify());
  lifetime.on(install, 'click', () => create());
  for (const id of ['btnCloseAccountAioStreamsDebridsModal', 'btnCancelAccountAioStreamsDebrids']) {
    lifetime.on(root.getElementById(id), 'click', () => setOpen(false));
  }
  async function verify() {
    const revision = draft.revision;
    for (const key of providers) {
      const value = input(key)?.value.trim();
      if (!value) continue;
      const result = await services.validateDebridKey(key, value);
      if (revision !== draft.revision || lifetime.signal.aborted) return;
      const status = root.getElementById(`statusAccountDebrid${suffix(key)}`);
      if (result.valid) {
        draft.keys[key] = value; draft.validated[key] = value;
        if (status) renderVerifiedKeyStatus(status, result);
      } else { delete draft.validated[key]; if (status) renderUnverifiedKeyStatus(status, result); }
    }
    update();
  }
  async function create() {
    if (draft.pending || !Object.keys(draft.validated).length) return;
    draft.pending = true; update();
    modal?.setAttribute('aria-busy', 'true');
    providers.forEach(key => { if (input(key)) input(key).disabled = true; });
    try {
      const addon = await services.createStreamingAddon({ debrids: { ...draft.validated },
        password: state.aioConfig ? state.aioPassword : undefined });
      onAddon(addon);
      draft.pending = false; setOpen(false);
      notify('✓ AIOStreams compilado y agregado. Guarda los cambios para instalarlo en tu perfil.', 'success');
    } catch (error) { notify(error.message, 'error'); }
    finally {
      draft.pending = false; update();
      modal?.setAttribute('aria-busy', 'false');
      providers.forEach(key => { if (input(key)) input(key).disabled = false; });
    }
  }
  return { open: () => setOpen(true) };
}
