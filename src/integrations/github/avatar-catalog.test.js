import { expect, it, vi } from 'vitest';
import { createAvatarCatalogClient } from './avatar-catalog.js';
import { avatarImageUrl } from './avatar-image-url.js';

const sha = 'a'.repeat(40);
const repo = 'synthetic/repository';

it('retrieves main SHA and complete blob paths using the existing GitHub API contract', async () => {
  const fetchImpl = vi.fn().mockResolvedValueOnce(Response.json({ object: { sha } }))
    .mockResolvedValueOnce(Response.json({ tree: [{ type: 'blob', path: 'assets/profile_icons/Style/Series/Hero.webp' }, { type: 'tree', path: 'assets' }] }));
  const client = createAvatarCatalogClient(repo, { fetchImpl, now: () => 123 });
  expect(await client.latestCommit()).toBe(sha);
  expect(await client.tree(sha)).toEqual(['assets/profile_icons/Style/Series/Hero.webp']);
  expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
    `https://api.github.com/repos/${repo}/git/ref/heads/main`,
    `https://api.github.com/repos/${repo}/git/trees/${sha}?recursive=1&_t=123`,
  ]);
});

it.each([{ truncated: true, tree: [] }, { tree: null }, {}, { tree: [null] }])('rejects an incomplete or malformed tree: %j', async body => {
  const client = createAvatarCatalogClient(repo, { fetchImpl: async () => Response.json(body) });
  await expect(client.tree(null)).rejects.toBeDefined();
});

it('maps a manifest pinned to the selected commit', async () => {
  const fetchImpl = vi.fn().mockResolvedValue(Response.json({ styles: [{ style: 'Style', franchises: [{ franchise: 'Series', files: ['Hero.webp'] }] }] }));
  const client = createAvatarCatalogClient(repo, { fetchImpl, now: () => 123 });
  expect(await client.manifest(sha)).toEqual([{ style: 'Style', franchise: 'Series', files: ['Hero.webp'] }]);
  expect(fetchImpl.mock.calls[0][0]).toBe(`https://raw.githubusercontent.com/${repo}/${sha}/assets/profile_icons/manifest.json?_t=123`);
});

it.each([{ styles: null }, { styles: [null] }, { styles: [{ style: 'Style', franchises: [{ franchise: 'Series', files: null }] }] }])('does not interpret an invalid manifest as an empty catalog: %j', async body => {
  const client = createAvatarCatalogClient(repo, { fetchImpl: async () => Response.json(body) });
  await expect(client.manifest(null)).rejects.toBeDefined();
});

it('cancels before requesting and propagates HTTP failures', async () => {
  const fetchImpl = vi.fn().mockResolvedValue(Response.json({}, { status: 503 }));
  const client = createAvatarCatalogClient(repo, { fetchImpl });
  await expect(client.latestCommit({ signal: AbortSignal.abort() })).rejects.toBeDefined();
  expect(fetchImpl).not.toHaveBeenCalled();
  await expect(client.latestCommit()).rejects.toMatchObject({ status: 503 });
});

it.each(['../assets/profile_icons/Style/One%20Piece/Hero.webp',
  'https://cdn.jsdelivr.net/gh/old/repository/assets/profile_icons/Style/One%20Piece/Hero.webp?old=1'])('normalizes legacy image URLs without double encoding: %s', path => {
  expect(avatarImageUrl(path, repo, sha)).toBe(`https://raw.githubusercontent.com/${repo}/main/assets/profile_icons/Style/One%20Piece/Hero.webp?v=${sha}`);
});

it('keeps encoded filename delimiters distinct from a query or fragment', () => {
  expect(avatarImageUrl('./assets/profile_icons/Style/Series/A%3FB%23C.webp?v=old', repo))
    .toBe(`https://raw.githubusercontent.com/${repo}/main/assets/profile_icons/Style/Series/A%3FB%23C.webp`);
});

it.each(['javascript:alert(1)', 'data:text/html,<script>', 'data:image/webp;base64,abc" onerror="alert(1)',
  '../assets/profile_icons/Style/../escape.webp', 'https://user:password@example.invalid/image.webp'])('rejects an unsafe avatar URL: %s', path => {
  expect(avatarImageUrl(path, repo)).toBe('');
});

it('preserves valid uploaded previews and external HTTPS avatar images', () => {
  expect(avatarImageUrl('data:image/webp;base64,YWJj', repo)).toBe('data:image/webp;base64,YWJj');
  expect(avatarImageUrl('https://example.invalid/avatar.webp', repo)).toBe('https://example.invalid/avatar.webp');
});
