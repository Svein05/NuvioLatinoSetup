import { CONFIG } from './config.js';
import { NuvioClient } from '../integrations/nuvio/client.js';
import { updateMetadataConfiguration, metadataOwner } from './metadata-configuration.js';
import { showToast } from '../shared/ui/toast/render.js';
import { resolveAvatarCdnUrl, loadAvatarsCatalog } from './avatar-catalog.js';
import { fetchTopAvatarKeys, recordAvatarUsage } from './avatar-ranking.js';
import { initAvatarSuggestionsUI } from './avatar-suggestions.js';
import { whenDocumentReady } from '../shared/ui/when-document-ready.js';
import { createAccountController } from '../pages/account/account-controller.js';

export const accountController = createAccountController({
  client: NuvioClient,
  config: CONFIG,
  showToast,
  resolveAvatarCdnUrl,
  recordAvatarUsage,
  updateMetadataConfiguration,
  resolveOwnerInstanceUrl: (url) => metadataOwner(url)?.instanceUrl || url,
});

if (typeof window !== 'undefined') {
  window.accountController = accountController;
}

whenDocumentReady(() => {
  accountController.init();
  loadAvatarsCatalog().catch(() => {});
  fetchTopAvatarKeys(8).catch(() => {});
  initAvatarSuggestionsUI({ getAccessToken: () => accountController.state.session?.accessToken });
});
