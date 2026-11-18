import { expect, it } from 'vitest';
import { isWebpBlob } from './webp-format.js';

it('requires both the WebP MIME type and the RIFF/WEBP signature', async () => {
  const bytes = 'RIFF\x04\x00\x00\x00WEBP';
  expect(await isWebpBlob(new Blob([bytes], { type: 'image/webp' }))).toBe(true);
  expect(await isWebpBlob(new Blob([bytes], { type: 'image/png' }))).toBe(false);
  expect(await isWebpBlob(new Blob(['not a webp image'], { type: 'image/webp' }))).toBe(false);
  expect(await isWebpBlob(new Blob(['RIFF'], { type: 'image/webp' }))).toBe(false);
  expect(await isWebpBlob(null)).toBe(false);
});
