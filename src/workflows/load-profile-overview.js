/** Load independent overview sources without disguising failures as empty data. */
export async function loadProfileOverviewSources(client, context) {
  const sources = [
    ['plugins', 'listPlugins'],
    ['progressItems', 'pullWatchProgress'],
    ['libraryItems', 'pullLibrary'],
    ['watchedItems', 'pullWatched'],
  ];
  const responses = await Promise.allSettled(sources.map(([, method]) => client[method](context)));
  const result = { loadErrors: {} };
  responses.forEach((response, index) => {
    const [key] = sources[index];
    if (response.status === 'fulfilled' && Array.isArray(response.value)) {
      result[key] = response.value;
      return;
    }
    result[key] = [];
    result.loadErrors[key] = {
      status: response.reason?.status ?? null,
    };
  });
  return result;
}
