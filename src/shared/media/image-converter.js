import { isWebpBlob } from './webp-format.js';

export function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function releasePreviewUrl(value) {
  if (typeof value === 'string' && value.startsWith('blob:')) URL.revokeObjectURL(value);
}

let nativeWebpUnsupported = false;

function canvasBlob(canvas, quality) {
  return new Promise(resolve => {
    try { canvas.toBlob(resolve, 'image/webp', quality); }
    catch { resolve(null); }
  });
}

function readWebpResult(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(',')[1];
      if (!base64) { reject(new Error('No se pudo leer la imagen convertida.')); return; }
      resolve({ blob, base64, webpSize: blob.size, previewUrl: URL.createObjectURL(blob) });
    };
    reader.onerror = reader.onabort = () => reject(new Error('No se pudo leer la imagen convertida.'));
    reader.readAsDataURL(blob);
  });
}

async function fallbackWebpBlob(canvas, quality) {
  try {
    const { encodeCanvasWebp } = await import('./webp-fallback.js');
    return await encodeCanvasWebp(canvas, quality);
  } catch {
    throw new Error('No se pudo convertir la imagen a WebP en este dispositivo. Tus cambios anteriores se conservan. Vuelve a intentarlo.');
  }
}

async function processCanvasWebp(img, quality) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
  try {
    if (!canvas.width || !canvas.height) throw new Error('La imagen no tiene dimensiones válidas.');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo preparar la imagen para convertirla.');
    ctx.drawImage(img, 0, 0);
    const normalizedQuality = Number.isFinite(quality) ? Math.max(0, Math.min(1, quality)) : 0.90;
    let blob = nativeWebpUnsupported ? null : await canvasBlob(canvas, normalizedQuality);
    if (!await isWebpBlob(blob)) {
      if (blob) nativeWebpUnsupported = true;
      blob = await fallbackWebpBlob(canvas, normalizedQuality);
    }
    if (!await isWebpBlob(blob)) throw new Error('La conversión no generó un archivo WebP válido. Tus cambios anteriores se conservan.');
    return await readWebpResult(blob);
  } finally { canvas.width = 0; canvas.height = 0; }
}

export async function convertToWebp(file, quality = 0.90) {
  return new Promise((resolve, reject) => {
    const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
    const img = new Image();
    let objectUrl = '';

    const cleanup = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };

    img.onload = async () => {
      try {
        const result = await processCanvasWebp(img, quality);
        cleanup();
        resolve(result);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    img.onerror = () => {
      cleanup();
      reject(new Error(`Error al decodificar la imagen: ${file.name}`));
    };

    if (isSvg) {
      const reader = new FileReader();
      reader.onload = (e) => { img.src = String(e.target?.result); };
      reader.onerror = reader.onabort = () => reject(new Error(`No se pudo leer la imagen: ${file.name}`));
      reader.readAsDataURL(file);
    } else {
      objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
    }
  });
}
