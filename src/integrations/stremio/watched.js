/** Decode the public Stremio WatchedField format using its anchor against Cinemeta video order. */
export async function watchedEpisodes(item, { signal, fetchImpl = fetch } = {}) {
  if (!item.state?.watched) return [];
  const parts = item.state.watched.split(':');
  const encoded = parts.pop();
  const length = Number(parts.pop());
  const anchor = parts.join(':');
  if (!Number.isSafeInteger(length) || length < 1 || length > 100000 || encoded.length > 200000) throw new Error('invalid watched field');
  const compressed = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate'));
  const reader = stream.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 16384) { await reader.cancel(); throw new Error('watched field too large'); }
    chunks.push(value);
  }
  const bits = new Uint8Array(size);
  let cursor = 0;
  for (const chunk of chunks) { bits.set(chunk, cursor); cursor += chunk.length; }
  const response = await fetchImpl(`https://v3-cinemeta.strem.io/meta/series/${item._id}.json`, {
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000),
    credentials: 'omit', redirect: 'error',
  });
  if (!response.ok) throw new Error('episode metadata unavailable');
  const videos = (await response.json()).meta?.videos;
  if (!Array.isArray(videos) || videos.length > 100000) throw new Error('invalid episode metadata');
  const anchorIndex = videos.findIndex(video => video.id === anchor);
  if (anchorIndex < 0) throw new Error('unknown watched anchor');
  const offset = length - anchorIndex - 1;
  return videos.flatMap((video, index) => {
    const bit = index + offset;
    return bit >= 0 && (bits[Math.floor(bit / 8)] & (1 << (bit % 8))) ? [video.id] : [];
  });
}
