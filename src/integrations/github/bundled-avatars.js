/** Public repository snapshot; the landing never needs an authenticated API. */
export async function loadBundledAvatars(signal) {
  const response = await fetch('/assets/profile_icons/manifest.json', { signal });
  if (!response.ok) throw new Error('Avatar catalog unavailable');
  const manifest = await response.json();
  if (!Array.isArray(manifest.styles) || !manifest.styles.length) throw new Error('Invalid avatar catalog');
  return manifest;
}
