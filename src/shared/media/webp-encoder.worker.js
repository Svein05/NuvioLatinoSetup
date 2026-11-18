import encode, { init } from '@jsquash/webp/encode.js';
import wasmUrl from '@jsquash/webp/codec/enc/webp_enc.wasm?url';
import simdWasmUrl from '@jsquash/webp/codec/enc/webp_enc_simd.wasm?url';

let initialized;
let queue = Promise.resolve();

async function processImage({ id, pixels, width, height, quality }) {
  try {
    initialized ??= init({ locateFile: file => file.includes('_simd') ? simdWasmUrl : wasmUrl });
    await initialized;
    const buffer = await encode({ data: new Uint8ClampedArray(pixels), width, height }, {
      quality: quality * 100, alpha_quality: 100, thread_level: 0, low_memory: 1,
    });
    globalThis.postMessage({ id, buffer }, [buffer]);
  } catch {
    globalThis.postMessage({ id, error: true });
  }
}

globalThis.onmessage = event => { queue = queue.then(() => processImage(event.data)); };
