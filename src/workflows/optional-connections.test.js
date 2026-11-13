import { expect, it, vi } from 'vitest';
import { availableConnectionCatalogs, synchronizeConnectionCollections } from '../features/connections/index.js';
import { selectedCollections } from '../features/collections/index.js';
import { prepareMetadataPayload } from './prepare-metadata-payload.js';
import { verifyConnectionCatalogs } from './verify-connection-catalogs.js';
import { executeProfileProvisioning } from './provision-profile.js';

function fixture() {
  const catalogs = availableConnectionCatalogs('trakt', [], 'synthetic');
  const account = { tokenId: 'synthetic-connection', catalogs, selected: catalogs.map(c => `${c.type}:${c.id}`) };
  const connections = { instance: 'https://fixed.invalid', accounts: { trakt: account } };
  const original = [{ id: 'home', folders: [{ id: 'folder-db247118', sources: [{ catalogId: 'weekly', type: 'movie' }] }] }];
  const collections = synchronizeConnectionCollections(original, connections, { trakt: { public: 'https://art.invalid/trakt.webp', local: 'http://127.0.0.1/local.webp' } });
  return { connections, collections, original };
}

it('groups selected catalogs and reuses recommendations ahead of weekly lists without leaking local covers', () => {
  const data = fixture();
  expect(data.collections[0].folders[0].sources.map(c => c.catalogId)).toEqual([
    'trakt.recommendations.movies', 'trakt.recommendations.shows', 'weekly',
  ]);
  const tile = data.collections[1].folders[0];
  expect(tile.tileShape).toBe('SQUARE');
  expect(tile.sources).toHaveLength(4);
  expect(JSON.stringify(selectedCollections(data.collections))).not.toContain('127.0.0.1');
  expect(data.original[0].folders[0].sources).toHaveLength(1);
  tile.title = 'Custom title'; tile.enabled = false;
  expect(synchronizeConnectionCollections(data.collections, data.connections, {})[1].folders[0]).toMatchObject({ title: 'Custom title', enabled: false });
  const removed = synchronizeConnectionCollections(data.collections, { accounts: {} }, {});
  expect(removed).toHaveLength(1);
  expect(removed[0].folders[0].sources.map(c => c.catalogId)).toEqual(['weekly']);
});

it('exports opaque credentials, deduplicates catalogs and respects tracking selection independently of lists', () => {
  const data = fixture();
  data.connections.accounts.simkl = { tokenId: 'synthetic-simkl', selected: [], catalogs: [], trackingEnabled: false };
  data.connections.accounts.mal = { tokenId: 'synthetic-mal', selected: [], catalogs: [] };
  const result = prepareMetadataPayload({ ...data, rawTemplate: { config: { catalogs: [], apiKeys: {} } },
    apiKeys: { tmdb: 'synthetic', mdblist: 'synthetic' }, preferences: {}, password: 'synthetic' });
  expect(result.config.apiKeys).toMatchObject({ traktTokenId: 'synthetic-connection', simklTokenId: 'synthetic-simkl' });
  expect(result.config.catalogs).toHaveLength(4);
  expect(result.config.catalogs.every(c => c.showInHome === false)).toBe(true);
  expect(result.config).toMatchObject({ simklWatchTracking: false, malWatchTracking: true, anilistWatchTracking: false });
  expect(result.config.traktWatchTracking).toBeUndefined();
});

it('requires matching manifest types and ignores disabled native folders', () => {
  const data = fixture();
  expect(() => verifyConnectionCatalogs(data, null)).toThrow();
  expect(() => verifyConnectionCatalogs(data, { verified: true, manifest: { catalogs: [] } })).toThrow();
  expect(() => verifyConnectionCatalogs(data, { verified: true, manifest: { catalogs: data.connections.accounts.trakt.catalogs } })).not.toThrow();
  data.collections.forEach(section => { section.enabled = false; });
  expect(() => verifyConnectionCatalogs(data, null)).not.toThrow();
});

it('pins provisioning to the authorized instance and stops before Nuvio writes on a missing catalog', async () => {
  const state = { ...fixture(), execution: { mode: 'real' }, apiKeys: {}, getSynchronizedMetadataPayload: () => ({ config: {} }) };
  const services = { provisionMetadata: vi.fn().mockResolvedValue({ manifestUrl: 'https://fixed.invalid/manifest.json' }),
    inspectManifest: vi.fn().mockResolvedValue({ verified: true, manifest: { catalogs: [] } }), nuvioClient: { login: vi.fn() } };
  await executeProfileProvisioning(state, { config: { aiometadataInstances: ['https://other.invalid'] }, services });
  expect(services.provisionMetadata.mock.calls[0][0].instances).toEqual(['https://fixed.invalid']);
  expect(services.nuvioClient.login).not.toHaveBeenCalled();
  expect(state.execution.error).toContain('catálogos');
});

it('rejects demo execution before any external provisioning or counter call', async () => {
  const state = { execution: {}, apiKeys: { tmdb: 'NUVIO-DEMO-OK' } };
  const services = { provisionMetadata: vi.fn(), recordCompletion: vi.fn() };
  await executeProfileProvisioning(state, { services });
  expect(services.provisionMetadata).not.toHaveBeenCalled();
  expect(services.recordCompletion).not.toHaveBeenCalled();
  expect(state.execution.error).toContain('Demostración');
});
