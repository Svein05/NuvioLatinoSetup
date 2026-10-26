import { describe, expect, it } from 'vitest';
import { SITE_PAGES, pageMetadata, crawlFiles, siteStructuredData } from './site-metadata.js';
import { siteSeo } from './site-seo.js';
import path from 'node:path';

describe('search metadata and environment isolation', () => {
  it('indexes only public production content while preserving canonical URLs', () => {
    for (const [key, page] of Object.entries(SITE_PAGES)) {
      const production = pageMetadata(key, true);
      expect(production).toContain(`href="https://guia.lat-add.com${page.path}"`);
      expect(production).toContain(page.indexable ? 'content="index, follow,' : 'content="noindex, follow"');
      expect(pageMetadata(key, false)).toContain('content="noindex, follow"');
      expect(production.match(/name="description"/g)).toHaveLength(1);
      expect(production).not.toContain('cdn.jsdelivr.net');
    }
    expect(new Set(Object.keys(SITE_PAGES).map(key => pageMetadata(key, true).match(/<title>(.*?)<\/title>/)[1])).size).toBe(5);
  });
  it('publishes only the two indexable URLs without fabricated modification dates', () => {
    const { robots, sitemap } = crawlFiles(true);
    expect(robots).toContain('Sitemap: https://guia.lat-add.com/sitemap.xml');
    expect(robots).not.toContain('Disallow: /');
    expect(sitemap.match(/<loc>(.*?)<\/loc>/g)).toEqual([
      '<loc>https://guia.lat-add.com/</loc>', '<loc>https://guia.lat-add.com/documentation/</loc>',
    ]);
    expect(sitemap).not.toMatch(/lastmod|account|modder|configuration/);
    expect(crawlFiles(false).sitemap).toBeNull();
    expect(crawlFiles(false).robots).not.toContain('Sitemap:');
  });
  it('keeps structured data truthful and limited to declared application identity', () => {
    const data = JSON.parse(siteStructuredData('1.9.0'));
    expect(data['@graph'].map(node => node['@type'])).toEqual(['WebSite', 'WebApplication']);
    expect(data['@graph'][1].softwareVersion).toBe('1.9.0');
    expect(siteStructuredData('1.9.0')).not.toMatch(/aggregateRating|review|SearchAction/);
  });
  it('does not enable production output in dev even with the production variable set', () => {
    const repository = path.resolve('.');
    const plugin = siteSeo(repository, 'production');
    plugin.configResolved({ command: 'serve' });
    const source = '<head><!-- @site-metadata --></head><body></body>';
    const html = plugin.transformIndexHtml.handler(source, { filename: path.join(repository, 'src/pages/index.html') });
    expect(html).toContain('noindex, follow');
    expect(html).not.toContain('app/analytics.js');
    plugin.configResolved({ command: 'build' });
    expect(plugin.transformIndexHtml.handler(source, { filename: path.join(repository, 'src/pages/index.html') }))
      .toContain('app/analytics.js');
  });
});
