import path from 'node:path';
import { readFileSync } from 'node:fs';
import { pageMetadata, crawlFiles, SITE_PAGES, siteStructuredData } from './site-metadata.js';

export function siteSeo(repository, environment) {
  let production = false;
  const version = JSON.parse(readFileSync(path.join(repository, 'version.json'), 'utf8')).version;
  return {
    name: 'public-site-metadata',
    configResolved(config) { production = config.command === 'build' && environment === 'production'; },
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        const key = path.relative(path.join(repository, 'src/pages'), context.filename).replaceAll('\\', '/');
        const page = SITE_PAGES[key];
        if (!page) return html;
        let result = html.replace('<!-- @site-metadata -->', pageMetadata(key, production));
        if (key === 'index.html') result = result.replace('</head>', `<script type="application/ld+json">${siteStructuredData(version)}</script>\n</head>`);
        if (production && page.indexable) {
          const prefix = key === 'index.html' ? '../' : '../../';
          result = result.replace('</body>', `<script type="module" src="${prefix}app/analytics.js"></script>\n</body>`);
        }
        return result;
      },
    },
    generateBundle() {
      const { robots, sitemap } = crawlFiles(production);
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
      if (sitemap) this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== '/robots.txt') return next();
        response.setHeader('Content-Type', 'text/plain; charset=utf-8');
        response.end(crawlFiles(false).robots);
      });
    },
  };
}
