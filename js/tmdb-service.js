/**
 * Servicio Cliente para la API de TMDB (TheMovieDatabase)
 * Consulta metadatos, pósters e información cinematográfica en Español Latino (es-MX).
 */
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w300';
const cache = new Map();

// Datos de respaldo en caso de desconexión o fallo de red
const FALLBACK_LATINO_MOVIES = [
  {
    id: 1022789,
    title: 'IntensaMente 2',
    name: 'IntensaMente 2',
    poster_path: '/xeqR85fGgqB5c0eQ4bWzT2wP06T.jpg',
    release_date: '2024-06-14',
    vote_average: 7.6,
    overview: 'Nuevas emociones llegan a la mente de Riley mientras entra a la adolescencia.'
  },
  {
    id: 533535,
    title: 'Deadpool y Wolverine',
    name: 'Deadpool y Wolverine',
    poster_path: '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    release_date: '2024-07-26',
    vote_average: 7.7,
    overview: 'Wade Wilson se une a un reacio Wolverine en una misión para salvar su universo.'
  },
  {
    id: 693134,
    title: 'Duna: Parte Dos',
    name: 'Duna: Parte Dos',
    poster_path: '/czembW0RJJ1rBoPP2Zqaoao9dQ9.jpg',
    release_date: '2024-03-01',
    vote_average: 8.2,
    overview: 'Paul Atreides se une a Chani y a los Fremen mientras busca venganza.'
  },
  {
    id: 823464,
    title: 'Godzilla y Kong: El nuevo imperio',
    name: 'Godzilla y Kong: El nuevo imperio',
    poster_path: '/tMefBSflR6PGQLv7WvFPpKLZkyk.jpg',
    release_date: '2024-03-29',
    vote_average: 7.2,
    overview: 'Una batalla épica une al todopoderoso Kong y al temible Godzilla.'
  },
  {
    id: 940551,
    title: 'Mi Villano Favorito 4',
    name: 'Mi Villano Favorito 4',
    poster_path: '/wWba3TaojhK7NdycRhoQpsG0FaH.jpg',
    release_date: '2024-07-03',
    vote_average: 7.1,
    overview: 'Gru y Lucy dan la bienvenida a un nuevo miembro a la familia.'
  },
  {
    id: 573435,
    title: 'Bad Boys: Hasta la muerte',
    name: 'Bad Boys: Hasta la muerte',
    poster_path: '/7rU915e8V66eQ4W56Yh3u7fE9z.jpg',
    release_date: '2024-06-07',
    vote_average: 7.5,
    overview: 'Los policías favoritos de Miami regresan con su icónica mezcla de acción y comedia.'
  }
];

export class TmdbService {
  /**
   * Resuelve la URL absoluta del póster en TMDB
   */
  static getPosterUrl(posterPath) {
    if (!posterPath) {
      return 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=300';
    }
    if (posterPath.startsWith('http')) return posterPath;
    return `${TMDB_IMAGE_BASE}${posterPath}`;
  }

  /**
   * Consulta elementos destacados/tendencias en Español Latino
   */
  static async fetchTrending(mediaType = 'movie', apiKey = '') {
    if (!apiKey) return FALLBACK_LATINO_MOVIES;

    const cacheKey = `trending_${mediaType}_${apiKey}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    try {
      const type = mediaType === 'series' ? 'tv' : mediaType === 'all' ? 'all' : 'movie';
      const url = `${TMDB_BASE_URL}/trending/${type}/week?api_key=${apiKey}&language=es-MX`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`TMDB error ${res.status}`);
      const data = await res.json();
      const results = (data.results || []).slice(0, 12);
      cache.set(cacheKey, results);
      return results;
    } catch (err) {
      console.warn('[TmdbService] Error en fetchTrending:', err.message);
      return FALLBACK_LATINO_MOVIES;
    }
  }

  /**
   * Consulta elementos mejor valorados (Top Rated)
   */
  static async fetchTopRated(mediaType = 'movie', apiKey = '') {
    if (!apiKey) return FALLBACK_LATINO_MOVIES;

    const cacheKey = `top_rated_${mediaType}_${apiKey}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    try {
      const endpoint = mediaType === 'series' ? 'tv' : 'movie';
      const url = `${TMDB_BASE_URL}/${endpoint}/top_rated?api_key=${apiKey}&language=es-MX&page=1`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`TMDB error ${res.status}`);
      const data = await res.json();
      const results = (data.results || []).slice(0, 12);
      cache.set(cacheKey, results);
      return results;
    } catch (err) {
      console.warn('[TmdbService] Error en fetchTopRated:', err.message);
      return FALLBACK_LATINO_MOVIES;
    }
  }

  /**
   * Consulta el endpoint Discover con parámetros de filtro (usado para plataformas de streaming y géneros)
   */
  static async fetchDiscover(mediaType = 'movie', params = {}, apiKey = '') {
    if (!apiKey) return FALLBACK_LATINO_MOVIES;

    const queryParams = new URLSearchParams({
      api_key: apiKey,
      language: 'es-MX',
      sort_by: params.sort_by || 'popularity.desc',
      page: '1',
      include_adult: 'false'
    });

    if (params.with_watch_providers) {
      queryParams.set('with_watch_providers', params.with_watch_providers);
      queryParams.set('watch_region', params.watch_region || 'MX');
    }
    if (params.with_genres) {
      queryParams.set('with_genres', params.with_genres);
    }
    if (params['vote_count.gte']) {
      queryParams.set('vote_count.gte', params['vote_count.gte']);
    }

    const endpoint = mediaType === 'series' || mediaType === 'tv' ? 'tv' : 'movie';
    const cacheKey = `discover_${endpoint}_${queryParams.toString()}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    try {
      const url = `${TMDB_BASE_URL}/discover/${endpoint}?${queryParams.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`TMDB Discover error ${res.status}`);
      const data = await res.json();
      const results = (data.results || []).slice(0, 12);
      cache.set(cacheKey, results);
      return results;
    } catch (err) {
      console.warn('[TmdbService] Error en fetchDiscover:', err.message);
      return FALLBACK_LATINO_MOVIES;
    }
  }

  /**
   * Resuelve el contenido visual para un catálogo específico dado su ID y metadatos
   * @param {string} catalogId - ID del catálogo (ej. 'tmdb.trending', 'trakt.recommendations.movies', 'mdblist.6506')
   * @param {object} catalogMeta - Definición del catálogo en MetadataLatino.json
   * @param {string} apiKey - TMDB API Key del usuario
   * @returns {Promise<{ isTrakt: boolean, items: Array, title: string, mediaType: string }>}
   */
  static async resolveCatalogPreview(catalogId, catalogMeta = {}, apiKey = '') {
    const isTrakt = (
      String(catalogId || '').toLowerCase().startsWith('trakt.') ||
      String(catalogMeta?.source || '').toLowerCase() === 'trakt'
    );

    const title = catalogMeta?.name || catalogId;
    const mediaType = catalogMeta?.type || catalogMeta?.displayType || 'movie';

    if (isTrakt) {
      return {
        catalogId,
        title,
        mediaType,
        isTrakt: true,
        items: []
      };
    }

    // 1. Catálogo con parámetros Discover configurados
    if (catalogMeta?.metadata?.discover?.params) {
      const items = await this.fetchDiscover(mediaType, catalogMeta.metadata.discover.params, apiKey);
      return { catalogId, title, mediaType, isTrakt: false, items };
    }

    // 2. Catálogos conocidos de TMDB
    if (catalogId.includes('top_rated')) {
      const items = await this.fetchTopRated(mediaType, apiKey);
      return { catalogId, title, mediaType, isTrakt: false, items };
    }

    if (catalogId.includes('popular') || catalogId.includes('trending') || catalogId.includes('top')) {
      const items = await this.fetchTrending(mediaType, apiKey);
      return { catalogId, title, mediaType, isTrakt: false, items };
    }

    // 3. Catálogos MDBList o genéricos: consultar tendencias en español latino
    const items = await this.fetchTrending(mediaType, apiKey);
    return { catalogId, title, mediaType, isTrakt: false, items };
  }
}
