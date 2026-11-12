import { CONFIG } from './config.js';
import { createConnectionsClient } from '../integrations/aiometadata/connections.js';
import { mountConnections } from '../pages/configuration/connections/controller.js';
import { withConnectionDemos } from './connections-demo.js';

export function initializeConnections(controller, state) {
  return mountConnections({ state, instance: CONFIG.DEFAULT_AIOMETADATA_URL,
    client: withConnectionDemos(createConnectionsClient(CONFIG.AIOMETADATA_INSTANCES)), updateUI: () => controller.updateUI() });
}
