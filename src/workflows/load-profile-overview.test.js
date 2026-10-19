import { describe, expect, it, vi } from 'vitest';
import { loadProfileOverviewSources } from './load-profile-overview.js';

function sourceClient() {
  return {
    listPlugins: vi.fn(async () => []),
    pullWatchProgress: vi.fn(async () => []),
    pullLibrary: vi.fn(async () => []),
    pullWatched: vi.fn(async () => []),
  };
}

describe('overview sources', () => {
  it('keeps valid empty progress distinguishable from unavailable progress', async () => {
    const client = sourceClient();
    const context = { profileId: 1 };
    expect((await loadProfileOverviewSources(client, context)).loadErrors).toEqual({});
    client.pullWatchProgress.mockRejectedValueOnce(Object.assign(new Error('unavailable'), { status: 503 }));
    const result = await loadProfileOverviewSources(client, context);
    expect(result.progressItems).toEqual([]);
    expect(result.loadErrors.progressItems).toEqual({ status: 503 });
    expect(client.pullWatchProgress).toHaveBeenLastCalledWith(context);
  });

  it('preserves successful sections and their totals when a different section fails', async () => {
    const client = sourceClient();
    const library = Object.assign([{ title: 'Synthetic item' }], { totalCount: 150 });
    client.pullLibrary.mockResolvedValueOnce(library);
    client.pullWatchProgress.mockRejectedValueOnce(new Error('synthetic private detail'));
    const result = await loadProfileOverviewSources(client, { profileId: 1 });
    expect(result.libraryItems).toBe(library);
    expect(result.libraryItems.totalCount).toBe(150);
    expect(JSON.stringify(result.loadErrors)).not.toContain('private detail');
  });

  it('marks malformed source data as unavailable rather than a confirmed empty list', async () => {
    const client = sourceClient();
    client.pullWatchProgress.mockResolvedValueOnce({ invalid: true });
    const result = await loadProfileOverviewSources(client, { profileId: 1 });
    expect(result.loadErrors.progressItems).toEqual({ status: null });
  });
});
