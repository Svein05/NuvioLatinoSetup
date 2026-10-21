/**
 * Utilería segura para descarga de archivos JSON en el navegador.
 */
export function downloadJsonFile(data, filename, { documentRoot = (typeof document !== 'undefined' ? document : null), urlApi = (typeof URL !== 'undefined' ? URL : null) } = {}) {
  if (!documentRoot || !urlApi || typeof documentRoot.createElement !== 'function') return;

  const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = urlApi.createObjectURL(blob);
  const link = documentRoot.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  if (typeof urlApi.revokeObjectURL === 'function') {
    urlApi.revokeObjectURL(url);
  }
}
