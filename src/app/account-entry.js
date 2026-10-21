import { CONFIG } from './config.js';
import { NuvioClient } from '../integrations/nuvio/client.js';
import { updateMetadataConfiguration, metadataOwner } from './metadata-configuration.js';
import { showToast } from '../shared/ui/toast/render.js';
import { resolveAvatarCdnUrl } from './avatar-catalog.js';
import { recordAvatarUsage } from './avatar-ranking.js';
import { initAvatarSuggestionsUI } from './avatar-suggestions.js';
import { whenDocumentReady } from '../shared/ui/when-document-ready.js';
import { createAccountController } from '../pages/account/account-controller.js';
import { accountServices } from './account-services.js';
import { initPasswordToggles } from '../shared/ui/password-toggle.js';

export const accountController = createAccountController({
  client: NuvioClient,
  config: CONFIG,
  services: { ...accountServices, Sortable: globalThis.Sortable },
  setupPasswordToggles: initPasswordToggles,
  showToast: (message, type = 'info') => showToast(message, {
    type, containerId: 'latToastContainer', createContainer: true,
  }),
  resolveAvatarCdnUrl,
  recordAvatarUsage,
  updateMetadataConfiguration,
  resolveOwnerInstanceUrl: (url) => metadataOwner(url)?.instanceUrl || url,
});

whenDocumentReady(() => {
  accountController.init();
  initAvatarSuggestionsUI({ getAccessToken: () => accountController.state.session?.accessToken });
});
window.addEventListener('pagehide', event => { if (!event.persisted) accountController.dispose(); });
