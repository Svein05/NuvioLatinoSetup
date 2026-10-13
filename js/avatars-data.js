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
  // Separar camelCase si aplica (ej: GoingMerry -> Going Merry)
  return rawName.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
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
  // 1. IconsStyle
  {
    style: 'IconsStyle',
    franchise: 'NarutoShippuden',
    files: [
      'NarutoShippuden_Naruto.jpg'
    ]
  },

  // 2. NetflixStyle
  {
    style: 'NetflixStyle',
    franchise: 'NarutoShippuden',
    files: [
      'NarutoShippuden_Anko.png',
      'NarutoShippuden_Asuma.png',
      'NarutoShippuden_Baki.png',
      'NarutoShippuden_Choji.png',
      'NarutoShippuden_Deidara.png',
      'NarutoShippuden_Gaara.png',
      'NarutoShippuden_Gai.png',
      'NarutoShippuden_Hidan.png',
      'NarutoShippuden_Hinata.png',
      'NarutoShippuden_Ino.png',
      'NarutoShippuden_Itachi.png',
      'NarutoShippuden_Jiraiya.png',
      'NarutoShippuden_Kabuto.png',
      'NarutoShippuden_Kakashi.png',
      'NarutoShippuden_Kankuro.png',
      'NarutoShippuden_Kiba.png',
      'NarutoShippuden_Kisame.png',
      'NarutoShippuden_Kurenai.png',
      'NarutoShippuden_Naruto.png',
      'NarutoShippuden_Neji.png',
      'NarutoShippuden_Orochimaru.png',
      'NarutoShippuden_Rock.png',
      'NarutoShippuden_Sae.png',
      'NarutoShippuden_Sakura.png',
      'NarutoShippuden_Sasori1.png',
      'NarutoShippuden_Sasori2.png',
      'NarutoShippuden_Sasuke.png',
      'NarutoShippuden_Shikamaru.png',
      'NarutoShippuden_Shino.png',
      'NarutoShippuden_Temari.png',
      'NarutoShippuden_Tsunade.png',
      'NarutoShippuden_Yamato.png'
    ]
  },
  {
    style: 'NetflixStyle',
    franchise: 'OnePiece',
    files: [
      'OnePiece_Brook.png',
      'OnePiece_Chopper.png',
      'OnePiece_Franky.png',
      'OnePiece_GoingMerry.jpeg',
      'OnePiece_Jinbe.png',
      'OnePiece_Luffy1.png',
      'OnePiece_Luffy2.png',
      'OnePiece_Nami.png',
      'OnePiece_Robin.png',
      'OnePiece_Sanji.png',
      'OnePiece_ThousandSunny.jpeg',
      'OnePiece_Usopp.jpeg',
      'OnePiece_Zoro.png'
    ]
  }
];

/**
 * Compila y normaliza todos los avatares en un catálogo plano enriquecido
 */
export function getCompiledAvatars() {
  const list = [];

  for (const group of RAW_AVATAR_REGISTRY) {
    const { style, franchise, files } = group;
    const styleName = formatStyleName(style);
    const franchiseName = formatFranchiseName(franchise);

    for (const fileName of files) {
      // Ignorar desktop.ini u ocultos
      if (/desktop\.ini$/i.test(fileName) || fileName.startsWith('.')) continue;

      // Extraer nombre del personaje: {Franchise}_{Character}.{ext}
      const dotIndex = fileName.lastIndexOf('.');
      const baseName = dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;
      const extension = dotIndex !== -1 ? fileName.substring(dotIndex + 1).toLowerCase() : '';

      let rawChar = baseName;
      if (baseName.startsWith(`${franchise}_`)) {
        rawChar = baseName.substring(franchise.length + 1);
      }

      const character = formatCharacterName(rawChar);
      const relativePath = `../assets/profile_icons/${style}/${franchise}/${fileName}`;

      list.push({
        id: `${style}_${franchise}_${rawChar}`,
        fileName,
        character,
        rawCharacter: rawChar,
        franchise,
        franchiseName,
        style,
        styleName,
        path: relativePath,
        extension
      });
    }
  }

  // Ordenar alfabéticamente por nombre de personaje de la A a la Z
  list.sort((a, b) => a.character.localeCompare(b.character, 'es', { sensitivity: 'base' }));
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
    return baseList.sort((a, b) => a.character.localeCompare(b.character, 'es', { sensitivity: 'base' }));
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
    return baseList.filter(item => item.character.toLowerCase().includes(cleanQ))
      .sort((a, b) => a.character.localeCompare(b.character, 'es', { sensitivity: 'base' }));
  }

  if (forceMode === 'franchise') {
    return baseList.filter(item => item.franchiseName.toLowerCase().includes(cleanQ))
      .sort((a, b) => a.character.localeCompare(b.character, 'es', { sensitivity: 'base' }));
  }

  // Búsqueda general sin prefijo: PRIORIZAR PERSONAJE ANTE OBRA
  const characterMatches = baseList.filter(item => item.character.toLowerCase().includes(cleanQ));

  if (characterMatches.length > 0) {
    // Si la búsqueda coincide con un personaje directamente, devolver ÚNICAMENTE los personajes
    // a menos que la búsqueda sea extensa y específica de la obra (con espacios o >= 10 caracteres)
    const isExplicitFranchiseSearch = cleanQ.length >= 10 || cleanQ.includes(' ');
    
    if (!isExplicitFranchiseSearch) {
      return characterMatches.sort((a, b) => a.character.localeCompare(b.character, 'es', { sensitivity: 'base' }));
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
      const aChar = a.character.toLowerCase().includes(cleanQ);
      const bChar = b.character.toLowerCase().includes(cleanQ);
      if (aChar && !bChar) return -1;
      if (!aChar && bChar) return 1;
      return a.character.localeCompare(b.character, 'es', { sensitivity: 'base' });
    });
  }

  // Si ningún personaje coincide, buscar coincidencias en el nombre de la franquicia
  const franchiseMatches = baseList.filter(item => item.franchiseName.toLowerCase().includes(cleanQ));
  return franchiseMatches.sort((a, b) => a.character.localeCompare(b.character, 'es', { sensitivity: 'base' }));
}
