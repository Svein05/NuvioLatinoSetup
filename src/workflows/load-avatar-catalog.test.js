import { expect, it, vi } from 'vitest';
import { createAvatarCatalogStore } from '../features/avatars/index.js';
import { createAvatarCatalogLoader } from './load-avatar-catalog.js';

const sha = 'a'.repeat(40);
const registry = [{ style: 'Style', franchise: 'Series', files: ['Hero.webp'] }];
const paths = ['assets/profile_icons/Style/Series/Hero.webp'];

function fixture(snapshot = null) {
  const catalog = createAvatarCatalogStore();
  const cache = { read: vi.fn(() => snapshot), write: vi.fn() };
  const client = { latestCommit: vi.fn().mockResolvedValue(sha), tree: vi.fn().mockResolvedValue(paths), manifest: vi.fn().mockResolvedValue(registry) };
  const reportWarning = vi.fn();
  const loader = createAvatarCatalogLoader({ catalog, cache, client, now: () => 2000000, reportWarning });
  return { catalog, cache, client, loader, reportWarning };
}

it('loads once, coalesces concurrent requests and persists the existing cache schema', async () => {
  const f = fixture();
  const first = f.loader.load();
  expect(f.loader.load()).toBe(first);
  expect(await first).toHaveLength(1);
  await f.loader.load();
  expect(f.client.tree).toHaveBeenCalledOnce();
  expect(f.cache.write).toHaveBeenCalledWith({ registry, commitSha: sha, timestamp: 2000000 });
});

it('revalidates the branch but skips a fresh tree with the same commit', async () => {
  const f = fixture({ registry, commitSha: sha, timestamp: 1999999 });
  expect(await f.loader.load()).toHaveLength(1);
  expect(f.client.latestCommit).toHaveBeenCalledOnce();
  expect(f.client.tree).not.toHaveBeenCalled();
});

it.each([1999999, 1, 3000000])('refreshes a changed commit or invalid timestamp %i', async timestamp => {
  const f = fixture({ registry, commitSha: 'b'.repeat(40), timestamp });
  await f.loader.load();
  expect(f.client.tree).toHaveBeenCalledWith(sha, expect.any(Object));
});

it('falls back to a pinned remote manifest after a tree failure', async () => {
  const f = fixture();
  f.client.tree.mockRejectedValue(new Error('truncated'));
  expect(await f.loader.load()).toHaveLength(1);
  expect(f.client.manifest).toHaveBeenCalledWith(sha, expect.any(Object));
  expect(f.catalog.commitSha()).toBe(sha);
  expect(f.reportWarning).toHaveBeenCalled();
});

it('uses a stale session cache during an outage without claiming it is the latest revision', async () => {
  const f = fixture({ registry, commitSha: 'b'.repeat(40), timestamp: 1 });
  f.client.tree.mockRejectedValue(new Error('offline'));
  f.client.manifest.mockRejectedValue(new Error('offline'));
  expect(await f.loader.load()).toHaveLength(1);
  expect(f.catalog.commitSha()).toBe('b'.repeat(40));
  expect(f.cache.write).not.toHaveBeenCalled();
});

it('does not erase an existing catalog when forced refresh fails', async () => {
  const f = fixture();
  f.catalog.accept(registry, 'b'.repeat(40));
  f.client.tree.mockRejectedValue(new Error('offline'));
  f.client.manifest.mockRejectedValue(new Error('offline'));
  await expect(f.loader.load(true)).rejects.toThrow(/se conserva/);
  expect(f.catalog.avatars()).toHaveLength(1);
  expect(f.catalog.commitSha()).toBe('b'.repeat(40));
});

it('retries a previous unavailable load instead of caching failure as an empty catalog', async () => {
  const f = fixture();
  f.client.tree.mockRejectedValueOnce(new Error('offline'));
  f.client.manifest.mockRejectedValueOnce(new Error('offline'));
  expect(await f.loader.load()).toEqual([]);
  expect(await f.loader.load()).toHaveLength(1);
});

it('does not overwrite a publication made while a remote tree was pending', async () => {
  const f = fixture();
  f.catalog.accept(registry, sha);
  let resolve;
  f.client.tree.mockImplementation(() => new Promise(done => { resolve = done; }));
  const pending = f.loader.load(true);
  await vi.waitFor(() => expect(resolve).toBeTypeOf('function'));
  f.catalog.patch({ addedFiles: [{ path: 'assets/profile_icons/Style/Series/New.webp' }] });
  resolve(paths);
  expect(await pending).toHaveLength(2);
  expect(f.cache.write).not.toHaveBeenCalled();
});

it('does not accept cancelled results or query a fallback after cancellation', async () => {
  const f = fixture();
  const controller = new AbortController();
  f.client.tree.mockImplementation(async () => { controller.abort(); return paths; });
  await expect(f.loader.load(false, { signal: controller.signal })).rejects.toBeDefined();
  expect(f.catalog.loaded()).toBe(false);
  expect(f.cache.write).not.toHaveBeenCalled();
  expect(f.client.manifest).not.toHaveBeenCalled();
});

it('an older forced refresh cannot replace a newer accepted catalog', async () => {
  const f = fixture();
  let resolve;
  f.client.tree.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const older = f.loader.load(true);
  await vi.waitFor(() => expect(resolve).toBeTypeOf('function'));
  await f.loader.load(true);
  resolve(['assets/profile_icons/Style/Series/Obsolete.webp']);
  expect((await older)[0].fileName).toBe('Hero.webp');
});
