import { CONFIG } from './config.js';
import { provisionMetadataConfiguration, inspectSavedMetadataManifest } from './metadata-configuration.js';
import { createStreamingConfiguration } from './streaming-configuration.js';
import { compileStreamingConfig } from '../features/addons/index.js';
import { getBadgePackById } from '../features/badges/index.js';
import { compileUniversalBadgeRules } from './badge-compilation.js';
import { recordSuccessfulCompletion } from './completions.js';
import { executeProfileProvisioning } from '../workflows/provision-profile.js';
import { downloadJsonFile } from '../shared/ui/file-download.js';

export { executeProfileProvisioning };

/**
 * Conecta el workflow de aprovisionamiento con la configuración oficial y servicios de la app.
 */
export async function executePipeline(state, options = {}) {
  const config = {
    aiometadataInstances: CONFIG.AIOMETADATA_INSTANCES,
    nuvioApiUrl: CONFIG.NUVIO_API_URL,
    nuvioPublicAnonKey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
    aiostreamsInstance: CONFIG.AIOSTREAMS_INSTANCE,
    templates: CONFIG.TEMPLATES,
    ...(options.config || {}),
  };

  const services = {
    provisionMetadata: provisionMetadataConfiguration,
    inspectManifest: inspectSavedMetadataManifest,
    createStreamingConfiguration,
    compileStreamingConfig,
    getBadgePackById,
    compileBadgeRules: compileUniversalBadgeRules,
    recordCompletion: recordSuccessfulCompletion,
    ...(options.services || {}),
    ...(options.nuvioClient ? { nuvioClient: options.nuvioClient } : {}),
  };

  return executeProfileProvisioning(state, { config, services });
}

/**
 * Descarga las colecciones en formato JSON.
 */
export function downloadCollectionsJson(collections, options = {}) {
  return downloadJsonFile(collections, 'NuvioCollections_Latino.json', options);
}

/**
 * Descarga la configuración de AIOMetadata en formato JSON.
 */
export function downloadAioConfigJson(payload, options = {}) {
  return downloadJsonFile(payload, 'AIOMetadata_Latino.json', options);
}
