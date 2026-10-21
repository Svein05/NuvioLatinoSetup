import { expect, it } from 'vitest';
import { inspectMetadataManifest } from './inspect-metadata-manifest.js';

it('retains a confirmed save but reports an unavailable manifest explicitly', async () => {
  const result = await inspectMetadataManifest(async () => { throw new Error('synthetic-secret'); }, { manifestUrl: 'https://metadata.example.invalid/manifest.json' });
  expect(result).toMatchObject({ manifest: null, verified: false });
  expect(result.warnings).toHaveLength(1);
  expect(JSON.stringify(result)).not.toContain('synthetic-secret');
});

it('returns only an actually read manifest as verified', async () => {
  const manifest = { id: 'aio-metadata', name: 'Synthetic' };
  expect(await inspectMetadataManifest(async () => manifest, { manifestUrl: 'https://metadata.example.invalid/manifest.json' }))
    .toEqual({ manifest, verified: true, warnings: [] });
});
