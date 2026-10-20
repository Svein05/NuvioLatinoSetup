import { DEMO_POSTERS } from '../../../features/posters/index.js';

export function preloadImage(url, timeoutMs = 4500) {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error('URL vacía'));
    const img = new Image();
    const timer = setTimeout(() => {
      img.onload = img.onerror = null;
      reject(new Error(`Timeout (${timeoutMs}ms) precargando: ${url}`));
    }, timeoutMs);

    img.onload = () => {
      clearTimeout(timer);
      if (img.naturalWidth > 10 && img.naturalHeight > 10) resolve({ url, img });
      else reject(new Error(`Dimensiones inválidas para: ${url}`));
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error(`Fallo al cargar imagen: ${url}`));
    };
    img.src = url;
  });
}

export function refillPosterDeck(currentImdb) {
  const pool = DEMO_POSTERS.filter(p => p.imdbId !== currentImdb);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function buildBetterPosterUrl(item, customBetterUrl) {
  const pattern = customBetterUrl || 'https://btttr.cc/poster/imdb/poster-default/{imdb_id}.jpg?lang=es-MX&rs=IM';
  return pattern
    .replace(/\{imdb_id\??\}/g, item.imdbId)
    .replace(/\{id\??\}/g, item.imdbId)
    .replace(/\{tmdb_id\??\}/g, item.tmdbId)
    .replace(/\{type\??\}/g, item.type);
}

function buildPostersPlusUrl(item, customPlusUrl, { tmdbKey, mdblistKey }) {
  const defaultPattern = `https://postersplus.stremio.ru/poster?tmdb_id={tmdb_id?}&imdb_id={imdb_id?}&stremio_id={id}&type={type}&primary_client=stremio_tv_nuvio&tmdb_key=${tmdbKey}&mdblist_key=${mdblistKey}&top_gradient=medium&fallback_to_imdb=true&rating_display_mode=3&minimalist_append_mode=3&minimalist_mode_font_size_ratio=0.056&minimalist_mode_font_x_offset=0.065&minimalist_score_out_of_10=true&movie_weights=letterboxd%3A0.99%2Ctrakt%3A0.01&tv_weights=trakt%3A0.80%2Ctomatoes%3A0.20&logo_language=es-mx&logo_priority=native%2Cenglish%2Coriginal%2Cneutral%2Ctext&fallback_bg_style=photoreal&logo_bottom_ratio=0.23&sash_length_ratio=1.20&sash_height_ratio=0.135&badge_display_mode=0`;
  const pattern = customPlusUrl || defaultPattern;
  return pattern
    .replace(/\{tmdb_id\??\}/g, item.tmdbId)
    .replace(/\{imdb_id\??\}/g, item.imdbId)
    .replace(/\{id\??\}/g, item.imdbId)
    .replace(/\{type\??\}/g, item.type)
    .replace(/\{tmdb_key\??\}/g, tmdbKey)
    .replace(/\{mdblist_key\??\}/g, mdblistKey);
}

async function fetchTmdbDefaultPoster(item, tmdbEncoded) {
  if (!tmdbEncoded || typeof fetch === 'undefined') return null;
  try {
    const endpoint = item.type === 'series' ? 'tv' : 'movie';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`https://api.themoviedb.org/3/${endpoint}/${item.tmdbId}?api_key=${tmdbEncoded}&language=es-MX`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null;
  } catch {
    return null;
  }
}

export async function resolveCandidateUrls(item, { tmdbKey = '', mdblistKey = '', customBetterUrl = '', customPlusUrl = '' } = {}) {
  const tmdbEncoded = encodeURIComponent(tmdbKey.trim());
  const mdblistEncoded = encodeURIComponent(mdblistKey.trim());
  const betterUrl = buildBetterPosterUrl(item, customBetterUrl);
  const plusUrl = buildPostersPlusUrl(item, customPlusUrl, { tmdbKey: tmdbEncoded, mdblistKey: mdblistEncoded });
  const tmdbPoster = await fetchTmdbDefaultPoster(item, tmdbEncoded);
  const defaultUrl = tmdbPoster || item.fallbackPoster;
  return { item, betterUrl, plusUrl, defaultUrl };
}

export async function verifyAndPreloadTriple(item, options) {
  try {
    const resolved = await resolveCandidateUrls(item, options);
    if (typeof Image !== 'undefined') {
      await Promise.all([
        preloadImage(resolved.defaultUrl, 4500),
        preloadImage(resolved.betterUrl, 4500),
        preloadImage(resolved.plusUrl, 4500),
      ]);
    }
    return resolved;
  } catch {
    return null;
  }
}

function updatePosterDom(root, { item, defaultUrl, betterUrl, plusUrl }) {
  const titleEl = root.getElementById ? root.getElementById('posterDemoTitle') : root.querySelector?.('#posterDemoTitle');
  const imgDefault = root.getElementById ? root.getElementById('posterPreviewDefault') : root.querySelector?.('#posterPreviewDefault');
  const imgBetter = root.getElementById ? root.getElementById('posterPreviewBetter') : root.querySelector?.('#posterPreviewBetter');
  const imgPlus = root.getElementById ? root.getElementById('posterPreviewPostersPlus') : root.querySelector?.('#posterPreviewPostersPlus');

  if (titleEl) {
    titleEl.innerHTML = `<span class="px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 font-mono text-[9px] uppercase font-bold mr-1.5">${item.category}</span><span title="${item.title}">${item.title}</span>`;
  }
  if (imgBetter) imgBetter.src = betterUrl;
  if (imgPlus) imgPlus.src = plusUrl;
  if (imgDefault) imgDefault.src = defaultUrl;
}

async function renderVerifiedItem(root, verified, withTransition) {
  const titleEl = root.getElementById ? root.getElementById('posterDemoTitle') : root.querySelector?.('#posterDemoTitle');
  const imgDefault = root.getElementById ? root.getElementById('posterPreviewDefault') : root.querySelector?.('#posterPreviewDefault');
  const imgBetter = root.getElementById ? root.getElementById('posterPreviewBetter') : root.querySelector?.('#posterPreviewBetter');
  const imgPlus = root.getElementById ? root.getElementById('posterPreviewPostersPlus') : root.querySelector?.('#posterPreviewPostersPlus');
  const imgs = [imgDefault, imgBetter, imgPlus].filter(Boolean);

  if (withTransition && imgs.length) {
    imgs.forEach(img => { img.style.opacity = '0'; });
    if (titleEl) titleEl.style.opacity = '0';
    await new Promise(r => setTimeout(r, 300));
    updatePosterDom(root, verified);
    imgs.forEach(img => { img.style.opacity = '1'; });
    if (titleEl) titleEl.style.opacity = '1';
  } else {
    updatePosterDom(root, verified);
    imgs.forEach(img => { img.style.opacity = '1'; });
    if (titleEl) titleEl.style.opacity = '1';
  }
}

async function findNextCandidate(drawNext, opts) {
  for (let i = 0; i < 6; i++) {
    const verified = await verifyAndPreloadTriple(drawNext(), opts);
    if (verified) return verified;
  }
  return null;
}

async function findPrevCandidate(currentIndex, opts) {
  let prevIdx = (currentIndex - 1 + DEMO_POSTERS.length) % DEMO_POSTERS.length;
  for (let i = 0; i < 6; i++) {
    const verified = await verifyAndPreloadTriple(DEMO_POSTERS[prevIdx], opts);
    if (verified) return verified;
    prevIdx = (prevIdx - 1 + DEMO_POSTERS.length) % DEMO_POSTERS.length;
  }
  return null;
}

export function createPostersCarousel({ getKeys, getCustomUrls, root = document } = {}) {
  let currentIndex = 19;
  let currentItem = DEMO_POSTERS[19] || DEMO_POSTERS[0];
  let deck = [];
  let timer = null;
  let transitioning = false;

  const drawNext = () => {
    if (!deck.length) deck = refillPosterDeck(currentItem?.imdbId);
    return deck.shift() || DEMO_POSTERS[0];
  };

  const getOptions = () => ({
    tmdbKey: getKeys?.()?.tmdb || '',
    mdblistKey: getKeys?.()?.mdblist || '',
    customBetterUrl: getCustomUrls?.()?.better || '',
    customPlusUrl: getCustomUrls?.()?.plus || '',
  });

  const displayVerified = async (verified, withTransition = true) => {
    transitioning = true;
    await renderVerifiedItem(root, verified, withTransition);
    currentItem = verified.item;
    currentIndex = Math.max(0, DEMO_POSTERS.findIndex(p => p.imdbId === verified.item.imdbId));
    transitioning = false;
  };

  const rotateToNext = async (withTransition = true) => {
    if (transitioning) return;
    const verified = await findNextCandidate(drawNext, getOptions());
    if (verified) await displayVerified(verified, withTransition);
  };

  const start = () => { stop(); timer = setInterval(() => rotateToNext(true), 5500); };
  const stop = () => { if (timer) { clearInterval(timer); timer = null; } };

  return {
    start, stop,
    next: async () => { stop(); await rotateToNext(true); start(); },
    prev: async () => {
      stop();
      const verified = await findPrevCandidate(currentIndex, getOptions());
      if (verified) await displayVerified(verified, true);
      start();
    },
    updatePreviews: async () => {
      const verified = await verifyAndPreloadTriple(currentItem || DEMO_POSTERS[currentIndex] || DEMO_POSTERS[0], getOptions());
      if (verified) await displayVerified(verified, false);
    },
    getCurrentItem: () => currentItem,
    getCurrentIndex: () => currentIndex,
    dispose: () => stop(),
  };
}
