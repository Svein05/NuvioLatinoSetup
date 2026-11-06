import { expect, it, vi } from 'vitest';
import { readMigrationTarget } from './migration.js';

it('reads every page with the chosen profile filter and an exact count', async () => {
  const first = Array.from({ length: 500 }, (_, index) => ({ content_id: `tt${index}`, profile_id: 2 }));
  const fetchImpl = vi.fn(async url => Response.json(new URL(url).searchParams.get('offset') === '0'
    ? first : [{ content_id: 'tt500', profile_id: 2 }], { headers: { 'content-range': '0-499/501' } }));
  const rows = await readMigrationTarget({ apiUrl: 'https://example.invalid', profileId: 2, fetchImpl }, 'library');
  expect(rows).toHaveLength(501);
  expect(fetchImpl).toHaveBeenCalledTimes(2);
  for (const [url] of fetchImpl.mock.calls) expect(new URL(url).searchParams.get('profile_id')).toBe('eq.2');
});

it('rejects partial reads and rows belonging to another profile', async () => {
  for (const rows of [[{ content_id: 'tt1', profile_id: 3 }], [{ content_id: 'tt1', profile_id: 2 }]]) {
    await expect(readMigrationTarget({ apiUrl: 'https://example.invalid', profileId: 2,
      fetchImpl: async () => Response.json(rows, { headers: { 'content-range': '0-0/2' } }),
    }, 'library')).rejects.toThrow();
  }
});
