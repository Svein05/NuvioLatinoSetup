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
 * Obtiene la lista de franquicias únicas con sus contadores, opcionalmente filtrada por estilo
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

  const result = [{ id: 'all', name: 'Todas las obras', count: filtered.length }];
  for (const [franchiseId, count] of map.entries()) {
    result.push({
      id: franchiseId,
      name: formatFranchiseName(franchiseId),
      count
    });
  }

  return result;
}

/**
 * Filtro multicriterio de avatares (estilo, franquicia y texto en tiempo real)
 */
export function filterAvatars({ style = 'all', franchise = 'all', query = '' }, avatarsList = null) {
  const avatars = avatarsList || getCompiledAvatars();
  const cleanQ = String(query || '').trim().toLowerCase();

  return avatars.filter(item => {
    // Filtro de estilo
    if (style !== 'all' && item.style !== style) return false;

    // Filtro de franquicia
    if (franchise !== 'all' && item.franchise !== franchise) return false;

    // Búsqueda por texto (personaje, franquicia o archivo)
    if (cleanQ) {
      const matchChar = item.character.toLowerCase().includes(cleanQ);
      const matchFran = item.franchiseName.toLowerCase().includes(cleanQ);
      const matchFile = item.fileName.toLowerCase().includes(cleanQ);
      if (!matchChar && !matchFran && !matchFile) return false;
    }

    return true;
  });
}
