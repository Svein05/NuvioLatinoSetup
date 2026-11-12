import { connectionCredentials, selectedConnectionCatalogs } from '../features/connections/index.js';

/** Add connection catalogs before the normal selection filter, without changing the source template. */
export function withConnectionCatalogs(rawTemplate, connections) {
  if (!rawTemplate || !Object.keys(connections?.accounts || {}).length) return rawTemplate;
  const template = structuredClone(rawTemplate);
  const config = template.config || template;
  const additions = selectedConnectionCatalogs(connections);
  const keys = new Set(additions.map(item => `${item.type}:${item.id}`));
  config.catalogs = [...additions, ...(config.catalogs || []).filter(item => !keys.has(`${item.type}:${item.id}`))];
  return template;
}

export function applyConnectionCredentials(payload, connections) {
  const config = payload.config || payload;
  config.apiKeys = { ...config.apiKeys, ...connectionCredentials(connections) };
  for (const provider of ['simkl', 'anilist', 'mal']) {
    const account = connections?.accounts?.[provider];
    config[`${provider}WatchTracking`] = Boolean(account && account.trackingEnabled !== false);
  }
  return payload;
}
