import { CONFIG } from './config.js';
import { createConnectionsClient } from '../integrations/aiometadata/connections.js';
import { mountConnections } from '../pages/configuration/connections/controller.js';

export function initializeConnections(controller, state) {
  return mountConnections({ state, instances: CONFIG.AIOMETADATA_INSTANCES,
    client: createConnectionsClient(CONFIG.AIOMETADATA_INSTANCES), updateUI: () => controller.updateUI() });
}
