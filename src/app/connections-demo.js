import { isDemoCode, demoScenario, demoDelay } from '../shared/demo/setup.js';

const examples = {
  trakt: [{ name: 'Favoritas para el fin de semana', ids: { trakt: 101 }, item_count: 24 },
    { name: 'Series pendientes', ids: { trakt: 102 }, item_count: 12 }],
  simkl: [{ id: 201, name: 'Películas favoritas', mediaType: 'movies', itemCount: 18, privacy: 'private' },
    { id: 202, name: 'Anime pendiente', mediaType: 'anime', itemCount: 9, privacy: 'private' }],
  anilist: [{ name: 'Watching', entryCount: 7 }, { name: 'Planning', entryCount: 23 },
    { name: 'Mis favoritos', entryCount: 15, isCustomList: true }],
  mal: [],
};

/** Same UI contract as the real adapter, with no OAuth or provider requests for reserved codes. */
export function withConnectionDemos(client) {
  return {
    ...client,
    async verify(instance, provider, tokenId, signal) {
      if (!isDemoCode(tokenId)) return client.verify(instance, provider, tokenId, signal);
      const scenario = demoScenario(tokenId);
      await demoDelay(signal, scenario === 'SLOW' ? 3500 : 650);
      if (scenario === 'EXPIRED') throw new Error('La conexión de demostración venció. Vuelve a conectarla.');
      if (scenario === 'WRONG') throw new Error('El identificador corresponde a otro servicio.');
      if (!['OK', 'EMPTY', 'SLOW', 'LISTS-ERROR', 'PREMIUM'].includes(scenario)) throw new Error('No se pudo comprobar la conexión de demostración.');
      return { username: 'Perfil de demostración', demo: true };
    },
    async lists(instance, provider, account, signal) {
      if (!account.demo) return client.lists(instance, provider, account, signal);
      await demoDelay(signal);
      const scenario = demoScenario(account.tokenId);
      if (scenario === 'LISTS-ERROR') return { lists: [], limitation: 'unavailable' };
      if (scenario === 'PREMIUM' && provider === 'simkl') return { lists: [], limitation: 'premium_only' };
      return { lists: scenario === 'EMPTY' ? [] : examples[provider], empty: scenario === 'EMPTY' };
    },
  };
}
