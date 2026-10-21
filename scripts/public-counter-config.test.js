import { expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { injectPublicCounterConfig, publicCounterConfig } from './public-counter-config.js';

it('retains public counter URL compatibility without serializing unrelated secrets', () => {
  const result = publicCounterConfig({
    COUNTER_API_URL: 'https://counter.invalid/',
    DISCORD_WEBHOOK_URL: 'synthetic-private-webhook',
    UPSTASH_REDIS_REST_TOKEN: 'synthetic-private-token',
  });
  expect(result).toEqual({
    primaryGet: 'https://counter.invalid/get/nuvio-latino-setup/completions',
    primaryHit: 'https://counter.invalid/hit/nuvio-latino-setup/completions',
  });
  expect(JSON.stringify(result)).not.toContain('synthetic-private');
});

it('keeps explicitly configured endpoints', () => {
  expect(publicCounterConfig({ COUNTER_PRIMARY_GET: 'get', COUNTER_PRIMARY_HIT: 'hit' }))
    .toEqual({ primaryGet: 'get', primaryHit: 'hit' });
});

it('injects only the canonical public configuration module', () => {
  const plugin = injectPublicCounterConfig({
    COUNTER_PRIMARY_GET: 'https://counter.invalid/get',
    DISCORD_WEBHOOK_URL: 'synthetic-private-webhook',
  });
  const importer = fileURLToPath(new URL('../src/app/completions.js', import.meta.url));
  const id = plugin.resolveId('./completions-config.js', importer);
  expect(id).toBe('\0public-counter-config');
  expect(plugin.resolveId('../completions-config.js', importer)).toBeUndefined();
  expect(plugin.resolveId('./completions-config.js')).toBeUndefined();
  expect(plugin.load('unrelated')).toBeUndefined();
  expect(plugin.load(id)).toBe(
    'export const PUBLIC_COMPLETIONS_CONFIG = {"primaryGet":"https://counter.invalid/get"};',
  );
});
