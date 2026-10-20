import { expect, it, vi } from 'vitest';
import { createCompletionStore, formatCompactNumber, formatFullNumber } from '../index.js';

it.each([[0, '0'], [150, '150'], [999, '999'], [1000, '1k'], [1500, '1.5k'],
  [12000, '12k'], [12400, '12.4k'], [150000, '150k'], [1000000, '1M'],
  [2500000, '2.5M'], [150000000, '150M'], [2500000000, '2.5B'], [null, '--']])(
  'preserves the compact display for %s', (value, expected) => expect(formatCompactNumber(value)).toBe(expected),
);

it('preserves the full Spanish number format', () => {
  expect(formatFullNumber(12345)).toBe('12,345');
  expect(formatFullNumber(undefined)).toBe('--');
});

it.each(['0', '151', '-1', '151garbage', '', '1.5'])('validates a cached count: %j', raw => {
  const local = { getItem: () => raw };
  const store = createCompletionStore({ local, session: local, reportWarning: vi.fn() });
  const valid = raw === '0' || raw === '151';
  expect(store.snapshot()).toEqual(valid ? { count: Number(raw), source: 'cache' } : { count: 150, source: 'estimate' });
});
