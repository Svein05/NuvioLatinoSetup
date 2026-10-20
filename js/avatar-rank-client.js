/**
 * Cliente de Ranking Global de Avatares Más Usados (Upstash Redis)
 * Nuvio Latino Setup - Arquitectura Jamstack / GitHub Pages ($0 Costo)
 */

const STORAGE_KEYS = {
  CACHED_TOP: 'nuvio_avatar_ranks_cached_top',
  CACHED_TS: 'nuvio_avatar_ranks_cached_ts',
  SESSION_PREFIX: 'nuvio_avatar_voted_'
};

// Avatares base icónicos de respaldo para garantizar que la fila nunca esté vacía desde el primer día
export const BASELINE_TOP_AVATARS = [
  'NetflixStyle/One Piece/OnePiece_MonkeyDLuffy1.webp',
  'NetflixStyle/Naruto Shippuden/NarutoShippuden_NarutoUzumaki.webp',
  'MangaStyle/Jujutsu Kaisen/Gojo.webp',
  'MangaStyle/Black Clover/Asta2.webp',
  'NetflixStyle/X-Men 97/X-men97_Wolverine1.webp',
  'NetflixStyle/One Piece/OnePiece_RoronoaZoro.webp',
  'NetflixStyle/Naruto Shippuden/NarutoShippuden_KakashiHatake.webp',
  'NetflixStyle/Soul Eater/Maka Albarn (1).webp'
];

let cachedConfig = null;

/**
 * Adaptador heredado pendiente del Worker: configuración local o en localStorage.
 */
export async function getAvatarRankConfig() {
  if (cachedConfig) return cachedConfig;

  // 1. Configuración local ignorada; excluida del build público.
  try {
    const localModule = await import('./avatar-rank-config.local.js');
    if (localModule?.LOCAL_AVATAR_RANK_CONFIG?.url && localModule?.LOCAL_AVATAR_RANK_CONFIG?.token) {
      cachedConfig = localModule.LOCAL_AVATAR_RANK_CONFIG;
      return cachedConfig;
    }
  } catch (_) {}

  // 2. Fallback en localStorage
  try {
    const url = localStorage.getItem('nuvio_avatar_rank_url');
    const token = localStorage.getItem('nuvio_avatar_rank_token');
    if (url && token) {
      cachedConfig = { url, token };
      return cachedConfig;
    }
  } catch (_) {}

  return null;
}

/**
 * Normaliza cualquier ruta de avatar a su clave canónica de almacenamiento
 * Ej: "../assets/profile_icons/NetflixStyle/One Piece/Luffy.webp" -> "NetflixStyle/One Piece/Luffy.webp"
 */
export function normalizeAvatarStorageKey(rawPath) {
  if (!rawPath) return '';
  let clean = String(rawPath).trim();
  const marker = 'assets/profile_icons/';
  const idx = clean.indexOf(marker);
  if (idx !== -1) {
    clean = clean.substring(idx + marker.length);
  }
  // Decodificar si viene con codificación URI
  try {
    clean = decodeURI(clean);
  } catch (_) {}
  return clean;
}

/**
 * Obtiene las claves del Top 8 de avatares más usados globalmente con sus puntuaciones de uso
 * Devuelve un array de objetos: [ { key: string, score: number }, ... ]
 */
export async function fetchTopAvatarKeys(limit = 8) {
  const config = await getAvatarRankConfig();

  if (config?.url && config?.token) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);

      // Comando ZREVRANGE avatar_ranks 0 (limit - 1) WITHSCORES
      const res = await fetch(`${config.url.replace(/\/+$/, '')}/zrevrange/avatar_ranks/0/${limit - 1}/WITHSCORES`, {
        headers: {
          'Authorization': `Bearer ${config.token}`
        },
        signal: controller.signal
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data?.result) ? data.result : [];
        const topList = [];

        // Parsear pares [key, score, key, score, ...] devueltos por Redis
        for (let i = 0; i < rawList.length; i += 2) {
          const key = rawList[i];
          const score = parseInt(rawList[i + 1], 10) || 0;
          if (key) {
            topList.push({ key, score });
          }
        }

        // Si hay menos del límite, combinamos con el baseline con score 0 evitando duplicados
        const combined = [...topList];
        for (const baseItem of BASELINE_TOP_AVATARS) {
          if (!combined.some(item => item.key === baseItem) && combined.length < limit) {
            combined.push({ key: baseItem, score: 0 });
          }
        }
        const finalTop = combined.slice(0, limit);
        saveLocalCache(finalTop);
        return finalTop;
      }
    } catch (err) {
      console.warn('[AvatarRank] Fallo al consultar Upstash Redis:', err.message);
    }
  }

  // Fallback: Retornar caché local o baseline con score 0
  const cached = getLocalCache();
  if (cached && cached.length > 0) return cached;
  return BASELINE_TOP_AVATARS.slice(0, limit).map(key => ({ key, score: 0 }));
}

/**
 * Registra el uso de un avatar cuando el usuario guarda cambios en su perfil.
 * Implementa protección anti-spam por sesión para no duplicar votos consecutivamente.
 */
export async function recordAvatarUsage(rawPath) {
  const key = normalizeAvatarStorageKey(rawPath);
  if (!key) return;

  // Control anti-spam: máximo 1 voto por avatar por sesión de navegador
  const sessionKey = `${STORAGE_KEYS.SESSION_PREFIX}${key}`;
  try {
    if (sessionStorage.getItem(sessionKey) === 'true') {
      return;
    }
  } catch (_) {}

  const config = await getAvatarRankConfig();
  if (!config?.url || !config?.token) return;

  try {
    // Comando ZINCRBY avatar_ranks 1 key
    const url = config.url.replace(/\/+$/, '');
    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(['ZINCRBY', 'avatar_ranks', 1, key]),
      keepalive: true
    });

    try {
      sessionStorage.setItem(sessionKey, 'true');
      // Invalidar caché local para que la próxima lectura refresque el ranking
      localStorage.removeItem(STORAGE_KEYS.CACHED_TOP);
    } catch (_) {}
  } catch (err) {
    console.warn('[AvatarRank] Error al registrar uso:', err.message);
  }
}

function saveLocalCache(list) {
  try {
    localStorage.setItem(STORAGE_KEYS.CACHED_TOP, JSON.stringify(list));
    localStorage.setItem(STORAGE_KEYS.CACHED_TS, Date.now().toString());
  } catch (_) {}
}

function getLocalCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CACHED_TOP);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(item => {
          if (typeof item === 'string') return { key: item, score: 0 };
          return { key: item.key || '', score: Number(item.score) || 0 };
        });
      }
    }
  } catch (_) {}
  return null;
}
