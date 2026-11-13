import { createLifetime } from '../../../shared/ui/lifetime.js';
import { mountMiniStremio } from './mini.js';
import { mountStremioFinish } from './finish.js';
import { attachPlatformNavigation } from './navigation.js';
import { createPlatformPresentation } from './presentation.js';

const PROFILE_FIELDS = ['profileAddons', 'deletedAddonIds', 'existingAioAddon', 'hasLoadedAddonsForProfile', 'selectedProfileId', 'selectedProfileName', 'isManualMode', 'currentStep', 'maxUnlockedStep', 'preferences', 'aiostreams'];

function mountLogin({ root, state, lifetime, services, connected }) {
  const form = root.querySelector('#stremioSetupLogin');
  const password = form.querySelector('[type=password]');
  const eye = root.querySelector('#stremioSetupEye');
  const error = root.querySelector('#stremioSetupLoginError');
  let request;
  lifetime.on(eye, 'click', () => {
    password.type = password.type === 'password' ? 'text' : 'password';
    eye.setAttribute('aria-label', password.type === 'text' ? 'Ocultar contraseña' : 'Mostrar contraseña');
    eye.setAttribute('aria-pressed', String(password.type === 'text'));
  });
  lifetime.on(form, 'submit', async event => {
    event.preventDefault();
    if (request) return;
    request = new AbortController();
    const signal = AbortSignal.any([request.signal, lifetime.signal]);
    const button = form.querySelector('[type=submit]');
    button.disabled = true; error.hidden = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Conectando Stremio…';
    try {
      const reading = services.connect({ email: root.querySelector('#stremioSetupEmail').value.trim(), password: password.value, signal });
      password.value = ''; password.type = 'password'; eye.setAttribute('aria-pressed', 'false'); eye.setAttribute('aria-label', 'Mostrar contraseña');
      const result = await reading;
      signal.throwIfAborted();
      if (state.targetApplication !== 'stremio') return;
      state.stremio.session = result.session;
      state.stremio.originalAddons = result.addons;
      state.stremio.addonOrder = null;
      state.stremio.completed = false; state.stremio.pendingWrite = null; state.stremio.completionId = null;
      state.selectedProfileId = 'stremio-account'; state.selectedProfileName = result.session.email;
      state.setProfileAddons(result.addons.map(addon => ({ id: addon.manifest.id, name: addon.manifest.name,
        logo: addon.manifest.logo, url: addon.transportUrl, manifest_url: addon.transportUrl, stremioProtected: Boolean(addon.flags?.protected) })), 'stremio-account');
      const status = root.querySelector('#stremioSetupConnected');
      status.textContent = `Conectado como ${result.session.email}`; status.hidden = false;
      connected();
    } catch (failure) { if (!signal.aborted) { error.textContent = failure.message; error.hidden = false; } }
    finally { request = null; button.disabled = false; button.textContent = 'Conectar Stremio'; }
  });
  lifetime.add(() => { request?.abort(); password.value = ''; state.stremio.session = null; });
  return () => { request?.abort(); password.value = ''; };
}

export function mountStremioSetup({ state, controller, services, root = document }) {
  const lifetime = createLifetime();
  const wizard = root.querySelector('#wizardView');
  const present = createPlatformPresentation(root, state);
  const mini = mountMiniStremio({ state, root, lifetime, updateUI: () => controller.updateUI() });
  const finish = mountStremioFinish({ state, root, lifetime, execute: services.execute });
  let nuvioSnapshot;
  let nuvioResumeStep = state.currentStep;
  let cancelLogin = () => {};
  const choose = application => {
    if (state.stremio.running) return;
    cancelLogin(); state.connectionsCancel?.();
    if (state.targetApplication === 'nuvio') nuvioResumeStep = state.currentStep;
    if (application === 'stremio' && state.targetApplication !== 'stremio') {
      nuvioSnapshot = Object.fromEntries(PROFILE_FIELDS.map(key => [key, state[key]]));
      state.preferences = structuredClone(state.preferences); state.aiostreams = structuredClone(state.aiostreams);
      state.profileAddons = []; state.deletedAddonIds = new Set(); state.existingAioAddon = null;
      state.isManualMode = false; state.selectedProfileId = null; state.selectedProfileName = '';
      state.hasLoadedAddonsForProfile = null; state.preferences.badgesEnabled = false;
      state.maxUnlockedStep = 1;
      state.migration = null; state.migrationStage = null; state.migrationEnabled = false; state.migrationNeedsReconnect = false;
    } else if (state.targetApplication === 'stremio' && application !== 'stremio' && nuvioSnapshot) {
      Object.assign(state, nuvioSnapshot); state.stremio.session = null;
    }
    if (application === 'nuvio') controller.initializeNuvioPreview?.();
    state.targetApplication = application;
    state.currentStep = application === 'nuvio' && state.nuvioAuth?.isAuthenticated ? Math.max(2, nuvioResumeStep) : 1;
    state.connectionsStage = false;
    wizard.dataset.setupTarget = application || '';
    controller.updateUI();
    root.querySelector('.step-content.active h2')?.focus({ preventScroll: true });
  };
  const navigation = attachPlatformNavigation({ root, state, choose, updateUI: () => controller.updateUI(), refresh: () => {
    present();
    if (state.targetApplication === 'stremio' && state.currentStep === 3) mini.render();
    if (state.targetApplication === 'stremio' && state.currentStep === 7) finish.render();
  } });
  cancelLogin = mountLogin({ root, state, lifetime, services, connected: () => navigation.show('connections') });
  lifetime.on(wizard, 'click', event => {
    const platform = event.target.closest('[data-setup-platform]');
    if (platform) choose(platform.dataset.setupPlatform);
    if (event.target.closest('[data-setup-change]')) choose(null);
  });
  lifetime.add(state.subscribe((snapshot, type) => { if (type === 'COLLECTIONS_UPDATED') mini.synchronize(); }));
  lifetime.add(navigation.dispose);
  return () => lifetime.dispose();
}
