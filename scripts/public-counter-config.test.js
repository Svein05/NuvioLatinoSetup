import { expect, it } from 'vitest';
import { publicCounterConfig } from './public-counter-config.js';

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
