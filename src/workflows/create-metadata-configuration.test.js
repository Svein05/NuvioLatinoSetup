import { expect, it, vi } from 'vitest';
import { HttpError } from '../shared/http/request-json.js';
import { createMetadataConfiguration } from './create-metadata-configuration.js';

const instances = ['https://first.example.invalid', 'https://second.example.invalid'];
const payload = { password: 'synthetic-secret', config: { catalogs: [] } };

it('uses a stable snapshot and reports an explicitly unsupported creation route', async () => {
  const draft = structuredClone(payload);
  const save = vi.fn().mockRejectedValueOnce(new HttpError('unsupported', { status: 404 }))
    .mockResolvedValueOnce({ uuid: 'id', manifestUrl: 'https://second.example.invalid/stremio/id/manifest.json' });
  const onAttempt = vi.fn(() => { draft.config.catalogs.push({ id: 'later-edit' }); });
  const result = await createMetadataConfiguration(save, { instances, payload: draft, onAttempt });
  expect(result.uuid).toBe('id');
  expect(result.warnings).toHaveLength(1);
  expect(onAttempt).toHaveBeenCalledTimes(2);
  expect(save.mock.calls.map(call => call[1])).toEqual([payload, payload]);
});

it.each([401, 403, 422, 429, 500])('does not distribute a rejected creation after HTTP %s', async status => {
  const save = vi.fn().mockRejectedValue(new HttpError('rejected', { status }));
  await expect(createMetadataConfiguration(save, { instances, payload })).rejects.toMatchObject({ status });
  expect(save).toHaveBeenCalledTimes(1);
});

it('does not retry a write with unknown outcome even if it has a fallback status', async () => {
  const save = vi.fn().mockRejectedValue(new HttpError('unknown', { status: 404, outcome: 'unknown' }));
  await expect(createMetadataConfiguration(save, { instances, payload })).rejects.toMatchObject({ outcome: 'unknown' });
  expect(save).toHaveBeenCalledTimes(1);
});

it('does not send any request after cancellation or without a selected instance', async () => {
  const save = vi.fn();
  const controller = new AbortController();
  controller.abort();
  await expect(createMetadataConfiguration(save, { instances, payload, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  await expect(createMetadataConfiguration(save, { instances: [], payload })).rejects.toThrow('instancia');
  expect(save).not.toHaveBeenCalled();
});
