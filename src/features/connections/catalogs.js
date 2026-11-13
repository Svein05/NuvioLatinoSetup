import { connectionCatalog as catalog } from './providers.js';

const statuses = { watching: 'Viendo', completed: 'Completados', plan_to_watch: 'Por ver', on_hold: 'En pausa', dropped: 'Abandonados' };

function traktCatalogs(lists, username) {
  const basic = ['movies', 'shows'].flatMap(type => {
    const media = type === 'movies' ? 'movie' : 'series';
    const label = type === 'movies' ? 'Películas' : 'Series';
    return [catalog('trakt', `trakt.watchlist.${type === 'shows' ? 'series' : type}`, media, `Por ver · ${label}`),
      catalog('trakt', `trakt.recommendations.${type}`, media, `Recomendaciones · ${label}`)];
  });
  return [...basic, ...lists.filter(item => /^\d+$/.test(String(item.ids?.trakt))).map(item => ({
    ...catalog('trakt', `trakt.list.${item.ids.trakt}`, 'all', [String(item.name || 'Lista'), {
      author: username, privacy: item.privacy || 'private', itemCount: item.item_count || 0,
      url: `https://trakt.tv/lists/${item.ids.trakt}`,
    }]), sort: item.sort_by || 'default', sortDirection: item.sort_how === 'desc' ? 'desc' : 'asc',
  }))];
}

function simklCatalogs(lists) {
  const states = { watching: 'Viendo', plantowatch: 'Por ver', completed: 'Completados', hold: 'En pausa', dropped: 'Abandonados' };
  const basic = ['movies', 'shows', 'anime'].flatMap(type => Object.entries(states)
    .filter(([status]) => type !== 'movies' || status !== 'watching')
    .map(([status, label]) => catalog('simkl', `simkl.watchlist.${type}.${status}`,
      type === 'movies' ? 'movie' : type === 'shows' ? 'series' : 'anime',
      [`${label} · ${type === 'movies' ? 'Películas' : type === 'shows' ? 'Series' : 'Anime'}`, { status }])));
  return [...basic, { ...catalog('simkl', 'simkl.upnext', 'series', ['Próximos episodios',
    { useShowPosterForUpNext: false, includeAnimeInUpNext: true }]), cacheTTL: 300 },
  ...lists.filter(item => /^\d+$/.test(String(item.id))).map(item => catalog('simkl', `simkl.list.${item.id}`,
    item.mediaType === 'movies' ? 'movie' : item.mediaType === 'anime' ? 'anime' : 'series', [String(item.name || 'Lista'), {
      listId: String(item.id), listName: item.name, mediatype: item.mediaType, privacy: item.privacy,
      itemCount: item.itemCount || 0, isPublic: item.privacy === 'public',
    }]))];
}

export function availableConnectionCatalogs(provider, lists, username) {
  if (provider === 'trakt') return traktCatalogs(lists, username);
  if (provider === 'simkl') return simklCatalogs(lists);
  if (provider === 'mal') return [...Object.entries(statuses).map(([status, name]) =>
    catalog('mal', `mal.userlist.${status}`, 'anime', name)), catalog('mal', 'mal.suggestions', 'anime', 'Sugerencias')];
  return lists.filter(list => typeof list.name === 'string' && list.name.length <= 150).map(list =>
    catalog('anilist', `anilist.${list.name}`, 'anime', [list.name, { username, listName: list.name,
      itemCount: list.entryCount || 0, isCustomList: Boolean(list.isCustomList),
      url: `https://anilist.co/user/${encodeURIComponent(username)}/animelist/${encodeURIComponent(list.name)}` }]));
}
