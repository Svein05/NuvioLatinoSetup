function safeDecode(str) {
  if (!str) return '';
  try {
    return decodeURIComponent(str);
  } catch {
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
