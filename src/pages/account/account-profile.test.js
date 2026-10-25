import { expect, it, vi } from 'vitest';
import { createInitialAccountState } from './account-state.js';
import { createAccountProfileLoader } from './account-profile.js';

function clientWith(addons) {
  return { listAddons: addons, pullProfileSettings: async () => ({}),
    pullProviderCredentials: async () => [], listPlugins: async () => [], pullWatchProgress: async () => [],
    pullLibrary: async () => [], pullWatched: async () => [] };
}

it('ignores a slow response after another profile is selected', async () => {
  let release;
  const slow = new Promise(resolve => { release = resolve; });
  const state = { ...createInitialAccountState(), selectedProfileId: 1, session: { accessToken: 'synthetic' } };
  const loader = createAccountProfileLoader({ state, config: {}, metadata: { cancel: vi.fn(), load: vi.fn() },
    notify: vi.fn(), render: vi.fn(), services: {},
    client: clientWith(({ profileId }) => profileId === 1 ? slow : Promise.resolve([{ id: 'second' }])),
  });
  const first = loader.load(1);
  state.selectedProfileId = 2;
  await loader.load(2);
  release([{ id: 'first' }]);
  await first;
  expect(state.installedAddons).toEqual([{ id: 'second' }]);
  expect(state.isLoadingProfile).toBe(false);
});

it('records a failed read instead of treating it as a confirmed empty profile', async () => {
  const state = { ...createInitialAccountState(), selectedProfileId: 1, session: {} };
  const notify = vi.fn();
  const loader = createAccountProfileLoader({ state, config: {}, metadata: { cancel: vi.fn() }, notify,
    render: vi.fn(), services: {}, client: clientWith(async () => { throw Error('offline'); }) });
  await loader.load(1);
  expect(state.loadErrors.addons).toBe(true);
  expect(notify).toHaveBeenCalledWith(expect.stringContaining('addons'), 'warning');
});

it('presents overview and releases core editing before slow metadata completes', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const state = { ...createInitialAccountState(), selectedProfileId: 1, session: {} };
  const presentOverview = vi.fn().mockResolvedValue(undefined);
  const metadata = { cancel: vi.fn(), load: vi.fn(() => gate) };
  const loader = createAccountProfileLoader({ state, config: {}, metadata, notify: vi.fn(), render: vi.fn(),
    services: { presentOverview }, client: clientWith(async () => [{ id: 'aio-metadata', name: 'AIOMetadata', manifest_url: 'https://metadata.invalid/stremio/synthetic/manifest.json' }]) });
  const loading = loader.load(1);
  await vi.waitFor(() => expect(metadata.load).toHaveBeenCalledOnce());
  expect(presentOverview).toHaveBeenCalledOnce();
  expect(state.isLoadingProfile).toBe(false);
  release(); await loading;
});
