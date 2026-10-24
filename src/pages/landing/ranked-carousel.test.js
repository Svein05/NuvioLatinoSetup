import { expect, it } from 'vitest';
import { rankedCarouselPaths } from './ranked-carousel.js';

it('uses ranking order, ignores unavailable avatars and removes duplicates', () => {
  const paths = ['/assets/profile_icons/Style/Show/A.webp', '/assets/profile_icons/Style/Show/B.webp'];
  expect(rankedCarouselPaths(paths, [{ key: 'Style/Show/B.webp' }, { key: 'missing' },
    { key: 'Style/Show/B.webp' }, { key: 'Style/Show/A.webp' }])).toEqual([paths[1], paths[0]]);
});

it('keeps a bounded catalog fallback when no ranked avatar can be shown', () => {
  const paths = Array.from({ length: 30 }, (_, index) => `/assets/profile_icons/Style/Show/${index}.webp`);
  expect(rankedCarouselPaths(paths, [])).toEqual(paths.slice(0, 14));
});
