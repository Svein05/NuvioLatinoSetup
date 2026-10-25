import { describe, expect, it } from 'vitest';
import { resolveCatalogTitle } from '../model/catalog-title.js';

describe('resolveCatalogTitle', () => {
  it('prioritizes explicit source title', () => {
    expect(resolveCatalogTitle({ title: ' Mi Título Personalizado ' })).toBe('Mi Título Personalizado');
  });

  it('uses catalog metadata name when clean and friendly', () => {
    const map = new Map([['custom-cat', { name: 'Catálogo de Anime Latino' }]]);
    expect(resolveCatalogTitle({ catalogId: 'custom-cat' }, map)).toBe('Catálogo de Anime Latino');
  });

  it('resolves canonical trending and top titles in Spanish', () => {
    expect(resolveCatalogTitle({ catalogId: 'tmdb.trending_movie' })).toBe('Lo que todo el mundo está viendo - Día');
    expect(resolveCatalogTitle({ catalogId: 'tmdb.trending.series', type: 'series' })).toBe('Lo que todo el mundo está viendo - Día');
    expect(resolveCatalogTitle({ catalogId: 'tmdb.top_movie' })).toBe('Lo más popular de hoy');
    expect(resolveCatalogTitle({ catalogId: 'tmdb.top_series' })).toBe('Lo más popular de hoy');
    expect(resolveCatalogTitle({ catalogId: 'trakt.recommendations.movies' })).toBe('Recomendaciones de Trakt');
  });

  it('resolves streaming discovery titles with emoji', () => {
    expect(resolveCatalogTitle({ catalogId: 'tmdb.discover.movie.streaming.disney-plus' })).toBe('🎬 Disney Plus');
  });

  it('resolves genre discovery titles with emoji', () => {
    expect(resolveCatalogTitle({ catalogId: 'tmdb.discover.series.genres.ciencia-ficcion' })).toBe('🎭 Ciencia Ficcion');
  });

  it('falls back to metadata name or catalog ID', () => {
    const map = new Map([['tmdb.unknown', { name: 'tmdb.unknown_fallback' }]]);
    expect(resolveCatalogTitle({ catalogId: 'tmdb.unknown' }, map)).toBe('tmdb.unknown_fallback');
    expect(resolveCatalogTitle({ catalogId: 'completely-unknown' })).toBe('completely-unknown');
  });
});
