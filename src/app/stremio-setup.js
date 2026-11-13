import { CONFIG } from './config.js';
import { mountStremioSetup } from '../pages/configuration/stremio/controller.js';
import { connectStremio, readStremioAddons, writeStremioAddons } from '../integrations/stremio/configuration.js';
import { configureStremio } from '../workflows/configure-stremio.js';
import { provisionMetadataConfiguration, inspectSavedMetadataManifest } from './metadata-configuration.js';
import { createStreamingConfiguration } from './streaming-configuration.js';
import { compileStreamingConfig } from '../features/addons/index.js';
import { recordSuccessfulCompletion } from './completions.js';
import { isDemoCode, demoDelay, demoScenario } from '../shared/demo/setup.js';

async function connectWithDemo(credentials) {
  if (!isDemoCode(credentials.password)) return connectStremio(credentials);
  const scenario = demoScenario(credentials.password);
  await demoDelay(credentials.signal, scenario === 'SLOW' ? 3500 : 650);
  if (!['OK', 'SLOW'].includes(scenario)) throw new Error('No se pudo conectar la cuenta de demostración.');
  return { session: { demo: true, email: 'Cuenta de demostración' }, addons: [] };
}

export function initializeStremioSetup(controller, state) {
  return mountStremioSetup({ state, controller, services: {
    connect: connectWithDemo,
    execute: progress => configureStremio(state, {
      instances: CONFIG.AIOMETADATA_INSTANCES,
      provisionMetadata: provisionMetadataConfiguration,
      inspectManifest: inspectSavedMetadataManifest,
      readAddons: readStremioAddons, writeAddons: writeStremioAddons,
      createStreams: current => createStreamingConfiguration(CONFIG.AIOSTREAMS_INSTANCE,
        compileStreamingConfig(current.rawAioStreamsTemplate, current.aiostreams.debrids), current.aiometadata.password),
      recordCompletion: recordSuccessfulCompletion,
    }, progress),
  } });
}
