/**
 * Sincronizador de Estrellas de GitHub para Nuvio Latino Setup
 * Consulta el endpoint oficial de GitHub con caché de 1 hora en localStorage.
 */

const GITHUB_REPO = 'Svein05/NuvioLatinoSetup';
const STORAGE_KEY = 'nuvio_github_stars_cache';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hora
const DEFAULT_FALLBACK_STARS = 3;

export async function fetchGitHubStars() {
  // 1. Verificar si hay caché reciente y válido
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.stars === 'number') {
        const isFresh = Date.now() - (parsed.timestamp || 0) < CACHE_DURATION_MS;
        if (isFresh) {
          return parsed.stars;
        }
      }
    }
  } catch (_) {}

  // 2. Consultar la API de GitHub
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const stars = Number(data.stargazers_count);
      if (!isNaN(stars)) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            stars,
            timestamp: Date.now()
          }));
        } catch (_) {}
        return stars;
      }
    }
  } catch (_) {}

  // 3. Fallback: usar valor cacheado expirado o valor base
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.stars === 'number') {
        return parsed.stars;
      }
    }
  } catch (_) {}

  return DEFAULT_FALLBACK_STARS;
}

export function updateStarsUI(starsCount) {
  document.querySelectorAll('.github-stars-count').forEach(el => {
    el.textContent = String(starsCount);
  });
}

export async function initGitHubStars() {
  // Primero aplicar valor de caché o fallback síncronamente para evitar parpadeos
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.stars === 'number') {
        updateStarsUI(parsed.stars);
      }
    }
  } catch (_) {}

  // Obtener conteo fresco en segundo plano
  const stars = await fetchGitHubStars();
  updateStarsUI(stars);
}

// Auto-ejecución al cargar el DOM
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGitHubStars);
  } else {
    initGitHubStars();
  }
}
