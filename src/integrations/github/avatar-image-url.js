import { githubRepository, isCommitSha } from './avatar-catalog.js';

/** Canonical avatars stay on main; the accepted catalog commit busts the image cache. */
export function avatarImageUrl(path, repository, commitSha = null) {
  if (!path) return '';
  const value = String(path).trim();
  if (/^data:image\/(?:webp|png|jpe?g|gif);base64,[a-zA-Z0-9+/=\r\n]+$/i.test(value)) return value;
  const marker = 'assets/profile_icons/';
  if (value.includes(marker)) {
    let suffix = value.slice(value.indexOf(marker) + marker.length).split(/[?#]/)[0].replace(/^\/+/, '');
    try { suffix = decodeURIComponent(suffix); } catch { /* Preserve malformed legacy percent sequences as literal filenames. */ }
    const parts = suffix.split('/');
    if (parts.some(part => !part || part === '.' || part === '..')) return '';
    const encoded = parts.map(encodeURIComponent).join('/');
    return `https://raw.githubusercontent.com/${githubRepository(repository)}/main/${marker}${encoded}${isCommitSha(commitSha) ? `?v=${commitSha}` : ''}`;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch {
    // Only ordinary relative image paths survive; never protocols or HTML delimiters.
    return /^(?:\.\.?\/)?assets\/[\w/ .%()-]+$/i.test(value) ? value : '';
  }
}
