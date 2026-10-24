/** Smallest supported image covering the rendered width, capped for high-density displays. */
export function posterResolution(width, density = 1) {
  const pixels = Math.max(1, Number(width) || 1) * Math.min(3, Math.max(1, Number(density) || 1));
  return [342, 500, 780].find(size => size >= pixels) || 780;
}
