/** Escape text used in trusted static templates, including quoted attributes. */
export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

export function safeImageUrl(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  try {
    const url = new URL(value, 'https://local.invalid/');
    return ['https:', 'http:'].includes(url.protocol) || /^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(value)
      ? value : fallback;
  } catch { return fallback; }
}
