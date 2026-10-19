export function normalizeBadgeColor(colorStr, fallback = 'transparent') {
  if (!colorStr || typeof colorStr !== 'string') return fallback;
  const str = colorStr.trim();
  // Formato ARGB de 8 dígitos hexadecimales: #AARRGGBB
  if (/^#[0-9a-fA-F]{8}$/.test(str)) {
    const a = str.slice(1, 3);
    const r = str.slice(3, 5);
    const g = str.slice(5, 7);
    const b = str.slice(7, 9);
    // Si opacidad es 100% (FF), devolver #RRGGBB directo
    if (a.toLowerCase() === 'ff') {
      return `#${r}${g}${b}`;
    }
    // Si es 0% opaco, transparent
    if (a === '00') {
      return 'transparent';
    }
    const alphaFloat = (parseInt(a, 16) / 255).toFixed(2);
    const rInt = parseInt(r, 16);
    const gInt = parseInt(g, 16);
    const bInt = parseInt(b, 16);
    return `rgba(${rInt}, ${gInt}, ${bInt}, ${parseFloat(alphaFloat)})`;
  }
  return str;
}
