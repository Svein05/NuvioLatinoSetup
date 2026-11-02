import { readFileSync } from 'node:fs';
import path from 'node:path';
import { generateImageVariants } from './image-variants.js';
import { responsiveHtml } from './responsive-html.js';

export function optimizedImages(repository) {
  const id = '\0optimized-image-manifest';
  let generated;
  const prepare = () => generated ||= generateImageVariants(repository);
  return {
    name: 'optimized-public-images',
    async buildStart() { await prepare(); },
    resolveId(source) { if (source === 'virtual:optimized-images') return id; },
    async load(source) {
      if (source === id) return `export default ${JSON.stringify((await prepare()).images)};`;
    },
    transformIndexHtml: { order: 'pre', async handler(html) { return responsiveHtml(html, (await prepare()).images); } },
    configureServer(server) {
      const assets = path.join(repository, 'assets') + path.sep;
      server.watcher.add(assets);
      const invalidate = file => {
        if (!file.startsWith(assets)) return;
        generated = undefined;
        const module = server.moduleGraph.getModuleById(id);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', invalidate).on('change', invalidate).on('unlink', invalidate);
      server.httpServer?.once('close', () => {
        server.watcher.off('add', invalidate).off('change', invalidate).off('unlink', invalidate);
      });
      server.middlewares.use(async (request, response, next) => {
        const url = request.url?.split('?')[0] || '';
        if (!/^\/assets\/optimized\/[a-f0-9]{20}-\d+\.webp$/.test(url)) return next();
        const { directory } = await prepare();
        try {
          response.setHeader('Content-Type', 'image/webp');
          response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          response.end(readFileSync(path.join(directory, path.basename(url))));
        } catch { response.statusCode = 404; response.end(); }
      });
    },
    async generateBundle() {
      const { directory, images } = await prepare();
      const urls = new Set(Object.values(images).flatMap(image => image.variants.map(item => item.url)));
      for (const url of urls) this.emitFile({ type: 'asset', fileName: url.slice(1),
        source: readFileSync(path.join(directory, path.basename(url))) });
    },
  };
}
