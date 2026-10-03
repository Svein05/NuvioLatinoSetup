/**
 * Catálogo de Diseños y Paquetes de Fusion Badges para Nuvio
 * Atribución y créditos: kingsizew (https://github.com/kingsizew/badges)
 */

export const BADGE_PACKS = [
  {
    id: 'tinted',
    name: 'Tinted Badges',
    author: 'kingsizew',
    authorUrl: 'https://github.com/kingsizew/badges',
    description: 'Estilo sutil translúcido tintado con colores armónicos según jerarquía de calidad (T1-T5). Recomendado por su equilibrio visual.',
    previewUrl: 'https://kingsizew.github.io/badges/previews/tinted_badges.json.png',
    rawV2: 'https://raw.githubusercontent.com/kingsizew/badges/main/tinted_badges_v2.json',
    rawV1: 'https://raw.githubusercontent.com/kingsizew/badges/main/tinted_badges.json',
    tags: ['Translúcido', 'Colores T1-T5', 'Recomendado'],
    accentColor: '#6366f1'
  },
  {
    id: 'badge',
    name: 'Default Colored',
    author: 'kingsizew',
    authorUrl: 'https://github.com/kingsizew/badges',
    description: 'Distintivos vibrantes a todo color con alto contraste y clasificación técnica completa por tiers de resolución y audio.',
    previewUrl: 'https://kingsizew.github.io/badges/previews/badge.json.png',
    rawV2: 'https://raw.githubusercontent.com/kingsizew/badges/main/badge_v2.json',
    rawV1: 'https://raw.githubusercontent.com/kingsizew/badges/main/badge.json',
    tags: ['Color Vivo', 'Alto Contraste', 'Popular'],
    accentColor: '#ffd479'
  },
  {
    id: 'colored_outline',
    name: 'Colored Outline',
    author: 'kingsizew',
    authorUrl: 'https://github.com/kingsizew/badges',
    description: 'Bordes y textos delineados en color sobre fondo negro profundo OLED, ofreciendo un acabado nítido y moderno.',
    previewUrl: 'https://kingsizew.github.io/badges/previews/colored_outline_badges.json.png',
    rawV2: 'https://raw.githubusercontent.com/kingsizew/badges/main/colored_outline_badges_v2.json',
    rawV1: 'https://raw.githubusercontent.com/kingsizew/badges/main/colored_outline_badges.json',
    tags: ['Borde de Color', 'OLED', 'Moderno'],
    accentColor: '#38bdf8'
  },
  {
    id: 'solid',
    name: 'Solid Badges',
    author: 'kingsizew',
    authorUrl: 'https://github.com/kingsizew/badges',
    description: 'Rellenos sólidos mate con colores definidos para una lectura rápida y sin distracciones a distancia en Smart TV.',
    previewUrl: 'https://kingsizew.github.io/badges/previews/solid_badges.json.png',
    rawV2: 'https://raw.githubusercontent.com/kingsizew/badges/main/solid_badges_v2.json',
    rawV1: 'https://raw.githubusercontent.com/kingsizew/badges/main/solid_badges.json',
    tags: ['Sólido', 'Mate', 'Smart TV'],
    accentColor: '#f97316'
  },
  {
    id: 'white',
    name: 'White Badges',
    author: 'kingsizew',
    authorUrl: 'https://github.com/kingsizew/badges',
    description: 'Acabado minimalista en escala de blancos y grises tenues para usuarios que prefieren máxima sobriedad y limpieza estética.',
    previewUrl: 'https://kingsizew.github.io/badges/previews/white_badges.json.png',
    rawV2: 'https://raw.githubusercontent.com/kingsizew/badges/main/white_badges_v2.json',
    rawV1: 'https://raw.githubusercontent.com/kingsizew/badges/main/white_badges.json',
    tags: ['Minimalista', 'Blanco', 'Elegante'],
    accentColor: '#ffffff'
  },
  {
    id: 'mono_white',
    name: 'Mono White',
    author: 'kingsizew',
    authorUrl: 'https://github.com/kingsizew/badges',
    description: 'Líneas puras y tipografía monocromática blanca con fondo oscuro, eliminando cualquier distracción cromática.',
    previewUrl: 'https://kingsizew.github.io/badges/previews/mono_white_badges.json.png',
    rawV2: 'https://raw.githubusercontent.com/kingsizew/badges/main/mono_white_badges_v2.json',
    rawV1: 'https://raw.githubusercontent.com/kingsizew/badges/main/mono_white_badges.json',
    tags: ['Monocromo', 'Limpio', 'Discreto'],
    accentColor: '#e2e8f0'
  },
  {
    id: 'black',
    name: 'Black Badges',
    author: 'kingsizew',
    authorUrl: 'https://github.com/kingsizew/badges',
    description: 'Fondos oscuros profundos con marcos y leyendas claras, diseñados para fundirse a la perfección con la interfaz cinemática.',
    previewUrl: 'https://kingsizew.github.io/badges/previews/black_badges.json.png',
    rawV2: 'https://raw.githubusercontent.com/kingsizew/badges/main/black_badges_v2.json',
    rawV1: 'https://raw.githubusercontent.com/kingsizew/badges/main/black_badges.json',
    tags: ['Dark Mode', 'Negro', 'Cine'],
    accentColor: '#94a3b8'
  }
];

export function getBadgePackById(id) {
  return BADGE_PACKS.find(p => p.id === id) || BADGE_PACKS[0];
}

export function getBadgePackUrl(packId, version = 'v2') {
  const pack = getBadgePackById(packId);
  return version === 'v1' ? pack.rawV1 : pack.rawV2;
}
