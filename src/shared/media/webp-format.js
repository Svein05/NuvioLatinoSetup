/** MIME declarations alone do not prove that canvas honored the requested format. */
export async function isWebpBlob(blob) {
  if (!blob || blob.type !== 'image/webp' || blob.size < 12) return false;
  const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const text = bytes => String.fromCharCode(...bytes);
  return text(header.subarray(0, 4)) === 'RIFF' && text(header.subarray(8, 12)) === 'WEBP';
}
