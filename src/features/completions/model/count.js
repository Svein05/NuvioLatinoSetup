export const BASELINE_COUNT = 150;
export const RECORD_WINDOW_MS = 45 * 60 * 1000;

export function isCompletionCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function formatCompactNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '--';
  const n = Number(num);
  if (n < 1000) return n.toString();
  if (n < 1000000) {
    const k = n / 1000;
    const formatted = k < 100 ? k.toFixed(1).replace(/\.0$/, '') : Math.round(k).toString();
    return `${formatted}k`;
  }
  if (n < 1000000000) {
    const m = n / 1000000;
    const formatted = m < 100 ? m.toFixed(1).replace(/\.0$/, '') : Math.round(m).toString();
    return `${formatted}M`;
  }
  return `${(n / 1000000000).toFixed(1).replace(/\.0$/, '')}B`;
}

export function formatFullNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '--';
  return new Intl.NumberFormat('es-MX').format(Number(num));
}
