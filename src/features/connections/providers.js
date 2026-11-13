export const connectionProviders = {
  trakt: { name: 'Trakt', key: 'traktTokenId', auth: '/api/auth/trakt/authorize',
    artwork: 'https://raw.githubusercontent.com/cedya77/aiometadata/dev/public/trakt_icon.png', description: 'Tus listas, watchlist y recomendaciones de películas y series.' },
  simkl: { name: 'Simkl', key: 'simklTokenId', auth: '/api/auth/simkl/authorize',
    artwork: 'https://us.simkl.in/img_favicon/v2/favicon-192x192.png', description: 'Películas, series y anime pendientes, vistos y próximos episodios.' },
  anilist: { name: 'AniList', key: 'anilistTokenId', auth: '/anilist/auth',
    artwork: 'https://raw.githubusercontent.com/cedya77/aiometadata/dev/public/anilist_icon.png', description: 'Las listas de anime que organizas en tu cuenta.' },
  mal: { name: 'MyAnimeList', key: 'malTokenId', auth: '/mal/auth',
    artwork: 'https://raw.githubusercontent.com/cedya77/aiometadata/dev/public/mal_icon.png', description: 'Tus listas de anime y sugerencias para descubrir algo nuevo.' },
};

export function connectionCatalog(source, id, type, details) {
  const [name, metadata] = Array.isArray(details) ? details : [details];
  return { id, type, name, source, enabled: true, showInHome: false, ...(metadata && { metadata }) };
}

export function selectedConnectionCatalogs(connections) {
  return Object.values(connections?.accounts || {}).flatMap(account =>
    account.catalogs.filter(catalog => account.selected.includes(`${catalog.type}:${catalog.id}`)));
}

export function connectionCredentials(connections) {
  return Object.fromEntries(Object.entries(connections?.accounts || {}).map(([provider, account]) =>
    [connectionProviders[provider].key, account.tokenId]));
}
