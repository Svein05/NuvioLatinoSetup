import { expect, test } from '@playwright/test';

test('every page ships unique metadata and a production canonical in initial HTML', async ({ request }, testInfo) => {
  const production = process.env.SITE_ENV === 'production' && !testInfo.config.webServer.command.includes('npm run dev');
  const titles = [];
  for (const pathname of ['/', '/documentation/', '/configuration/', '/account/', '/modder/']) {
    const response = await request.get(pathname);
    const html = await response.text();
    expect(response.status()).toBe(200);
    expect(html).toContain('lang="es-MX"');
    expect(html).toContain(`rel="canonical" href="https://guia.lat-add.com${pathname}"`);
    expect(html.match(/name="description"/g)).toHaveLength(1);
    titles.push(html.match(/<title>(.*?)<\/title>/)[1]);
    const indexable = production && ['/', '/documentation/'].includes(pathname);
    expect(html).toContain(indexable ? 'content="index, follow,' : 'content="noindex, follow"');
  }
  expect(new Set(titles).size).toBe(5);
});

test('crawl files match environment and unknown routes do not return a successful landing page', async ({ request }, testInfo) => {
  const production = process.env.SITE_ENV === 'production' && !testInfo.config.webServer.command.includes('npm run dev');
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('User-agent: *');
  const sitemap = await request.get('/sitemap.xml');
  if (production) {
    expect(sitemap.status()).toBe(200);
    expect(robots).toContain('https://guia.lat-add.com/sitemap.xml');
    expect(await sitemap.text()).not.toMatch(/account|configuration|modder|lastmod/);
  } else {
    expect(sitemap.status()).toBe(404);
    expect(robots).not.toContain('Sitemap:');
  }
  expect((await request.get('/missing-release-page')).status()).toBe(404);
  expect(await (await request.get('/404.html')).text()).toContain('noindex, follow');
});
