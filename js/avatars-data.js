/**
 * Catálogo Nativo y Motor de Datos de Avatares
 * Ecosistema Nuvio Metadata Latino & AIOMetadata
 * 
 * Estructura de carpetas: assets/profile_icons/{Estilo}/{Franquicia}/{Franquicia}_{Personaje}.{ext}
 */

import { CONFIG } from './config.js';

/**
 * Resuelve la URL pública para cualquier avatar de profile_icons mediante jsDelivr CDN
 */
export function resolveAvatarCdnUrl(avatarPath) {
  if (!avatarPath) return '';
  const trimmed = String(avatarPath).trim();
  // Migración automática de enlaces raw de GitHub a jsDelivr CDN
  if (trimmed.includes('raw.githubusercontent.com') && trimmed.includes('/assets/profile_icons/')) {
    const sub = trimmed.split('/assets/profile_icons/')[1];
    if (sub) {
      return `https://cdn.jsdelivr.net/gh/${CONFIG.GITHUB_REPO}@main/assets/profile_icons/${sub}`;
    }
  }
  if (trimmed.includes('assets/profile_icons/')) {
    const subPath = trimmed.split('assets/profile_icons/')[1];
    if (subPath) {
      return `https://cdn.jsdelivr.net/gh/${CONFIG.GITHUB_REPO}@main/assets/profile_icons/${subPath}`;
    }
  }
  if (/^https?:\/\//i.test(trimmed) || /^data:image\//i.test(trimmed)) {
    return trimmed;
  }
  return trimmed;
}

// Formateadores universales y limpios (sin diccionarios ni listas fijas)
function safeDecode(str) {
  if (!str) return '';
  try {
    return decodeURIComponent(str);
  } catch (_) {
    return str;
  }
}

export function formatStyleName(rawStyle) {
  if (!rawStyle || rawStyle === 'all') return 'Todos los estilos';
  return safeDecode(rawStyle).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
}

export function formatFranchiseName(rawFranchise) {
  if (!rawFranchise || rawFranchise === 'all') return 'Todas las obras';
  return safeDecode(rawFranchise).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
}

export function formatCharacterName(rawName) {
  if (!rawName) return 'Desconocido';
  return safeDecode(rawName)
    .replace(/_/g, ' ')
    .replace(/\.([A-Za-z])/g, '. $1')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
}

let compiledAvatarsCache = null;
let rawRegistryCache = null;

/**
 * Rastreador asíncrono dinámico para entornos locales (Live Server / Python)
 * Lee los directorios HTML automáticos de assets/profile_icons/ sin tocar código.
 */
async function crawlLocalAvatars() {
  const origin = window.location.origin;
  const basePath = '/assets/profile_icons/';
  const rootUrl = `${origin}${basePath}`;
  
  const rootRes = await fetch(rootUrl, { cache: 'no-cache' });
  if (!rootRes.ok) return null;
  const rootText = await rootRes.text();
  const rootLinks = extractChildLinks(rootText, basePath);
  if (!rootLinks || rootLinks.length === 0) return null;

  // Filtrar estilos (carpetas sin punto de extensión)
  const styles = rootLinks.filter(l => !l.includes('.') && l !== '..' && l !== '');
  if (styles.length === 0) return null;

  const registry = [];

  for (const style of styles) {
    const stylePath = `${basePath}${encodeURIComponent(style)}/`;
    try {
      const styleRes = await fetch(`${origin}${stylePath}`, { cache: 'no-cache' });
      if (!styleRes.ok) continue;
      const styleText = await styleRes.text();
      const franchiseLinks = extractChildLinks(styleText, stylePath);
      const franchises = franchiseLinks.filter(l => !l.includes('.') && l !== '..' && l !== '');

      for (const franchise of franchises) {
        const franchisePath = `${stylePath}${encodeURIComponent(franchise)}/`;
        try {
          const franRes = await fetch(`${origin}${franchisePath}`, { cache: 'no-cache' });
          if (!franRes.ok) continue;
          const franText = await franRes.text();
          const fileLinks = extractChildLinks(franText, franchisePath);
          const files = fileLinks.filter(f => /\.(jpe?g|png|webp|svg)$/i.test(f) && !f.startsWith('.') && !/desktop\.ini$/i.test(f));

          if (files.length > 0) {
            registry.push({
              style,
              franchise,
              files
            });
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  return registry.length > 0 ? registry : null;
}

function extractChildLinks(htmlText, currentDirectoryPath) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const links = [];
    const cleanDir = currentDirectoryPath.endsWith('/') ? currentDirectoryPath : `${currentDirectoryPath}/`;

    doc.querySelectorAll('a').forEach(a => {
      let rawHref = (a.getAttribute('href') || '').trim();
      if (!rawHref || rawHref === '#' || rawHref.startsWith('?') || rawHref === '..') return;

      let resolvedPath = '';
      try {
        const u = new URL(rawHref, (typeof window !== 'undefined' ? window.location.origin : 'http://localhost') + cleanDir);
        resolvedPath = u.pathname;
      } catch (_) {
        resolvedPath = rawHref;
      }

      if (!resolvedPath.startsWith(cleanDir) || resolvedPath === cleanDir) return;

      let sub = resolvedPath.substring(cleanDir.length).replace(/\/+$/, '');
      if (!sub || sub.includes('/')) return;

      try {
        sub = decodeURIComponent(sub);
      } catch (_) {}

      if (!links.includes(sub)) {
        links.push(sub);
      }
    });
    return links;
  } catch (_) {
    return [];
  }
}

function parseGitHubTree(tree) {
  const map = new Map();
  for (const item of tree) {
    if (item.type !== 'blob' || !item.path.startsWith('assets/profile_icons/')) continue;
    const parts = item.path.split('/');
    if (parts.length === 5) {
      const style = safeDecode(parts[2]);
      const franchise = safeDecode(parts[3]);
      const file = safeDecode(parts[4]);
      if (/\.(jpe?g|png|webp|svg)$/i.test(file) && !file.startsWith('.') && !/desktop\.ini$/i.test(file)) {
        const key = `${style}::${franchise}`;
        if (!map.has(key)) map.set(key, { style, franchise, files: [] });
        map.get(key).files.push(file);
      }
    }
  }
  return Array.from(map.values());
}

/**
 * Normaliza y compila una lista de carpetas y archivos en el catálogo plano con variaciones
 */
export function compileRegistry(registry) {
  const list = [];
  const isSubfolder = typeof window !== 'undefined' && (
    window.location.pathname.includes('/account/') || 
    window.location.pathname.includes('/configuration/') || 
    window.location.pathname.includes('/documentation/')
  );
  const relPrefix = isSubfolder ? '../' : './';

  for (const group of registry) {
    const { style, franchise, files } = group;
    const styleName = formatStyleName(style);
    const franchiseName = formatFranchiseName(franchise);

    const rawItems = [];
    for (const fileName of files) {
      if (/desktop\.ini$/i.test(fileName) || fileName.startsWith('.')) continue;

      const dotIndex = fileName.lastIndexOf('.');
      const baseName = dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;
      const extension = dotIndex !== -1 ? fileName.substring(dotIndex + 1).toLowerCase() : '';

      // Quitar prefijo de franquicia si el archivo fue nombrado {Franquicia}_{Personaje}
      let rawChar = baseName;
      const underscoreIdx = baseName.indexOf('_');
      const normFranchise = franchise.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (underscoreIdx !== -1) {
        const prefix = baseName.substring(0, underscoreIdx);
        const normPrefix = prefix.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normPrefix === normFranchise) {
          rawChar = baseName.substring(underscoreIdx + 1);
        }
      } else {
        const cleanBase = baseName.trim();
        const normBase = cleanBase.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normBase.startsWith(normFranchise)) {
          const escaped = franchise.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`^${escaped}[_\\-\\s]*`, 'i');
          if (regex.test(cleanBase)) {
            rawChar = cleanBase.replace(regex, '');
          }
        }
      }

      let baseChar = '';
      let variationNum = 1;

      const numMatch = rawChar.match(/^(.*?)(?:[_\-\s]|\s*\()?(\d+)\)?$/);
      if (numMatch && numMatch[1] && numMatch[1].trim()) {
        baseChar = formatCharacterName(numMatch[1].trim());
        variationNum = parseInt(numMatch[2], 10);
      } else {
        baseChar = formatCharacterName(rawChar);
        variationNum = 1;
      }

      rawItems.push({
        fileName,
        rawChar,
        baseChar,
        variationNum,
        extension,
        relativePath: `${relPrefix}assets/profile_icons/${encodeURI(style)}/${encodeURI(franchise)}/${encodeURI(fileName)}`
      });
    }

    const baseMap = new Map();
    for (const item of rawItems) {
      if (!baseMap.has(item.baseChar)) {
        baseMap.set(item.baseChar, []);
      }
      baseMap.get(item.baseChar).push(item);
    }

    for (const [baseChar, items] of baseMap.entries()) {
      const hasVariations = items.length > 1;
      items.sort((a, b) => a.variationNum - b.variationNum);

      items.forEach((item, idx) => {
        const finalCharacterName = hasVariations ? `${item.baseChar} (${idx + 1})` : item.baseChar;
        const variationNumber = hasVariations ? idx + 1 : null;

        list.push({
          id: `${style}_${franchise}_${item.rawChar}`,
          fileName: item.fileName,
          character: finalCharacterName,
          baseCharacter: item.baseChar,
          variationNumber,
          isVariation: hasVariations,
          rawCharacter: item.rawChar,
          franchise,
          franchiseName,
          style,
          styleName,
          path: item.relativePath,
          extension: item.extension
        });
      });
    }
  }

  list.sort(compareAvatars);
  return list;
}

/**
 * Carga el catálogo dinámicamente según el entorno:
 * 1. Local (Live Server / Python): Crawling automático de directorios HTML
 * 2. Remoto (GitHub Pages / Prod): GitHub Trees API con caché en sessionStorage
 * 3. Fallback: assets/profile_icons/manifest.json
 * 4. Fallback final: semilla interna
 */
export async function loadAvatarsCatalog(forceRefresh = false) {
  if (compiledAvatarsCache && !forceRefresh) {
    return compiledAvatarsCache;
  }

  const isLocal = typeof window !== 'undefined' && ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);

  if (isLocal) {
    try {
      const localRegistry = await crawlLocalAvatars();
      if (localRegistry && localRegistry.length > 0) {
        rawRegistryCache = localRegistry;
        compiledAvatarsCache = compileRegistry(localRegistry);
        return compiledAvatarsCache;
      }
    } catch (err) {
      console.warn('[AvatarsData] No se pudo rastrear directorio local dinámico, probando fallback:', err);
    }
  }

  try {
    const cachedTree = !forceRefresh && typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('nuvio_avatars_tree_cache') : null;
    let treeData = null;
    if (cachedTree) {
      try {
        const parsed = JSON.parse(cachedTree);
        if (parsed.timestamp && (Date.now() - parsed.timestamp < 3600000) && parsed.registry) {
          treeData = parsed.registry;
        }
      } catch (_) {}
    }

    if (!treeData) {
      const ghRes = await fetch(`https://api.github.com/repos/${CONFIG.GITHUB_REPO}/git/trees/main?recursive=1`, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      if (ghRes.ok) {
        const ghJson = await ghRes.json();
        if (Array.isArray(ghJson.tree)) {
          treeData = parseGitHubTree(ghJson.tree);
          if (typeof sessionStorage !== 'undefined' && treeData.length > 0) {
            sessionStorage.setItem('nuvio_avatars_tree_cache', JSON.stringify({
              timestamp: Date.now(),
              registry: treeData
            }));
          }
        }
      }
    }

    if (treeData && treeData.length > 0) {
      rawRegistryCache = treeData;
      compiledAvatarsCache = compileRegistry(treeData);
      return compiledAvatarsCache;
    }
  } catch (err) {
    console.warn('[AvatarsData] No se pudo obtener árbol de GitHub:', err);
  }

  try {
    const isSubfolder = typeof window !== 'undefined' && (
      window.location.pathname.includes('/account/') || 
      window.location.pathname.includes('/configuration/') || 
      window.location.pathname.includes('/documentation/')
    );
    const manifestPath = isSubfolder ? '../assets/profile_icons/manifest.json' : './assets/profile_icons/manifest.json';
    const mRes = await fetch(manifestPath, { cache: forceRefresh ? 'no-cache' : 'default' });
    if (mRes.ok) {
      const mJson = await mRes.json();
      if (Array.isArray(mJson.styles)) {
        const manifestRegistry = [];
        for (const s of mJson.styles) {
          for (const f of s.franchises || []) {
            manifestRegistry.push({
              style: s.style,
              franchise: f.franchise,
              files: f.files || []
            });
          }
        }
        if (manifestRegistry.length > 0) {
          rawRegistryCache = manifestRegistry;
          compiledAvatarsCache = compileRegistry(manifestRegistry);
          return compiledAvatarsCache;
        }
      }
    }
  } catch (err) {
    console.warn('[AvatarsData] Fallback manifest.json no disponible:', err);
  }

  rawRegistryCache = [];
  compiledAvatarsCache = [];
  return compiledAvatarsCache;
}

/**
 * Comparador universal de avatares con ordenamiento coherente:
 * 1. Compara por nombre base de personaje (A-Z)
 * 2. Si es el mismo personaje, AGRUPA Y ORDENA POR OBRA / FRANQUICIA (A-Z) para dar sentido
 * 3. Dentro de la misma obra, ordena por número de variación (1, 2, 3...)
 * 4. Si aún coinciden, ordena por estilo
 */
export function compareAvatars(a, b) {
  const baseA = a.baseCharacter || a.character;
  const baseB = b.baseCharacter || b.character;
  const charComp = baseA.localeCompare(baseB, 'es', { sensitivity: 'base' });
  if (charComp !== 0) return charComp;

  const franComp = a.franchiseName.localeCompare(b.franchiseName, 'es', { sensitivity: 'base' });
  if (franComp !== 0) return franComp;

  const numA = a.variationNumber || 0;
  const numB = b.variationNumber || 0;
  if (numA !== numB) return numA - numB;

  const styleComp = a.styleName.localeCompare(b.styleName, 'es', { sensitivity: 'base' });
  if (styleComp !== 0) return styleComp;

  return a.character.localeCompare(b.character, 'es', { sensitivity: 'base' });
}

/**
 * Compila y normaliza todos los avatares en un catálogo plano enriquecido
 */
export function getCompiledAvatars() {
  if (compiledAvatarsCache) return compiledAvatarsCache;
  if (rawRegistryCache && rawRegistryCache.length > 0) {
    compiledAvatarsCache = compileRegistry(rawRegistryCache);
    return compiledAvatarsCache;
  }
  return [];
}

/**
 * Obtiene la lista de estilos únicos con sus contadores
 */
export function getStylesSummary(avatarsList = null) {
  const avatars = avatarsList || getCompiledAvatars();
  const map = new Map();

  for (const av of avatars) {
    map.set(av.style, (map.get(av.style) || 0) + 1);
  }

  const result = [{ id: 'all', name: 'Todos los estilos', count: avatars.length }];
  for (const [styleId, count] of map.entries()) {
    result.push({
      id: styleId,
      name: formatStyleName(styleId),
      count
    });
  }

  return result;
}

/**
 * Obtiene la lista de franquicias únicas con sus contadores, ordenadas alfabéticamente
 */
export function getFranchisesSummary(selectedStyle = 'all', avatarsList = null) {
  const allAvatars = avatarsList || getCompiledAvatars();
  const filtered = selectedStyle === 'all' 
    ? allAvatars 
    : allAvatars.filter(a => a.style === selectedStyle);

  const map = new Map();
  for (const av of filtered) {
    map.set(av.franchise, (map.get(av.franchise) || 0) + 1);
  }

  const franchiseEntries = [];
  for (const [franchiseId, count] of map.entries()) {
    franchiseEntries.push({
      id: franchiseId,
      name: formatFranchiseName(franchiseId),
      count
    });
  }

  // Ordenar alfabéticamente por nombre de la obra
  franchiseEntries.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

  return [
    { id: 'all', name: 'Todas las obras', count: filtered.length },
    ...franchiseEntries
  ];
}

/**
 * Filtro multicriterio de avatares con priorización inteligente:
 * - Prioridad 1: Personajes (si buscas "naruto", muestra solo a Naruto, no a toda la serie).
 * - Prioridad 2: Obra completa (solo si la búsqueda es específica de la obra ej: "naruto shippuden" o no hay personajes).
 * - Soporte de prefijos opcionales:
 *     pj: Naruto  -> búsqueda forzada por personaje
 *     ob: Naruto  -> búsqueda forzada por obra/serie
 */
export function filterAvatars({ style = 'all', franchise = 'all', query = '' }, avatarsList = null) {
  const avatars = avatarsList || getCompiledAvatars();
  let cleanQ = String(query || '').trim().toLowerCase();

  // Filtrado base por estilo y franquicia seleccionados
  let baseList = avatars.filter(item => {
    if (style !== 'all' && item.style !== style) return false;
    if (franchise !== 'all' && item.franchise !== franchise) return false;
    return true;
  });

  if (!cleanQ) {
    return baseList.sort(compareAvatars);
  }

  // Detección de prefijos opcionales
  let forceMode = null;
  if (/^(pj|personaje|char):/i.test(cleanQ)) {
    forceMode = 'character';
    cleanQ = cleanQ.replace(/^(pj|personaje|char):\s*/i, '').trim();
  } else if (/^(ob|obra|serie|fran):/i.test(cleanQ)) {
    forceMode = 'franchise';
    cleanQ = cleanQ.replace(/^(ob|obra|serie|fran):\s*/i, '').trim();
  }

  // Modo forzado por prefijo
  if (forceMode === 'character') {
    return baseList.filter(item => 
      item.character.toLowerCase().includes(cleanQ) || 
      (item.baseCharacter && item.baseCharacter.toLowerCase().includes(cleanQ))
    ).sort(compareAvatars);
  }

  if (forceMode === 'franchise') {
    return baseList.filter(item => item.franchiseName.toLowerCase().includes(cleanQ))
      .sort(compareAvatars);
  }

  // Búsqueda general sin prefijo: PRIORIZAR PERSONAJE ANTE OBRA
  const characterMatches = baseList.filter(item => 
    item.character.toLowerCase().includes(cleanQ) || 
    (item.baseCharacter && item.baseCharacter.toLowerCase().includes(cleanQ))
  );

  if (characterMatches.length > 0) {
    // Si la búsqueda coincide con un personaje directamente, devolver ÚNICAMENTE los personajes
    // a menos que la búsqueda sea extensa y específica de la obra (con espacios o >= 10 caracteres)
    const isExplicitFranchiseSearch = cleanQ.length >= 10 || cleanQ.includes(' ');
    
    if (!isExplicitFranchiseSearch) {
      return characterMatches.sort(compareAvatars);
    }

    const franchiseMatches = baseList.filter(item => item.franchiseName.toLowerCase().includes(cleanQ));
    const seen = new Set(characterMatches.map(m => m.id));
    const combined = [...characterMatches];
    franchiseMatches.forEach(fm => {
      if (!seen.has(fm.id)) {
        seen.add(fm.id);
        combined.push(fm);
      }
    });

    return combined.sort((a, b) => {
      const aChar = a.character.toLowerCase().includes(cleanQ) || (a.baseCharacter && a.baseCharacter.toLowerCase().includes(cleanQ));
      const bChar = b.character.toLowerCase().includes(cleanQ) || (b.baseCharacter && b.baseCharacter.toLowerCase().includes(cleanQ));
      if (aChar && !bChar) return -1;
      if (!aChar && bChar) return 1;
      return compareAvatars(a, b);
    });
  }

  // Si ningún personaje coincide, buscar coincidencias en el nombre de la franquicia
  const franchiseMatches = baseList.filter(item => item.franchiseName.toLowerCase().includes(cleanQ));
  return franchiseMatches.sort(compareAvatars);
}
