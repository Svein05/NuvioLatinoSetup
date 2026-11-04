import { readBoundedJson } from './response.js';

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
  const videos = (await readBoundedJson(response, 4 * 1024 * 1024)).meta?.videos;
  if (!Array.isArray(videos) || videos.length > 100000) throw new Error('invalid episode metadata');
  // LibraryItemState sorts season zero first, unlike MetaItem's display order.
  const number = value => Number.isSafeInteger(value) ? value : -Infinity;
  videos.sort((a, b) => number(a.season) - number(b.season) || number(a.episode) - number(b.episode)
    || (Date.parse(a.released) || -Infinity) - (Date.parse(b.released) || -Infinity));
  if (videos.some(video => typeof video.id !== 'string') || new Set(videos.map(video => video.id)).size !== videos.length) {
    throw new Error('ambiguous episode metadata');
  }
  const anchorIndex = videos.findIndex(video => video.id === anchor);
  if (anchorIndex < 0) throw new Error('unknown watched anchor');
  const offset = length - anchorIndex - 1;
  return videos.flatMap((video, index) => {
    const bit = index + offset;
    return bit >= 0 && bit < videos.length && (bits[Math.floor(bit / 8)] & (1 << (bit % 8))) ? [video.id] : [];
  });
}
