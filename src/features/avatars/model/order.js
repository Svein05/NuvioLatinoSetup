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
