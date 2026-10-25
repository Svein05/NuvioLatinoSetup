import { formatCharacterName, formatFranchiseName, formatStyleName } from './names.js';
import { compareAvatars } from './order.js';

function characterParts(fileName, franchise) {
  const dot = fileName.lastIndexOf('.');
  const name = dot < 0 ? fileName : fileName.slice(0, dot);
  const normalize = value => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const underscore = name.indexOf('_');
  const stripped = underscore < 0 ? '' : name.slice(underscore + 1).trim();
  const rawChar = underscore >= 0 && normalize(name.slice(0, underscore)) === normalize(franchise) && stripped ? stripped : name;
  const match = rawChar.match(/^(.*?)(?:[_\-\s]|\s*\()?(\d+)\)?$/);
  const numbered = match && match[1]?.trim();
  return { rawChar, baseChar: formatCharacterName(numbered ? match[1].trim() : rawChar),
    variationNum: numbered ? parseInt(match[2], 10) : 1,
    extension: dot < 0 ? '' : fileName.slice(dot + 1).toLowerCase() };
}

function compileGroup(group, relativePrefix) {
  const grouped = new Map();
  const { style, franchise } = group;
  for (const fileName of group.files) {
    if (/desktop\.ini$/i.test(fileName) || fileName.startsWith('.')) continue;
    const item = { fileName, ...characterParts(fileName, franchise) };
    if (!grouped.has(item.baseChar)) grouped.set(item.baseChar, []);
    grouped.get(item.baseChar).push(item);
  }
  return [...grouped.values()].flatMap(items => {
    items.sort((a, b) => a.variationNum - b.variationNum);
    const varied = items.length > 1;
    return items.map((item, index) => ({
      id: `${style}_${franchise}_${item.rawChar}`, fileName: item.fileName,
      character: varied ? `${item.baseChar} (${index + 1})` : item.baseChar,
      baseCharacter: item.baseChar, variationNumber: varied ? index + 1 : null,
      isVariation: varied, rawCharacter: item.rawChar, franchise, franchiseName: formatFranchiseName(franchise),
      style, styleName: formatStyleName(style), extension: item.extension,
      path: `${relativePrefix}assets/profile_icons/${[style, ...(group.isDirect ? [] : [franchise]), item.fileName].map(encodeURIComponent).join('/')}`,
    }));
  });
}

/** Relative paths are supplied by the composition root, never discovered from the DOM here. */
export function compileRegistry(registry, { relativePrefix = './' } = {}) {
  return registry.flatMap(group => compileGroup(group, relativePrefix)).sort(compareAvatars);
}
