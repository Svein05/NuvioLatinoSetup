export function previewStyle(sec, pack) {
  const items = Array.isArray(sec.items) ? [...sec.items] : [];
  const baseItem = items[0] || {
    name: '',
    text: '#ffffff',
    border: pack.accentColor || '#ffd479',
    bg: 'rgba(255,255,255,0.08)',
    style: 'filled'
  };

  const isMonoWhite = Boolean(pack && pack.id === 'mono_white');
  const isSolid = Boolean(pack && pack.id === 'solid');
  const hasBlackSuffix = isMonoWhite || isSolid || items.some(it => it.img && it.img.includes('-black.png'));
  const hasColorSuffix = items.some(it => it.img && /-gold|-blue|-green|-orange|-red|-yellow|-cyan|-gray|-purple/.test(it.img));
  const hasLightBlue = items.some(it => it.img && it.img.includes('-light-blue.png'));

  const copyStyle = (overrides = {}) => {
    if (isMonoWhite) {
      return {
        text: '#000000',
        border: '#cbd5e1',
        bg: '#ffffff',
        style: 'filled',
        ...overrides
      };
    }
    return {
      text: baseItem.text,
      border: baseItem.border,
      bg: baseItem.bg,
      style: baseItem.style || 'filled',
      ...overrides
    };
  };

  const getImg = (category, baseName, colorName) => {
    if (hasColorSuffix && colorName) return `${baseName}-${colorName}.png`;
    if (hasBlackSuffix) return `${baseName}-black.png`;
    if (hasLightBlue && (category === 'subtitle' || category === 'special-tags')) return `${baseName}-light-blue.png`;
    return `${baseName}.png`;
  };

    return { copyStyle, getImg, hasLightBlue, hasBlackSuffix, hasColorSuffix };
}
