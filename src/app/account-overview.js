import { createMediaDetailsResolver } from '../integrations/tmdb/media-details.js';
import { renderOverviewMetrics, renderOverviewRow } from '../pages/account/sections/overview.js';

const resolveDetails = createMediaDetailsResolver();

/** Compose the account view with read-only metadata adapters and a captured profile revision. */
export async function presentAccountOverview({ data, settings, addonsCount, isCurrent }) {
  if (!isCurrent()) return;
  if (!renderOverviewMetrics(data, { settings, addonsCount })) return;
  await Promise.all([
    { items: data.currentlyWatching || [], progress: true, error: data.loadErrors?.progressItems },
    { items: data.recentlyWatched || [], progress: false, error: data.loadErrors?.watchedItems },
  ].map(async ({ items, progress, error }) => {
    renderOverviewRow([], { progress, error, loading: !error && items.length > 0 });
    if (error || !items.length) return;
    const cards = await Promise.all(items.map(async item => ({ item, details: await resolveDetails(item, settings.tmdb_api_key) })));
    if (isCurrent()) renderOverviewRow(cards, { progress });
  }));
}
