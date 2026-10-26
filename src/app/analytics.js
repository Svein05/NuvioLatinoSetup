const BEACON = 'https://static.cloudflareinsights.com/beacon.min.js';

/** Public pages only; never attach account, form, API-key or addon data. */
export function installPublicAnalytics(doc = document, location = window.location) {
  if (location.origin !== 'https://guia.lat-add.com'
    || !['/', '/index.html', '/documentation/', '/documentation/index.html'].includes(location.pathname)
    || location.search || location.hash) return;
  if (doc.querySelector('script[data-cf-beacon],script[src^="https://static.cloudflareinsights.com/beacon.min.js"]')) return;
  const script = doc.createElement('script');
  script.type = 'module';
  script.src = BEACON;
  script.dataset.cfBeacon = JSON.stringify({ token: '12a952af0aa14b259e07528c885fd62f' });
  doc.body.append(script);
}

if (typeof document !== 'undefined') installPublicAnalytics();
