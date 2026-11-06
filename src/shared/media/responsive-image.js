import images from 'virtual:optimized-images';
import { escapeHtml } from '../ui/safe-markup.js';

let sourceHashes = {};
export function setImageSourceHashes(hashes) { sourceHashes = hashes || {}; }

/** Only local presentation changes; selection and persistence retain the original URL. */
function presentationRecord(source) {
  let key;
  try {
    const url = new URL(source, globalThis.location?.href || 'https://local.invalid');
    key = decodeURI(url.pathname);
    if (url.origin !== globalThis.location?.origin && url.origin !== 'https://local.invalid') {
      if (url.hostname !== 'raw.githubusercontent.com' || !key.includes('/assets/profile_icons/')) return null;
      key = key.slice(key.indexOf('/assets/profile_icons/'));
      if (!images[key] || sourceHashes[key.slice(1)] !== images[key].blob) return null;
    }
  } catch { return null; }
  return images[key];
}

export function responsiveImageAttributes(source, sizes = '(max-width: 640px) 28vw, 160px') {
  const record = presentationRecord(source);
  if (!record) return '';
  return `srcset="${record.variants.map(item => `${item.url} ${item.width}w`).join(', ')}" sizes="${escapeHtml(sizes)}" width="${record.width}" height="${record.height}" decoding="async"`;
}

export function responsiveImage(image, source, sizes = '160px') {
  const record = presentationRecord(source);
  if (record) {
    image.srcset = record.variants.map(item => `${item.url} ${item.width}w`).join(', ');
    image.sizes = sizes;
    image.width ||= record.width;
    image.height ||= record.height;
    image.decoding = 'async';
  } else { image.removeAttribute('srcset'); image.removeAttribute('sizes'); }
  return image;
}
