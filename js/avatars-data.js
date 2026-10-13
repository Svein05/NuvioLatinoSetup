/**
 * Catálogo Nativo y Motor de Datos de Avatares
 * Ecosistema Nuvio Metadata Latino & AIOMetadata
 * 
 * Estructura de carpetas: assets/profile_icons/{Estilo}/{Franquicia}/{Franquicia}_{Personaje}.{ext}
 */

// Nombres amigables para estilos y franquicias
export const AVATAR_STYLE_LABELS = {
  all: 'Todos los estilos',
  NetflixStyle: 'Estilo Netflix',
  IconsStyle: 'Estilo Íconos'
};

export const AVATAR_FRANCHISE_LABELS = {
  all: 'Todas las obras',
  Naruto: 'Naruto',
  NarutoShippuden: 'Naruto Shippuden',
  OnePiece: 'One Piece'
};

// Formateador de nombres de personajes
const CHARACTER_NAME_OVERRIDES = {
  Rock: 'Rock Lee',
  Sae: 'Sai',
  Sasori1: 'Sasori (Humano)',
  Sasori2: 'Sasori (Marioneta)',
  Luffy1: 'Monkey D. Luffy',
  Luffy2: 'Luffy (Capitán)',
  GoingMerry: 'Going Merry',
  ThousandSunny: 'Thousand Sunny'
};

export function formatCharacterName(rawName) {
  if (!rawName) return 'Desconocido';
  if (CHARACTER_NAME_OVERRIDES[rawName]) {
    return CHARACTER_NAME_OVERRIDES[rawName];
  }
  // Separar camelCase y números (ej: GoingMerry -> Going Merry, Naruto2 -> Naruto 2)
  return rawName
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([a-zA-Z])(\d+)/g, '$1 $2')
    .trim();
}

export function formatFranchiseName(rawFranchise) {
  if (!rawFranchise) return '';
  if (AVATAR_FRANCHISE_LABELS[rawFranchise]) {
    return AVATAR_FRANCHISE_LABELS[rawFranchise];
  }
  return rawFranchise.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
}

export function formatStyleName(rawStyle) {
  if (!rawStyle) return '';
  if (AVATAR_STYLE_LABELS[rawStyle]) {
    return AVATAR_STYLE_LABELS[rawStyle];
  }
  return rawStyle.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
}

/**
 * Registro maestro de archivos existentes en assets/profile_icons/
 * Cada entrada define: estilo, franquicia y la lista de archivos detectados.
 */
export const RAW_AVATAR_REGISTRY = [
  {
    style: "IconsStyle",
    franchise: "Naruto",
    files: [
      "Naruto_Naruto.jpg",
      "Naruto_Naruto2.jpg"
    ]
  },
  {
    style: "IconsStyle",
    franchise: "NarutoShippuden",
    files: [
      "NarutoShippuden_Naruto.jpg"
    ]
  },
  {
    style: "NetflixStyle",
    franchise: "NarutoShippuden",
    files: [
      "NarutoShippuden_Anko.png",
      "NarutoShippuden_Asuma.png",
      "NarutoShippuden_Baki.png",
      "NarutoShippuden_Choji.png",
      "NarutoShippuden_Deidara.png",
      "NarutoShippuden_Gaara.png",
      "NarutoShippuden_Gai.png",
      "NarutoShippuden_Hidan.png",
      "NarutoShippuden_Hinata.png",
      "NarutoShippuden_Ino.png",
      "NarutoShippuden_Itachi.png",
      "NarutoShippuden_Jiraiya.png",
      "NarutoShippuden_Kabuto.png",
      "NarutoShippuden_Kakashi.png",
      "NarutoShippuden_Kankuro.png",
      "NarutoShippuden_Kiba.png",
      "NarutoShippuden_Kisame.png",
      "NarutoShippuden_Kurenai.png",
      "NarutoShippuden_Naruto.png",
      "NarutoShippuden_Neji.png",
      "NarutoShippuden_Orochimaru.png",
      "NarutoShippuden_Rock.png",
      "NarutoShippuden_Sae.png",
      "NarutoShippuden_Sakura.png",
      "NarutoShippuden_Sasori1.png",
      "NarutoShippuden_Sasori2.png",
      "NarutoShippuden_Sasuke.png",
      "NarutoShippuden_Shikamaru.png",
      "NarutoShippuden_Shino.png",
      "NarutoShippuden_Temari.png",
      "NarutoShippuden_Tsunade.png",
      "NarutoShippuden_Yamato.png"
    ]
  },
  {
    style: "NetflixStyle",
    franchise: "OnePiece",
    files: [
      "OnePiece_Brook.png",
      "OnePiece_Chopper.png",
      "OnePiece_Franky.png",
      "OnePiece_GoingMerry.jpeg",
      "OnePiece_Jinbe.png",
      "OnePiece_Luffy1.png",
      "OnePiece_Luffy2.png",
      "OnePiece_Nami.png",
      "OnePiece_Robin.png",
      "OnePiece_Sanji.png",
      "OnePiece_ThousandSunny.jpeg",
      "OnePiece_Usopp.jpeg",
      "OnePiece_Zoro.png"
    ]
  }
];

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

  // Si coinciden en personaje, agrupar estrictamente por Obra
  const franComp = a.franchiseName.localeCompare(b.franchiseName, 'es', { sensitivity: 'base' });
  if (franComp !== 0) return franComp;

  // Dentro de la misma obra, ordenar por número de variación (1, 2, 3...)
  const numA = a.variationNumber || 0;
  const numB = b.variationNumber || 0;
  if (numA !== numB) return numA - numB;

  // Ordenar por estilo
  const styleComp = a.styleName.localeCompare(b.styleName, 'es', { sensitivity: 'base' });
  if (styleComp !== 0) return styleComp;

  return a.character.localeCompare(b.character, 'es', { sensitivity: 'base' });
}

/**
 * Compila y normaliza todos los avatares en un catálogo plano enriquecido
 * - Detecta automáticamente variaciones de un mismo personaje dentro de una obra (ej: Naruto (1), Naruto (2))
 * - Aplica el número entre paréntesis ÚNICAMENTE cuando ese personaje tiene 2 o más variaciones en esa serie
 */
export function getCompiledAvatars() {
  const list = [];

  for (const group of RAW_AVATAR_REGISTRY) {
    const { style, franchise, files } = group;
    const styleName = formatStyleName(style);
    const franchiseName = formatFranchiseName(franchise);

    // 1. Extraer los datos crudos de cada archivo
    const rawItems = [];
    for (const fileName of files) {
      if (/desktop\.ini$/i.test(fileName) || fileName.startsWith('.')) continue;

      const dotIndex = fileName.lastIndexOf('.');
      const baseName = dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;
      const extension = dotIndex !== -1 ? fileName.substring(dotIndex + 1).toLowerCase() : '';

      let rawChar = baseName;
      if (baseName.startsWith(`${franchise}_`)) {
        rawChar = baseName.substring(franchise.length + 1);
      }

      // Detectar si tiene override explícito o sufijo numérico
      let baseChar = '';
      let variationNum = 1;
      let hasExplicitOverride = false;

      if (CHARACTER_NAME_OVERRIDES[rawChar]) {
        baseChar = CHARACTER_NAME_OVERRIDES[rawChar];
        hasExplicitOverride = true;
      } else {
        const numMatch = rawChar.match(/^(.*?)(?:_|-|\s)?(\d+)$/);
        if (numMatch && numMatch[1]) {
          baseChar = formatCharacterName(numMatch[1]);
          variationNum = parseInt(numMatch[2], 10);
        } else {
          baseChar = formatCharacterName(rawChar);
          variationNum = 1;
        }
      }

      rawItems.push({
        fileName,
        rawChar,
        baseChar,
        variationNum,
        hasExplicitOverride,
        extension,
        relativePath: `../assets/profile_icons/${style}/${franchise}/${fileName}`
      });
    }

    // 2. Agrupar por baseChar dentro de esta obra y estilo para detectar variaciones
    const baseMap = new Map();
    for (const item of rawItems) {
      if (!baseMap.has(item.baseChar)) {
        baseMap.set(item.baseChar, []);
      }
      baseMap.get(item.baseChar).push(item);
    }

    // 3. Asignar nombres finales: "Personaje (1)", "Personaje (2)" SOLO si hay variaciones (> 1)
    for (const [baseChar, items] of baseMap.entries()) {
      const hasVariations = items.length > 1;

      // Ordenar las variaciones por variationNum ascendente
      items.sort((a, b) => a.variationNum - b.variationNum);

      items.forEach((item, idx) => {
        let finalCharacterName = '';
        let variationNumber = null;

        if (item.hasExplicitOverride) {
          finalCharacterName = item.baseChar;
        } else if (hasVariations) {
          finalCharacterName = `${item.baseChar} (${idx + 1})`;
          variationNumber = idx + 1;
        } else {
          finalCharacterName = item.baseChar;
          variationNumber = null;
        }

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

  // Ordenar catálogo con el comparador coherente (por personaje, obra, variación y estilo)
  list.sort(compareAvatars);
  return list;
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
