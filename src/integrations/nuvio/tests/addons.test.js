import { describe, expect, it, vi } from 'vitest';
import {
  getSyncOwner, listAddons, installAddon, deleteAddon,
  updateAddonOrder, updateAddon, cleanProfileAddons,
  installOrUpdateAioAddon, syncAddonsOrder,
} from '../addons.js';

const context = { apiUrl: 'https://nuvio.test', apikey: 'key-test', accessToken: 'token-test', userId: 'user-01', profileId: 10 };

describe('nuvio addons integration', () => {
  it('resolves sync owner from get_sync_owner RPC or falls back to userId', async () => {
    const fetchImplSuccess = vi.fn().mockResolvedValue(Response.json(['owner-uuid-42']));
    const owner = await getSyncOwner({ ...context, fetchImpl: fetchImplSuccess });
    expect(owner).toBe('owner-uuid-42');

    const fetchImplFail = vi.fn().mockResolvedValue(Response.json({}, { status: 500 }));
    const fallbackOwner = await getSyncOwner({ ...context, fetchImpl: fetchImplFail });
    expect(fallbackOwner).toBe('user-01');
  });

  it('lists addons for profile filtering by owner and profile index', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json(['owner-uuid-42']))
      .mockResolvedValueOnce(Response.json([{ id: 'a1', name: 'Addon One' }]));

    const addons = await listAddons({ ...context, fetchImpl });
    expect(addons).toEqual([{ id: 'a1', name: 'Addon One' }]);
  });

  it('installs addon and returns assigned addonId', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json(['owner-uuid-42']))
      .mockResolvedValueOnce(Response.json([{ id: 'new-addon-id' }]));

    const result = await installAddon({
      ...context,
      addonData: { profile_id: 10, manifest_url: 'https://addon.test/manifest.json', name: 'Custom Addon' },
      fetchImpl,
    });
    expect(result).toEqual({ success: true, addonId: 'new-addon-id' });
  });

  it('deletes addon by id and profile_id', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const result = await deleteAddon({ ...context, addonId: 'a-del-1', fetchImpl });
    expect(result).toBe(true);
    const [url, opts] = fetchImpl.mock.calls[0];
    expect(url).toContain('id=eq.a-del-1');
    expect(opts.method).toBe('DELETE');
  });

  it('updates addon sort order via PATCH', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const result = await updateAddonOrder({ ...context, addonId: 'a-ord-1', sortOrder: 3, fetchImpl });
    expect(result).toBe(true);
    const [url, opts] = fetchImpl.mock.calls[0];
    expect(url).toContain('id=eq.a-ord-1');
    expect(opts.method).toBe('PATCH');
    expect(JSON.parse(opts.body)).toEqual({ sort_order: 3 });
  });

  it('updates addon metadata and manifestUrl', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json([{ id: 'a-up-1' }]));
    const result = await updateAddon({
      ...context,
      addonId: 'a-up-1',
      name: 'Renamed',
      manifestUrl: 'https://new.test/manifest.json',
      sortOrder: 2,
      enabled: true,
      fetchImpl,
    });
    expect(result).toBe(true);
    const [, opts] = fetchImpl.mock.calls[0];
    expect(JSON.parse(opts.body)).toMatchObject({
      name: 'Renamed',
      manifest_url: 'https://new.test/manifest.json',
      sort_order: 2,
      enabled: true,
    });
  });

  it('installs or updates AIOMetadata removing previous duplicates', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json(['owner-uuid-42'])) // getSyncOwner
      .mockResolvedValueOnce(Response.json([ // listAddons
        { id: 'old-aio-1', name: 'AIOMetadata', url: 'https://aiometadata.com/stremio/1/manifest.json' },
        { id: 'dup-aio-2', name: 'AIOMetadata', url: 'https://aiometadata.com/stremio/2/manifest.json' },
      ]))
      .mockResolvedValueOnce(new Response(null, { status: 204 })) // delete dup-aio-2
      .mockResolvedValueOnce(Response.json([{ id: 'old-aio-1' }])); // patch old-aio-1

    const result = await installOrUpdateAioAddon({
      ...context,
      manifestUrl: 'https://aiometadata.com/stremio/new/manifest.json',
      instances: ['https://aiometadata.com'],
      fetchImpl,
    });
    expect(result).toEqual({ success: true, updated: true, addonId: 'old-aio-1' });
  });

  it('synchronizes addons order across table updates and sync_push_addons RPC', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json(['owner-uuid-42'])) // getSyncOwner
      .mockResolvedValueOnce(new Response(null, { status: 204 })) // updateAddonOrder a1
      .mockResolvedValueOnce(new Response(null, { status: 204 })); // rpc sync_push_addons

    const addons = [{ id: 'a1', name: 'AIO', manifest_url: 'https://test/manifest.json', sort_order: 1 }];
    const result = await syncAddonsOrder({ ...context, addons, fetchImpl });
    expect(result).toEqual({ success: true });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('cleans profile addons by listing, deleting individually, mass deleting and calling empty sync_push_addons', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json(['owner-uuid-42'])) // getSyncOwner
      .mockResolvedValueOnce(Response.json([{ id: 'del-1' }])) // listAddons
      .mockResolvedValueOnce(new Response(null, { status: 204 })) // delete individual
      .mockResolvedValueOnce(new Response(null, { status: 204 })) // mass delete
      .mockResolvedValueOnce(new Response(null, { status: 204 })); // rpc empty

    const result = await cleanProfileAddons({ ...context, fetchImpl });
    expect(result).toEqual({ success: true });
  });
});
