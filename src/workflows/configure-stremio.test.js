import { expect, it, vi } from 'vitest';
import { configureStremio } from './configure-stremio.js';
import { prepareStremioMetadata } from './prepare-stremio-metadata.js';

function fixture() {
  const original = { transportUrl: 'https://addon.example/manifest.json', manifest: { id: 'existing', name: 'Existing', catalogs: [] }, flags: { protected: true } };
  const state = {
    targetApplication: 'stremio', apiKeys: { tmdb: 'synthetic', mdblist: 'synthetic' },
    connections: { accounts: {}, drafts: {} }, preferences: { posterEngine: 'default' },
    aiometadata: { password: 'synthetic-password' }, originalCollectionsTemplate: [],
    rawMetadataTemplate: { config: { catalogs: [{ id: 'tmdb.trending', type: 'movie', name: 'Movies' }, { id: 'tmdb.trending', type: 'series', name: 'Shows' }] } },
    profileAddons: [], validateStep: () => ({ valid: true }),
    stremio: { session: { authKey: 'synthetic' }, originalAddons: [original], selected: ['series:tmdb.trending', 'movie:tmdb.trending'], names: { 'movie:tmdb.trending': 'Mi cine' } },
  };
  let saved;
  const services = {
    instances: ['https://metadata.example'],
    provisionMetadata: vi.fn(async () => ({ manifestUrl: 'https://metadata.example/synthetic/manifest.json' })),
    inspectManifest: vi.fn(async () => ({ manifest: { id: 'aiometadata', catalogs: [{ id: 'tmdb.trending', type: 'series' }, { id: 'tmdb.trending', type: 'movie' }] } })),
    readAddons: vi.fn(async () => structuredClone(saved || [original])),
    writeAddons: vi.fn(async (_session, addons) => { saved = structuredClone(addons); }),
    recordCompletion: vi.fn(async () => {}),
  };
  return { state, services, original };
}

it('reuses metadata compilation with detached names, exact types, order and visible-home flags', () => {
  const { state } = fixture(); const before = structuredClone(state.rawMetadataTemplate);
  const payload = prepareStremioMetadata(state);
  expect(payload.config.catalogs.map(item => [item.type, item.name, item.showInHome])).toEqual([['series', 'Shows', true], ['movie', 'Mi cine', true]]);
  expect(state.rawMetadataTemplate).toEqual(before);
});

it('preserves protected addons and records completion only after confirmed readback', async () => {
  const { state, services, original } = fixture();
  await configureStremio(state, services);
  expect(services.writeAddons).toHaveBeenCalledTimes(1);
  expect(services.writeAddons.mock.calls[0][1]).toContainEqual(original);
  expect(state.stremio.completed).toBe(true);
  expect(services.recordCompletion).toHaveBeenCalledWith(state.stremio.completionId);
  await expect(configureStremio(state, services)).rejects.toThrow('ya fue aplicada');
  expect(services.writeAddons).toHaveBeenCalledTimes(1);
});

it('rejects concurrent changes before provisioning or writing', async () => {
  const { state, services } = fixture();
  services.readAddons.mockResolvedValue([]);
  await expect(configureStremio(state, services)).rejects.toThrow('cambiaron');
  expect(services.provisionMetadata).not.toHaveBeenCalled();
  expect(services.writeAddons).not.toHaveBeenCalled();
});

it('checks an uncertain write without writing again or incrementing completion', async () => {
  const { state, services } = fixture();
  services.writeAddons.mockRejectedValue(new Error('network lost'));
  await expect(configureStremio(state, services)).rejects.toThrow('confirmar');
  const id = state.stremio.completionId;
  await expect(configureStremio(state, services)).rejects.toThrow('sin confirmar');
  expect(state.stremio.completionId).toBe(id);
  expect(services.writeAddons).toHaveBeenCalledTimes(1);
  expect(services.recordCompletion).not.toHaveBeenCalled();
});

it('can confirm a previously uncertain write with the original completion identity', async () => {
  const { state, services } = fixture();
  services.writeAddons.mockRejectedValue(new Error('network lost'));
  await expect(configureStremio(state, services)).rejects.toThrow();
  services.readAddons.mockResolvedValue(structuredClone(state.stremio.pendingWrite));
  await configureStremio(state, services);
  expect(services.writeAddons).toHaveBeenCalledTimes(1);
  expect(services.recordCompletion).toHaveBeenCalledTimes(1);
});

it('clears an explicit rejection for a deliberate retry', async () => {
  const { state, services } = fixture();
  services.writeAddons.mockRejectedValue(Object.assign(new Error('rejected'), { outcome: 'rejected' }));
  await expect(configureStremio(state, services)).rejects.toThrow('rechazó');
  expect(state.stremio.pendingWrite).toBeNull();
  expect(services.recordCompletion).not.toHaveBeenCalled();
});

it('blocks demos and oversized generated descriptors before touching Stremio', async () => {
  const { state, services } = fixture();
  state.stremio.session.demo = true;
  await expect(configureStremio(state, services)).rejects.toThrow('Demostración');
  expect(services.readAddons).not.toHaveBeenCalled();
  state.stremio.session.demo = false;
  services.inspectManifest.mockResolvedValue({ manifest: { id: 'aiometadata', catalogs: [{ id: 'tmdb.trending', type: 'movie' }, { id: 'tmdb.trending', type: 'series' }], description: 'x'.repeat(9000) } });
  await expect(configureStremio(state, services)).rejects.toThrow('8 KiB');
  expect(services.writeAddons).not.toHaveBeenCalled();
});
