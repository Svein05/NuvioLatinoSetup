import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { availableStremioCatalogs, catalogKey, defaultStremioSelection, reconcileStremioSelection, installedCatalogBlocks, orderedCatalogBlocks, orderStremioDescriptors, METADATA_BLOCK, matchesStremioInstallation } from './index.js';

it('selects 28 unique default rows and puts connected Trakt recommendations first', () => {
  const template = JSON.parse(readFileSync('public/templates/MetadataLatino.json', 'utf8'));
  const available = availableStremioCatalogs(template, []);
  const selected = defaultStremioSelection(available);
  expect(selected).toHaveLength(28);
  expect(new Set(selected).size).toBe(28);
  const connections = [{ id: 'trakt.recommendations.movies', type: 'movie' }, { id: 'trakt.recommendations.shows', type: 'series' }];
  const connected = availableStremioCatalogs(template, [], connections);
  expect(reconcileStremioSelection(selected, connected, connections).slice(0, 2)).toEqual(connections.map(catalogKey));
  expect(reconcileStremioSelection([...connections.map(catalogKey), ...selected], available, [])).toEqual(selected);
});

it('hides addons with no home catalogs without deleting installed descriptors', () => {
  const addon = (id, catalogs) => ({ transportUrl: `https://${id}.example/manifest.json`, manifest: { id, name: id, catalogs } });
  const original = [addon('streams', []), addon('search', [{ id: 'search', type: 'movie', extra: [{ name: 'search', isRequired: true }] }]), addon('catalogs', [{ id: 'home', type: 'movie', name: 'Home' }])];
  const state = { profileAddons: original.map(item => ({ name: item.manifest.name, url: item.transportUrl })), stremio: { originalAddons: original, addonOrder: [original[2].transportUrl, METADATA_BLOCK] } };
  expect(installedCatalogBlocks(state).map(item => item.title)).toEqual(['catalogs']);
  expect(orderedCatalogBlocks(state).map(item => item.key)).toEqual([original[2].transportUrl, METADATA_BLOCK]);
  const metadata = addon('aiometadata', []);
  const ordered = orderStremioDescriptors([metadata, ...original], state);
  expect(ordered[0]).toBe(original[2]); expect(ordered[1]).toBe(metadata);
  expect(ordered).toHaveLength(4); expect(state.stremio.originalAddons).toHaveLength(3);
});

it('readback accepts normalized fields but rejects changed identities, order or catalog types', () => {
  const original = [{ transportUrl: 'https://metadata.example/manifest.json', manifest: { id: 'meta', catalogs: [{ id: 'same', type: 'movie' }, { id: 'same', type: 'series' }] }, flags: { protected: true } }];
  const saved = structuredClone(original); saved[0].manifest.description = 'normalized';
  expect(matchesStremioInstallation(saved, original)).toBe(true);
  saved[0].manifest.catalogs.reverse(); expect(matchesStremioInstallation(saved, original)).toBe(false);
  expect(matchesStremioInstallation([], original)).toBe(false);
});
