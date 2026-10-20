import { createAiometadataClient } from '../integrations/aiometadata/client.js';
import { createMetadataConfiguration } from '../workflows/create-metadata-configuration.js';
import { inspectMetadataManifest } from '../workflows/inspect-metadata-manifest.js';

const client = createAiometadataClient();
export { metadataOwner } from '../integrations/aiometadata/contracts.js';
export const loadMetadataConfiguration = client.loadConfiguration;
export const updateMetadataConfiguration = client.updateConfiguration;
export const provisionMetadataConfiguration = options => createMetadataConfiguration(client.saveConfiguration, options);
export const inspectSavedMetadataManifest = options => inspectMetadataManifest(client.fetchManifest, options);
