import path from 'node:path';
import { readFileSync } from 'node:fs';

const pages = {
  'index.html': 'index',
  'account/index.html': 'account',
  'configuration/index.html': 'configuration',
  'documentation/index.html': 'documentation',
};

function pageValues(current) {
  const prefix = current === 'index' ? './' : '../';
  const darkFooter = ['account', 'documentation'].includes(current);
  const values = {
    version: JSON.parse(readFileSync(new URL('../version.json', import.meta.url), 'utf8')).version,
    'brand-title': ['index', 'documentation'].includes(current) ? 'Nuvio Metadata Latino' : 'Volver al Inicio',
    'footer-background': darkFooter ? 'bg-[#060709]' : 'bg-[#08090c]',
    'footer-description': darkFooter ? 'text-white/60' : 'text-white/50',
    'footer-version': darkFooter ? 'text-white/80' : 'text-white/70',
    'collection-credit': darkFooter ? 'Colección DonPuercoTroll' : 'Colección en Español Completa (DonPuercoTroll)',
  };
  for (const page of Object.values(pages)) {
    const active = page === current;
    values[`href-${page}`] = active ? './' : page === 'index' ? prefix : `${prefix}${page}/`;
    values[`active-${page}`] = active ? ' is-active' : '';
    values[`current-${page}`] = active ? 'page' : 'false';
    values[`footer-${page}`] = active ? 'text-[#ffd479] font-medium transition-colors' : 'hover:text-white transition-colors';
  }
  return values;
}

function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll("'", '&#39;');
}

/** Only build-owned values are substituted; this is not a runtime HTML renderer. */
export function renderSiteShell(source, filename, pagesRoot) {
  if (!source.includes('{{ site.')) return source;
  const relative = path.relative(pagesRoot, filename).replaceAll('\\', '/');
  const current = pages[relative];
  if (!current) throw new Error(`Página sin configuración de cabecera/footer: ${relative}`);
  const values = pageValues(current);
  return source.replace(/{{\s*site\.([a-z-]+)\s*}}/g, (_match, key) => {
    if (!Object.hasOwn(values, key)) throw new Error(`Parámetro de cabecera/footer desconocido: ${key}`);
    return escapeAttribute(values[key]);
  });
}
