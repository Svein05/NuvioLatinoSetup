/**
 * Catálogo Nativo y Motor de Datos de Avatares
 * Ecosistema Nuvio Metadata Latino & AIOMetadata
 * 
 * Estructura de carpetas: assets/profile_icons/{Estilo}/{Franquicia}/{Franquicia}_{Personaje}.{ext}
 */

import { CONFIG } from './config.js';

let currentCatalogCommitSha = null;

export function setCatalogCommitSha(sha) {
  if (sha && typeof sha === 'string') {
    currentCatalogCommitSha = sha.trim();
  }
}

export function getCatalogCommitSha() {
  return currentCatalogCommitSha;
}

/**
 * Resuelve la URL pública para cualquier avatar de profile_icons directamente desde GitHub (raw.githubusercontent.com)
 * Asegura sincronización 100% en tiempo real directamente desde el repositorio en la nube,
 * eliminando problemas de caché desfasada en CDNs de terceros (jsDelivr).
 */
export function resolveAvatarCdnUrl(avatarPath) {
  if (!avatarPath) return '';
  const trimmed = String(avatarPath).trim();
  if (/^data:image\//i.test(trimmed)) {
    return trimmed;
  }

  // Rutas relativas o URLs absolutas que apuntan a assets/profile_icons/
  if (trimmed.includes('assets/profile_icons/')) {
    const rawSub = trimmed.split('assets/profile_icons/')[1].replace(/^\/+/, '');
    // Decodificar primero para evitar doble codificación (%20 -> %2520)
    let cleanSub = rawSub;
    try {
      cleanSub = decodeURIComponent(rawSub);
    } catch (_) {}

    cleanSub = cleanSub.split('?')[0];
    const safeSub = cleanSub.split('/').map(seg => encodeURIComponent(seg)).join('/');
    const versionParam = currentCatalogCommitSha ? `?v=${currentCatalogCommitSha}` : '';
    return `https://raw.githubusercontent.com/${CONFIG.GITHUB_REPO}/main/assets/profile_icons/${safeSub}${versionParam}`;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    // Si viene de jsdelivr o dominio legacy que apunta a profile_icons, redirigir a GitHub raw
    if (trimmed.includes('cdn.jsdelivr.net') && trimmed.includes('/assets/profile_icons/')) {
      const rawSub = trimmed.split('/assets/profile_icons/')[1].replace(/^\/+/, '');
      let cleanSub = rawSub;
      try {
        cleanSub = decodeURIComponent(rawSub);
      } catch (_) {}
      cleanSub = cleanSub.split('?')[0];
      const safeSub = cleanSub.split('/').map(seg => encodeURIComponent(seg)).join('/');
      const versionParam = currentCatalogCommitSha ? `?v=${currentCatalogCommitSha}` : '';
      return `https://raw.githubusercontent.com/${CONFIG.GITHUB_REPO}/main/assets/profile_icons/${safeSub}${versionParam}`;
    }
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
  const clean = safeDecode(rawStyle)
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
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
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .trim();
}

let compiledAvatarsCache = null;
let rawRegistryCache = null;



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
    } else if (parts.length === 4) {
      // Archivo directo bajo la carpeta de estilo (assets/profile_icons/{style}/{file})
      const style = safeDecode(parts[2]);
      const franchise = 'General';
      const file = safeDecode(parts[3]);
      if (/\.(jpe?g|png|webp|svg)$/i.test(file) && !file.startsWith('.') && !/desktop\.ini$/i.test(file)) {
        const key = `${style}::${franchise}`;
        if (!map.has(key)) map.set(key, { style, franchise, files: [], isDirect: true });
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
    window.location.pathname.includes('/documentation/') ||
    window.location.pathname.includes('/modder/')
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

      // Quitar prefijo de franquicia ÚNICAMENTE si está explícitamente separado por guion bajo (_)
      let rawChar = baseName;
      const underscoreIdx = baseName.indexOf('_');
      const normFranchise = franchise.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (underscoreIdx !== -1) {
        const prefix = baseName.substring(0, underscoreIdx);
        const normPrefix = prefix.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normPrefix === normFranchise) {
          const stripped = baseName.substring(underscoreIdx + 1).trim();
          if (stripped.length > 0) {
            rawChar = stripped;
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
        relativePath: group.isDirect
          ? `${relPrefix}assets/profile_icons/${encodeURI(style)}/${encodeURI(fileName)}`
          : `${relPrefix}assets/profile_icons/${encodeURI(style)}/${encodeURI(franchise)}/${encodeURI(fileName)}`
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
  if (forceRefresh) {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('nuvio_avatars_tree_cache');
    }
    compiledAvatarsCache = null;
    rawRegistryCache = null;
  } else if (compiledAvatarsCache) {
    return compiledAvatarsCache;
  }

  // 1. PRIORIDAD ABSOLUTA: ÁRBOL REMOTO DE GITHUB (FUENTE DE VERDAD EN LA NUBE)
  // Conectamos siempre a GitHub para que los assets reflejen lo que está publicado y listo, sin depender de archivos locales
  try {
    const cachedTree = !forceRefresh && typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('nuvio_avatars_tree_cache') : null;
    let treeData = null;
    let cachedSha = null;

    if (cachedTree) {
      try {
        const parsed = JSON.parse(cachedTree);
        cachedSha = parsed.commitSha || null;
        if (parsed.timestamp && (Date.now() - parsed.timestamp < 1800000) && parsed.registry) {
          treeData = parsed.registry;
          if (cachedSha) setCatalogCommitSha(cachedSha);
        }
      } catch (_) {}
    }

    // Revalidación ultraligera contra el SHA más reciente del branch main en GitHub (~200 bytes)
    let latestSha = null;
    try {
      const shaRes = await fetch(`https://api.github.com/repos/${CONFIG.GITHUB_REPO}/git/ref/heads/main`, {
        cache: 'no-store',
        headers: { 'Accept': 'application/vnd.github.v3+json' },
        signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(3500) : undefined
      });
      if (shaRes.ok) {
        const shaJson = await shaRes.json();
        latestSha = shaJson.object?.sha || null;
        if (latestSha) setCatalogCommitSha(latestSha);
      }
    } catch (_) {
      // Si falla o no hay conexión / timeout, continuar fluidamente con treeData en caché
    }

    // Si detectamos un nuevo commit en main que difiere de la caché, la invalidamos automáticamente
    if (latestSha && (!cachedSha || latestSha !== cachedSha)) {
      treeData = null;
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('nuvio_avatars_tree_cache');
      }
    }

    if (!treeData) {
      const treeRef = latestSha || 'main';
      const ghUrl = `https://api.github.com/repos/${CONFIG.GITHUB_REPO}/git/trees/${treeRef}?recursive=1&_t=${Date.now()}`;
      const ghRes = await fetch(ghUrl, {
        cache: 'no-store',
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      if (ghRes.ok) {
        const ghJson = await ghRes.json();
        if (Array.isArray(ghJson.tree)) {
          treeData = parseGitHubTree(ghJson.tree);
          const finalSha = latestSha || ghJson.sha || null;
          if (finalSha) setCatalogCommitSha(finalSha);
          if (typeof sessionStorage !== 'undefined' && treeData.length > 0) {
            sessionStorage.setItem('nuvio_avatars_tree_cache', JSON.stringify({
              timestamp: Date.now(),
              commitSha: finalSha,
              registry: treeData
            }));
          }
        }
      } else {
        console.warn(`[AvatarsData] GitHub API respondió con código HTTP ${ghRes.status}`);
      }
    }

    if (treeData && treeData.length > 0) {
      rawRegistryCache = treeData;
      compiledAvatarsCache = compileRegistry(treeData);
      return compiledAvatarsCache;
    }
  } catch (err) {
    console.warn('[AvatarsData] No se pudo obtener árbol de GitHub, recurriendo a manifest remoto:', err);
  }

  // 2. FALLBACK REMOTO: Si la API REST de GitHub está en límite de tasa (403), descargar manifest.json directamente de raw.githubusercontent.com
  // NUNCA recurrir a carpetas locales de Live Server ni emular disco local.
  try {
    const rawManifestUrl = `https://raw.githubusercontent.com/${CONFIG.GITHUB_REPO}/main/assets/profile_icons/manifest.json?_t=${Date.now()}`;
    const mRes = await fetch(rawManifestUrl, { cache: 'no-store' });
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
    console.warn('[AvatarsData] Fallback remoto de manifest no disponible:', err);
  }

  rawRegistryCache = [];
  compiledAvatarsCache = [];
  return compiledAvatarsCache;
}

/**
 * Comparador universal de avatares con ordenamiento coherente:
 * 1. Compara por nombre de obra / franquicia (A-Z)
 * 2. Compara por nombre base de personaje (A-Z)
 * 3. Dentro de la misma obra y personaje, ordena por número de variación (1, 2, 3...)
 * 4. Si aún coinciden, ordena por estilo
 */
export function compareAvatars(a, b) {
  const franComp = a.franchiseName.localeCompare(b.franchiseName, 'es', { sensitivity: 'base' });
  if (franComp !== 0) return franComp;

  const baseA = a.baseCharacter || a.character;
  const baseB = b.baseCharacter || b.character;
  const charComp = baseA.localeCompare(baseB, 'es', { sensitivity: 'base' });
  if (charComp !== 0) return charComp;

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
 * Aplica de forma inmediata y en memoria las operaciones staged publicadas con éxito
 * garantizando que el catálogo se actualice instantáneamente sin desincronizaciones de caché.
 */
export function patchAvatarsAfterPublish({ addedFiles = [], replacedFiles = [], renamedFiles = [], deletedFiles = [] }) {
  if (!compiledAvatarsCache) {
    compiledAvatarsCache = getCompiledAvatars();
  }

  // 1. Eliminar archivos borrados
  if (deletedFiles && deletedFiles.length > 0) {
    const deletedPaths = new Set(deletedFiles.map(d => typeof d === 'string' ? d : d.path));
    compiledAvatarsCache = compiledAvatarsCache.filter(a => {
      const fullPath = `assets/profile_icons/${a.style}/${a.franchise}/${a.fileName}`;
      return !deletedPaths.has(fullPath) && !deletedPaths.has(a.path);
    });
  }

  // 2. Aplicar renombrados
  if (renamedFiles && renamedFiles.length > 0) {
    for (const ren of renamedFiles) {
      const oldPath = ren.oldPath;
      const item = compiledAvatarsCache.find(a => {
        const fullPath = `assets/profile_icons/${a.style}/${a.franchise}/${a.fileName}`;
        return fullPath === oldPath || a.fileName === ren.oldFilename;
      });
      if (item) {
        item.fileName = ren.newFilename;
        item.rawCharacter = ren.characterName || ren.newFilename.replace(/\.webp$/i, '');
        item.character = item.rawCharacter;
        item.baseCharacter = formatCharacterName(item.rawCharacter);
        item.id = `${item.style}_${item.franchise}_${item.rawCharacter}`;
        item.path = ren.newPath;
      }
    }
  }

  // 3. Aplicar reemplazos de imagen
  if (replacedFiles && replacedFiles.length > 0) {
    for (const rep of replacedFiles) {
      const item = compiledAvatarsCache.find(a => {
        const fullPath = `assets/profile_icons/${a.style}/${a.franchise}/${a.fileName}`;
        return fullPath === rep.path || a.fileName === rep.filename;
      });
      if (item && rep.base64) {
        item.path = `data:image/webp;base64,${rep.base64}`;
      }
    }
  }

  // 4. Agregar nuevos archivos
  if (addedFiles && addedFiles.length > 0) {
    const isSubfolder = typeof window !== 'undefined' && window.location.pathname.includes('/modder/');
    const relPrefix = isSubfolder ? '../' : './';
    for (const add of addedFiles) {
      const styleName = formatStyleName(add.style);
      const franchiseName = formatFranchiseName(add.franchise);
      const charName = add.characterName || add.filename.replace(/\.webp$/i, '');
      const imgUrl = add.base64 ? `data:image/webp;base64,${add.base64}` : `${relPrefix}${add.path}`;

      compiledAvatarsCache.push({
        id: `${add.style}_${add.franchise}_${charName}`,
        fileName: add.filename,
        character: charName,
        baseCharacter: formatCharacterName(charName),
        variationNumber: null,
        isVariation: false,
        rawCharacter: charName,
        franchise: add.franchise,
        franchiseName,
        style: add.style,
        styleName,
        path: imgUrl,
        extension: 'webp'
      });
    }
  }

  compiledAvatarsCache.sort(compareAvatars);
  return compiledAvatarsCache;
}


/**
 * Obtiene la lista de estilos únicos con sus contadores
 */
export function getStylesSummary(avatarsList = null) {
  const avatars = avatarsList || getCompiledAvatars();
  const map = new Map();

  // Estilos canónicos pre-registrados para garantizar su disponibilidad inmediata en filtros
  const canonicalStyles = ['NetflixStyle', 'IconsStyle', 'MangaStyle'];
  for (const s of canonicalStyles) {
    map.set(s, 0);
  }

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
