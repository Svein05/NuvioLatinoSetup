import { expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ resolveDetails: vi.fn(), metrics: vi.fn(() => true), row: vi.fn() }));
vi.mock('../integrations/tmdb/media-details.js', () => ({ createMediaDetailsResolver: () => mocks.resolveDetails }));
vi.mock('../pages/account/sections/overview.js', () => ({ renderOverviewMetrics: mocks.metrics, renderOverviewRow: mocks.row }));
import { presentAccountOverview } from './account-overview.js';

it('ignores late metadata from the previous profile without clearing the current cards', async () => {
  let finishPrevious;
  let selected = 'old';
  mocks.resolveDetails.mockImplementation(item => item.title === 'old'
    ? new Promise(resolve => { finishPrevious = resolve; }) : Promise.resolve({ title: 'new' }));
  const render = title => presentAccountOverview({
    data: { currentlyWatching: [{ title }], recentlyWatched: [], loadErrors: {} },
    settings: { tmdb_api_key: 'synthetic' }, addonsCount: 0, isCurrent: () => selected === title,
  });
  const previous = render('old');
  selected = 'new';
  await render('new');
  const calls = mocks.row.mock.calls.length;
  finishPrevious({ title: 'old' });
  await previous;
  expect(mocks.row).toHaveBeenCalledTimes(calls);
  expect(mocks.row).toHaveBeenLastCalledWith([{ item: { title: 'new' }, details: { title: 'new' } }], { progress: true });
});
