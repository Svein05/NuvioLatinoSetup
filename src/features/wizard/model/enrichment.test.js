import { expect, it } from 'vitest';
import { getEnrichmentState } from './enrichment.js';

it.each(['', '   ', undefined])('does not call missing MDBList key %s active', mdblist => {
  expect(getEnrichmentState({ tmdbEnrichment: true, mdblistRatings: true }, { mdblist }))
    .toEqual({ tmdb: true, mdblist: false, mdblistMissingKey: true });
});

it('respects both provider toggles independently of retained keys', () => {
  expect(getEnrichmentState({ tmdbEnrichment: false, mdblistRatings: false }, { mdblist: 'retained' }))
    .toEqual({ tmdb: false, mdblist: false, mdblistMissingKey: false });
});
