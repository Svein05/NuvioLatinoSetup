import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** These values are PUBLIC endpoints, never credentials or private service tokens. */
export function publicCounterConfig(environment) {
  const fields = {
    primaryGet: 'COUNTER_PRIMARY_GET', primaryHit: 'COUNTER_PRIMARY_HIT',
    fallbackGet: 'COUNTER_FALLBACK_GET', fallbackHit: 'COUNTER_FALLBACK_HIT',
  };
  const config = {};
  for (const [field, variable] of Object.entries(fields)) {
    if (environment[variable]) config[field] = environment[variable];
  }
  const api = environment.COUNTER_API_URL;
  if (!config.primaryGet && api) {
    const base = api.replace(/\/+$/, '');
    config.primaryGet = base.includes('/get/') ? base : `${base}/get/nuvio-latino-setup/completions`;
    config.primaryHit = base.includes('/get/')
      ? base.replace('/get/', '/hit/') : `${base}/hit/nuvio-latino-setup/completions`;
  }
  return config;
}

export function injectPublicCounterConfig(environment) {
  const moduleId = '\0public-counter-config';
  const configPath = fileURLToPath(new URL('../src/app/completions-config.js', import.meta.url));
  return {
    name: 'public-counter-config',
    resolveId(source, importer) {
      if (importer && source.startsWith('.')
        && path.resolve(path.dirname(importer), source) === configPath) return moduleId;
    },
    load(id) {
      if (id !== moduleId) return;
      return `export const PUBLIC_COMPLETIONS_CONFIG = ${JSON.stringify(publicCounterConfig(environment))};`;
    },
  };
}
