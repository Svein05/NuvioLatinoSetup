import { CONFIG } from './config.js';
import { createStreamingUser } from '../integrations/aiostreams/create-user.js';

/** The configured Worker is the only relay; never broadcast credentials to public proxies. */
export function createStreamingConfiguration(instance, config, password, options = {}) {
  return createStreamingUser(instance, config, password, { ...options, proxyUrl: CONFIG.AIOSTREAMS_PROXY_URL });
}
