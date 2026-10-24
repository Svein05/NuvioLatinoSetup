import { expect, it } from 'vitest';
import { createPosterQueue } from './queue.js';
const items = Array.from({ length: 30 }, (_, index) => ({ id: index + 1, mediaType: 'movie' }));

it('consumes the pool before repeating and avoids immediately repeated titles across cycles', () => {
  const queue = createPosterQueue(items, { random: () => .5 });
  const first = Array.from({ length: 30 }, () => queue.next().id);
  expect(new Set(first).size).toBe(30);
  expect(first.slice(-12)).not.toContain(queue.next().id);
});

it('session continuation survives page changes and storage denial', () => {
  let saved;
  const storage = { getItem: () => saved, setItem: (_key, value) => { saved = value; } };
  const first = createPosterQueue(items, { storage }).next();
  expect(createPosterQueue(items, { storage }).next().id).not.toBe(first.id);
  expect(createPosterQueue(items, { storage: { getItem: () => { throw new Error('denied'); } } }).next()).toBeTruthy();
});
