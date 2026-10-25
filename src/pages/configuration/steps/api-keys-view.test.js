import { expect, it } from 'vitest';
import { keyFields, readKeySnapshot } from './api-keys-view.js';
it('reads only editable providers and retains fixed RPDB without enabling removed services', () => {
  const fields = { keyTmdb: ' tmdb ', keyMdblist: ' mdblist ' };
  const root = { querySelector: selector => ({ value: fields[selector.slice(1)] }) };
  expect(keyFields).toEqual({ tmdb: 'keyTmdb', mdblist: 'keyMdblist' });
  expect(readKeySnapshot(root)).toEqual({ keys: { tmdb: 'tmdb', mdblist: 'mdblist', rpdb: 't0-free-rpdb', tvdb: '', gemini: '', openrouter: '' }, aiEnabled: false });
});
