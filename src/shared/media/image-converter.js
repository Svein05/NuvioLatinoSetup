export function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function processCanvasWebp(img, quality) {
  const width = img.naturalWidth || 512;
  const height = img.naturalHeight || 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('No se pudo generar WebP para la imagen'));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = String(reader.result).split(',')[1];
        resolve({
          blob,
          base64,
          webpSize: blob.size,
          previewUrl: URL.createObjectURL(blob),
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }, 'image/webp', quality);
  });
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
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else {
      objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
    }
  });
}
