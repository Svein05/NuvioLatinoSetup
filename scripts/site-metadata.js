export const SITE_ORIGIN = 'https://guia.lat-add.com';
export const SITE_PAGES = {
  'index.html': { path: '/', indexable: true, title: 'Nuvio Latino Setup: configura Nuvio en español latino',
    description: 'Organiza colecciones de Nuvio y configura AIOMetadata en español latino. Asistente paso a paso, pósters, avatares y modo manual.' },
  'documentation/index.html': { path: '/documentation/', indexable: true, title: 'Guía de Nuvio y AIOMetadata en español latino | Nuvio Latino Setup',
    description: 'Aprende a configurar Nuvio: claves de TMDB y MDBList, colecciones, pósters, badges, addons e instalación automática o manual.' },
  'configuration/index.html': { path: '/configuration/', title: 'Asistente de configuración | Nuvio Latino Setup',
    description: 'Configura un perfil de Nuvio con tus colecciones, metadatos en español latino, pósters y addons, o exporta los archivos manualmente.' },
  'account/index.html': { path: '/account/', title: 'Cuenta y perfiles | Nuvio Latino Setup',
    description: 'Gestiona tus perfiles, avatares, actividad, addons y preferencias de Nuvio.' },
  'modder/index.html': { path: '/modder/', title: 'Colaboradores | Nuvio Latino Setup',
    description: 'Panel de colaboradores para gestionar el catálogo de avatares de Nuvio Latino Setup.' },
};

const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

export function pageMetadata(key, production) {
  const page = SITE_PAGES[key];
  if (!page) throw new Error(`Missing page metadata: ${key}`);
  const url = SITE_ORIGIN + page.path;
  const image = `${SITE_ORIGIN}/assets/preview/incrustacion.png`;
  const meta = (attribute, name, value) => `<meta ${attribute}="${name}" content="${escape(value)}" />`;
  return [
    `<title>${escape(page.title)}</title>`,
    meta('name', 'description', page.description),
    meta('name', 'robots', production && page.indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow'),
    `<link rel="canonical" href="${url}" />`,
    meta('property', 'og:type', 'website'), meta('property', 'og:site_name', 'Nuvio Latino Setup'),
    meta('property', 'og:locale', 'es_MX'), meta('property', 'og:url', url),
    meta('property', 'og:title', page.title), meta('property', 'og:description', page.description),
    meta('property', 'og:image', image), meta('property', 'og:image:alt', 'Nuvio Latino Setup'),
    meta('name', 'twitter:card', 'summary_large_image'), meta('name', 'twitter:url', url),
    meta('name', 'twitter:title', page.title), meta('name', 'twitter:description', page.description),
    meta('name', 'twitter:image', image), meta('name', 'twitter:image:alt', 'Nuvio Latino Setup'),
  ].join('\n  ');
}

export function crawlFiles(production) {
  const robots = `User-agent: *\nDisallow:\n${production ? `\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n` : ''}`;
  const urls = Object.values(SITE_PAGES).filter(page => page.indexable)
    .map(page => `  <url><loc>${SITE_ORIGIN}${page.path}</loc></url>`).join('\n');
  return { robots, sitemap: production
    ? `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n` : null };
}

export function siteStructuredData(version) {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebSite', '@id': `${SITE_ORIGIN}/#website`, name: 'Nuvio Latino Setup', url: `${SITE_ORIGIN}/`, inLanguage: 'es-MX' },
    { '@type': 'WebApplication', name: 'Nuvio Latino Setup', url: `${SITE_ORIGIN}/`,
      applicationCategory: 'UtilitiesApplication', operatingSystem: 'Web browser', inLanguage: 'es-MX',
      softwareVersion: version, description: SITE_PAGES['index.html'].description },
  ] }).replaceAll('<', '\\u003c');
}
