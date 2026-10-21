/** Module reloads and deferred imports can arrive after DOMContentLoaded. */
export function whenDocumentReady(callback, documentRoot = document) {
  if (documentRoot.readyState === 'loading') {
    documentRoot.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
}
