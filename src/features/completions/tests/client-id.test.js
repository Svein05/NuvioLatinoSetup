import { expect, it, vi } from 'vitest';
import { createCompletionIdentity } from '../application/client-id.js';

it('retains browser identity across calls and reloads, including blocked storage', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const uuid = vi.fn(() => '12345678-1234-4234-8234-123456789abc');
  const identity = createCompletionIdentity({ storage, uuid });
  expect(identity()).toBe(identity());
  expect(createCompletionIdentity({ storage, uuid })()).toBe(identity());
  expect(uuid).toHaveBeenCalledTimes(1);
  const blocked = createCompletionIdentity({ storage: { getItem() { throw new Error(); }, setItem() { throw new Error(); } }, uuid });
  expect(blocked()).toBe(blocked());
  expect(uuid).toHaveBeenCalledTimes(2);
});
