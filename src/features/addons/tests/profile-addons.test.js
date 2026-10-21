import { describe, expect, it } from 'vitest';
import {
  hasAioStreamsInstance,
  getAioStreamsIndex,
  hasAddonManifest,
  normalizeProfileAddons,
  moveProfileAddon,
  removeProfileAddon,
  upsertAioStreamsAddon,
  addCustomProfileAddon,
} from '../model/profile-addons.js';

describe('profile-addons model', () => {
  const instances = ['https://aiometa.latin.org'];

  it('normalizes profile addons isolating primary AIOMetadata and duplicates', () => {
    const raw = [
      { id: 'sub-1', name: 'Torrentio', url: 'https://torrentio.strem.fun/manifest.json' },
      { id: 'aio-1', name: 'AIOMetadata Primary', url: 'https://aiometa.latin.org/manifest.json' },
      { id: 'aio-dup', name: 'AIOMetadata Duplicate', url: 'https://aiometa.latin.org/manifest.json' },
      { id: 'sub-2', name: 'MediaFusion', url: 'https://mediafusion.elfhosted.com/manifest.json' },
    ];
    const result = normalizeProfileAddons(raw, instances);
    expect(result.existingAioAddon?.id).toBe('aio-1');
    expect(result.duplicateAioIds).toEqual(['aio-dup']);
    expect(result.profileAddons).toHaveLength(2);
    expect(result.profileAddons[0].name).toBe('Torrentio');
    expect(result.profileAddons[0].sort_order).toBe(2);
    expect(result.profileAddons[1].name).toBe('MediaFusion');
    expect(result.profileAddons[1].sort_order).toBe(3);
  });

  it('detects existing AIOStreams in profile addons', () => {
    const addons = [
      { name: 'Torrentio', url: 'https://torrentio.fun/manifest.json' },
      { name: 'AIOStreams', url: 'https://aiostreams.fun/manifest.json', isAioStreams: true },
    ];
    expect(hasAioStreamsInstance(addons)).toBe(true);
    expect(getAioStreamsIndex(addons)).toBe(1);
    expect(hasAioStreamsInstance([{ name: 'Torrentio' }])).toBe(false);
    expect(getAioStreamsIndex([{ name: 'Torrentio' }])).toBe(-1);
  });

  it('checks manifest identity presence', () => {
    const addons = [{ url: 'https://example.com/manifest.json' }];
    expect(hasAddonManifest(addons, 'https://example.com/manifest.json')).toBe(true);
    expect(hasAddonManifest(addons, 'https://example.com/manifest.json/')).toBe(true);
    expect(hasAddonManifest(addons, 'https://other.com/manifest.json')).toBe(false);
  });

  it('moves addons and reindexes sort_order', () => {
    const addons = [
      { id: '1', name: 'First', sort_order: 2 },
      { id: '2', name: 'Second', sort_order: 3 },
    ];
    expect(moveProfileAddon(addons, 0, -1)).toBeNull();
    expect(moveProfileAddon(addons, 1, 1)).toBeNull();
    const moved = moveProfileAddon(addons, 0, 1);
    expect(moved[0].name).toBe('Second');
    expect(moved[0].sort_order).toBe(2);
    expect(moved[1].name).toBe('First');
    expect(moved[1].sort_order).toBe(3);
  });

  it('removes addons and returns deleted entity while reindexing remainder', () => {
    const addons = [
      { id: '1', name: 'A', sort_order: 2 },
      { id: '2', name: 'B', sort_order: 3 },
      { id: '3', name: 'C', sort_order: 4 },
    ];
    expect(removeProfileAddon(addons, 5)).toBeNull();
    const result = removeProfileAddon(addons, 1);
    expect(result.removed.id).toBe('2');
    expect(result.addons).toHaveLength(2);
    expect(result.addons[0].name).toBe('A');
    expect(result.addons[0].sort_order).toBe(2);
    expect(result.addons[1].name).toBe('C');
    expect(result.addons[1].sort_order).toBe(3);
  });

  it('upserts AIOStreams addon updating debrids or creating entry', () => {
    const emptyList = [];
    const withAio = upsertAioStreamsAddon(emptyList, { realdebrid: 'key1' });
    expect(withAio).toHaveLength(1);
    expect(withAio[0].isAioStreams).toBe(true);
    expect(withAio[0].sort_order).toBe(2);
    expect(withAio[0].debrids.realdebrid).toBe('key1');

    const updated = upsertAioStreamsAddon(withAio, { realdebrid: 'key2', alldebrid: 'key3' });
    expect(updated).toHaveLength(1);
    expect(updated[0].debrids.realdebrid).toBe('key2');
    expect(updated[0].debrids.alldebrid).toBe('key3');
  });

  it('validates and appends custom addons', () => {
    const list = [{ url: 'https://existing.com/manifest.json', sort_order: 2 }];
    expect(addCustomProfileAddon(list, { manifestUrl: '' })).toBeNull();
    expect(addCustomProfileAddon(list, {
      manifestUrl: 'https://aiometa.latin.org/manifest.json',
      instances,
    })).toBeNull();
    expect(addCustomProfileAddon(list, { manifestUrl: 'https://existing.com/manifest.json' })).toBeNull();

    const added = addCustomProfileAddon(list, {
      manifestUrl: 'https://custom.com/manifest.json',
      name: 'Custom Addon',
      logo: 'https://custom.com/logo.png',
    });
    expect(added).toHaveLength(2);
    expect(added[1].name).toBe('Custom Addon');
    expect(added[1].sort_order).toBe(3);
    expect(added[1].isCustomAdded).toBe(true);
  });
});
