import { CONFIG } from './config.js';
import { requestJson } from '../shared/http/request-json.js';
import { presentAccountOverview } from './account-overview.js';
import { loadMetadataConfiguration, metadataOwner } from './metadata-configuration.js';
import { createStreamingConfiguration } from './streaming-configuration.js';
import { compileStreamingConfig } from '../features/addons/index.js';
import { validateDebridKey } from '../integrations/debrid/validate-key.js';
import { buildAioStreamsAddon } from '../pages/account/sections/aiostreams-modal.js';
import { createModderClient } from '../integrations/worker/modder-client.js';
import { saveModderSession } from '../features/avatars/index.js';
import {
  resolveAvatarCdnUrl, loadAvatarsCatalog, getCompiledAvatars,
  getStylesSummary, getFranchisesSummary, filterAvatars,
} from './avatar-catalog.js';
import { fetchTopAvatarKeys } from './avatar-ranking.js';

const modder = createModderClient({ baseUrl: CONFIG.WORKER_API_URL });

export const accountServices = {
  requestJson, presentOverview: presentAccountOverview, validateDebridKey,
  resolveAvatarCdnUrl, loadAvatarsCatalog, getCompiledAvatars, getStylesSummary,
  getFranchisesSummary, filterAvatars, fetchTopAvatarKeys,
  copyText: text => navigator.clipboard.writeText(text),
  loadMetadata: (url, uuid, password) => loadMetadataConfiguration(metadataOwner(url).instanceUrl, uuid, password),
  async createStreamingAddon({ debrids, password }) {
    const template = await requestJson(CONFIG.TEMPLATES.AIOSTREAMS);
    const config = compileStreamingConfig(template, debrids);
    const secret = password || crypto.randomUUID();
    const result = await createStreamingConfiguration(CONFIG.AIOSTREAMS_INSTANCE, config, secret);
    return buildAioStreamsAddon(result.manifestUrl);
  },
  async tryCollaborator({ email, password }) {
    try {
      const result = await modder.verifyPassword(password, email);
      if (!['modder', 'admin'].includes(result.role)) return false;
      saveModderSession({ token: password, email });
      window.location.assign('../modder/');
      return true;
    } catch (error) {
      if (![401, 403].includes(error.status)) console.warn('No se pudo verificar el acceso de colaborador.');
      return false;
    }
  },
};
