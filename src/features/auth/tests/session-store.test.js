import { expect, it, vi } from 'vitest';
import { createSessionStore, sanitizeSession } from '../index.js';

function storage(value = null) {
  return { getItem: vi.fn(() => value), setItem: vi.fn((_key, next) => { value = next; }), removeItem: vi.fn(() => { value = null; }) };
}

it('removes private credentials from existing sessions on read and write', () => {
  const session = { accessToken: 'synthetic', userId: 'user', email: 'test@example.invalid', password: 'private', aioPassword: 'private', apikey: 'private' };
  const store = storage(JSON.stringify(session));
  const persistence = createSessionStore({ storage: store, key: 'synthetic', now: () => 1000 });
  expect(persistence.read()).toEqual({ accessToken: 'synthetic', userId: 'user', email: 'test@example.invalid' });
  expect(store.setItem.mock.calls[0][1]).not.toContain('private');
  persistence.write(session);
  expect(store.setItem.mock.calls[1][1]).not.toContain('private');
});

it('expires JWT sessions and removes malformed storage without using password backups', () => {
  const token = `header.${btoa(JSON.stringify({ exp: 1 }))}.signature`;
  const store = storage(JSON.stringify({ accessToken: token, userId: 'user', password: 'private' }));
  expect(createSessionStore({ storage: store, key: 'synthetic', now: () => 1001 }).read()).toBeNull();
  expect(store.removeItem).toHaveBeenCalled();
  expect(sanitizeSession({ password: 'private' })).toBeNull();
  const reportWarning = vi.fn();
  expect(createSessionStore({ storage: storage('broken json'), key: 'synthetic', reportWarning }).read()).toBeNull();
  expect(reportWarning).toHaveBeenCalled();
});

it('reports storage failure without logging the session or claiming persistence succeeded', () => {
  const store = storage();
  store.setItem.mockImplementation(() => { throw new Error('storage blocked'); });
  const reportWarning = vi.fn();
  const result = createSessionStore({ storage: store, key: 'synthetic', reportWarning })
    .write({ accessToken: 'private-token', userId: 'user' });
  expect(result).toBe(false);
  expect(reportWarning).toHaveBeenCalledWith(expect.not.stringContaining('private-token'));
});
