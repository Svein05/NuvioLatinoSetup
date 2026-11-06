import { expect, it, vi } from 'vitest';
import { applyStremioMigration } from './migrate-stremio.js';

function fixture() {
  const item = id => ({ content_id: id, content_type: 'movie', name: id, added_at: 100 });
  const state = { migration: { selected: { library: true }, library: [item('tt1'), item('tt2')], results: {} } };
  let stored = [item('tt1')];
  const read = vi.fn(async () => stored);
  const write = vi.fn(async (_context, _category, rows) => { stored = rows; });
  return { state, read, write };
}

it('preserves destination records and rereads before retrying without duplicate writes', async () => {
  const f = fixture();
  const context = { profileId: 'chosen' };
  await applyStremioMigration(f.state, { ...f, context });
  expect(f.write.mock.calls[0][2].map(row => row.content_id)).toEqual(['tt1', 'tt2']);
  expect(f.write.mock.calls[0][0]).toBe(context);
  await applyStremioMigration(f.state, { ...f, context });
  expect(f.write).toHaveBeenCalledTimes(1);
  expect(f.state.migration.results.library).toEqual({ status: 'confirmed', added: 0 });
});

it('marks ambiguous writes uncertain and refuses to report completion', async () => {
  const f = fixture();
  f.write.mockRejectedValue(new Error('network interrupted'));
  await expect(applyStremioMigration(f.state, { ...f, context: { profileId: 'chosen' } })).rejects.toThrow('incompleta');
  expect(f.state.migration.results.library.status).toBe('uncertain');
});

it('does not write when a destination read fails', async () => {
  const f = fixture();
  f.read.mockRejectedValue(new Error('unavailable'));
  await expect(applyStremioMigration(f.state, { ...f, context: { profileId: 'chosen' } })).rejects.toThrow();
  expect(f.write).not.toHaveBeenCalled();
  expect(f.state.migration.results.library.status).toBe('failed');
});
