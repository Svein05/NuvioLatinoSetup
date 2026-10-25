import { scopedMetricsStorage } from '../shared/storage/metrics-scope.js';
import { CONFIG } from './config.js';
import { createAvatarRankingStore } from '../features/avatars/index.js';
import { createAvatarRankingClient } from '../integrations/worker/avatar-ranking.js';
import { createAvatarRanking } from '../workflows/avatar-ranking.js';
import { createAvatarSummaryLoader } from '../workflows/avatar-ranking-summary.js';

const storage = name => scopedMetricsStorage({
  getItem: key => window[name].getItem(key), setItem: (key, value) => window[name].setItem(key, value),
  removeItem: key => window[name].removeItem(key),
});
const store = createAvatarRankingStore({ local: storage('localStorage'), session: storage('sessionStorage') });
const ranking = createAvatarRanking({ client: createAvatarRankingClient(CONFIG.WORKER_API_URL), store });
export const fetchAvatarRankingSummary = createAvatarSummaryLoader({ read: createAvatarRankingClient(CONFIG.WORKER_API_URL).summary, store });
export const fetchTopAvatarKeys = (limit = 8) => ranking.top(limit);
export const recordAvatarUsage = (path, session = {}) => ranking.record(path, session);
