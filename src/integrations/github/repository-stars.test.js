import { expect, it, vi } from 'vitest';
import { fetchRepositoryStars } from './repository-stars.js';

it('reads the actual integer count from the same GitHub endpoint', async () => {
  const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ stargazers_count: 7 })));
  expect(await fetchRepositoryStars('owner/repo', { fetchImpl })).toBe(7);
  expect(fetchImpl.mock.calls[0][0]).toBe('https://api.github.com/repos/owner/repo');
});

it.each([null, '7', -1, 1.5])('rejects a non-count %j instead of displaying a fabricated zero', value => {
  return expect(fetchRepositoryStars('owner/repo', {
    fetchImpl: async () => new Response(JSON.stringify({ stargazers_count: value })),
  })).rejects.toMatchObject({ code: 'INVALID_STAR_COUNT' });
});

it('reports HTTP errors without retrying or exposing their body', async () => {
  const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ message: 'synthetic-private' }), { status: 403 }));
  await expect(fetchRepositoryStars('owner/repo', { fetchImpl })).rejects.toMatchObject({ status: 403 });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it('does not make a request after cancellation', async () => {
  const fetchImpl = vi.fn();
  const controller = new AbortController();
  controller.abort();
  await expect(fetchRepositoryStars('owner/repo', { fetchImpl, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  expect(fetchImpl).not.toHaveBeenCalled();
});
