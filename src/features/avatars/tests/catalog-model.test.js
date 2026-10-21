import { expect, it } from 'vitest';
import { compileRegistry, filterAvatars, getStylesSummary, getFranchisesSummary, registryFromPaths,
  formatCharacterName, formatStyleName, formatFranchiseName } from '../index.js';

const registry = [
  { style: 'NetflixStyle', franchise: 'Naruto Shippuden', files: ['NarutoShippuden_Naruto10.webp', 'NarutoShippuden_Naruto2.webp', 'Sasuke.webp', '.hidden.webp', 'desktop.ini'] },
  { style: 'MangaStyle', franchise: 'One Piece', files: ['OnePiece_Luffy.webp'] },
  { style: 'IconsStyle', franchise: 'General', isDirect: true, files: ['Default.webp'] },
];

it('preserves variation numbering, sort order and detached compilation', () => {
  const before = structuredClone(registry);
  const avatars = compileRegistry(registry, { relativePrefix: '../' });
  const naruto = avatars.filter(item => item.baseCharacter === 'Naruto');
  expect(naruto.map(item => [item.fileName, item.character, item.variationNumber])).toEqual([
    ['NarutoShippuden_Naruto2.webp', 'Naruto (1)', 1], ['NarutoShippuden_Naruto10.webp', 'Naruto (2)', 2],
  ]);
  expect(avatars.find(item => item.style === 'IconsStyle').path).toBe('../assets/profile_icons/IconsStyle/Default.webp');
  expect(avatars.find(item => item.baseCharacter === 'Luffy').path).toBe('../assets/profile_icons/MangaStyle/One%20Piece/OnePiece_Luffy.webp');
  expect(avatars).toHaveLength(5);
  expect(registry).toEqual(before);
});

it.each([
  ['naruto', ['Naruto (1)', 'Naruto (2)']], ['ob: naruto', ['Naruto (1)', 'Naruto (2)', 'Sasuke']],
  ['personaje: sasuke', ['Sasuke']], ['char: luffy', ['Luffy']], ['fran: one piece', ['Luffy']],
  ['naruto shippuden', ['Naruto (1)', 'Naruto (2)', 'Sasuke']], ['missing', []],
])('preserves search priority and explicit mode for %s', (query, expected) => {
  const avatars = compileRegistry(registry);
  expect(filterAvatars({ query }, avatars).map(item => item.character)).toEqual(expected);
  expect(avatars).toEqual(compileRegistry(registry));
});

it('combines style/franchise filters and retains canonical empty style counts', () => {
  const avatars = compileRegistry(registry);
  expect(filterAvatars({ style: 'NetflixStyle', franchise: 'One Piece' }, avatars)).toEqual([]);
  expect(getStylesSummary([]).map(item => item.id)).toEqual(['all', 'NetflixStyle', 'IconsStyle', 'MangaStyle']);
  expect(getFranchisesSummary('NetflixStyle', avatars)).toEqual([
    { id: 'all', name: 'Todas las obras', count: 3 }, { id: 'Naruto Shippuden', name: 'Naruto Shippuden', count: 3 },
  ]);
});

it('keeps direct style files distinct from an actual General subfolder', () => {
  const groups = registryFromPaths(['assets/profile_icons/IconsStyle/Default.webp',
    'assets/profile_icons/IconsStyle/General/Other.webp', 'assets/profile_icons/IconsStyle/Default.webp',
    'assets/profile_icons/IconsStyle/.hidden.webp', 'assets/profile_icons/IconsStyle/desktop.ini', 'README.md']);
  expect(groups).toHaveLength(2);
  expect(compileRegistry(groups).map(item => item.path)).toEqual([
    './assets/profile_icons/IconsStyle/Default.webp', './assets/profile_icons/IconsStyle/General/Other.webp',
  ]);
});

it('encodes filename delimiters without turning them into query parameters', () => {
  const [avatar] = compileRegistry([{ style: 'Custom', franchise: 'Series', files: ['A?B#C.webp'] }]);
  expect(avatar.path).toBe('./assets/profile_icons/Custom/Series/A%3FB%23C.webp');
});

it('preserves human-readable names, including malformed legacy percent sequences', () => {
  expect(formatStyleName('NetflixStyle')).toBe('Netflix Style');
  expect(formatFranchiseName('One_Piece')).toBe('One Piece');
  expect(formatCharacterName('MonkeyDLuffy')).toBe('Monkey D Luffy');
  expect(formatCharacterName('Invalid%name')).toBe('Invalid%name');
  expect(formatCharacterName('')).toBe('Desconocido');
});
