export function createDefaultPreferences() {
  return {
    tmdbEnrichment: true,
    mdblistRatings: true,
    posterEngine: 'default',
    customPosterUrl: '',
    badgesEnabled: false,
    selectedBadgePack: 'tinted',
    activeBadgeModules: ['gr', 'gq', 'gv', 'ga', 'gc', 'ge', 'glang', 'gsub', 'gst', 'gs', 'gms'],
    badgeModulesOrder: ['gr', 'gq', 'gv', 'ga', 'gc', 'ge', 'glang', 'gsub', 'gst', 'gs', 'gms'],
  };
}

export function createDefaultNuvioAuth(anonKey = '') {
  return {
    email: '',
    password: '',
    accessToken: null,
    userId: null,
    apikey: anonKey,
    isAuthenticated: false,
  };
}

export function createDefaultApiKeys() {
  return {
    tmdb: '',
    tvdb: '',
    mdblist: '',
    rpdb: 't0-free-rpdb',
    topPoster: '',
    publicmetadb: '',
    gemini: '',
    openrouter: '',
  };
}

export function createDefaultAiometadata(defaultUrl = '') {
  return {
    instanceUrl: defaultUrl,
    password: '',
  };
}

export function createDefaultAiostreams() {
  return {
    installed: false,
    debrids: {},
    validatedKeys: {},
    manifestUrl: null,
  };
}

export function createDefaultExecution() {
  return {
    mode: 'real',
    isRunning: false,
    isCompleted: false,
    logs: [],
    result: null,
  };
}
