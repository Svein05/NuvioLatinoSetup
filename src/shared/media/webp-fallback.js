const CONVERSION_ERROR = 'No se pudo convertir la imagen a WebP en este dispositivo. Tus cambios anteriores se conservan. Vuelve a intentarlo.';
const pending = new Map();
let worker;
let idleTimer;
let nextId = 0;

function stop() {
  clearTimeout(idleTimer);
  worker?.terminate(); worker = null;
}

function failAll() {
  stop();
  for (const job of pending.values()) { clearTimeout(job.timer); job.reject(new Error(CONVERSION_ERROR)); }
  pending.clear();
}

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./webp-encoder.worker.js', import.meta.url), { type: 'module' });
  worker.onerror = event => { event.preventDefault(); failAll(); };
  worker.onmessageerror = failAll;
  worker.onmessage = ({ data }) => {
    const job = pending.get(data?.id);
    if (!job) return;
    clearTimeout(job.timer); pending.delete(data.id);
    if (data.error || !(data.buffer instanceof ArrayBuffer)) { job.reject(new Error(CONVERSION_ERROR)); failAll(); return; }
    job.resolve(new Blob([data.buffer], { type: 'image/webp' }));
    if (!pending.size) idleTimer = setTimeout(stop, 30000);
  };
  return worker;
}

/** Keep pixels on the device and reuse the codec only while conversions are active. */
export function encodeCanvasWebp(canvas, quality) {
  if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') return Promise.reject(new Error(CONVERSION_ERROR));
  clearTimeout(idleTimer);
  return new Promise((resolve, reject) => {
    try {
      const encoder = getWorker();
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      const id = ++nextId;
      pending.set(id, { resolve, reject, timer: setTimeout(failAll, 60000) });
      encoder.postMessage({ id, pixels: pixels.buffer, width: canvas.width, height: canvas.height, quality }, [pixels.buffer]);
    } catch { failAll(); reject(new Error(CONVERSION_ERROR)); }
  });
}
