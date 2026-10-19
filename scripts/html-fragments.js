import { readFileSync } from 'node:fs';
import path from 'node:path';

const directive = /<!--\s*@include\s+"([^"]+)"\s*-->/g;

/** Expand trusted source fragments at build time, retaining entry-page URL semantics. */
export function expandHtmlFragments(source, filename, { root, read = readFileSync, watch = () => {} }, trail = []) {
  return source.replace(directive, (_match, relative) => {
    const target = path.resolve(path.dirname(filename), relative);
    const inside = path.relative(root, target);
    if (inside.startsWith('..') || path.isAbsolute(inside) || !target.endsWith('.html')) {
      throw new Error(`Fragmento HTML fuera de las fuentes: ${relative}`);
    }
    if (trail.includes(target)) throw new Error(`Inclusión HTML circular: ${relative}`);
    watch(target);
    return expandHtmlFragments(read(target, 'utf8'), target, { root, read, watch }, [...trail, target]);
  });
}

export function htmlFragments(root) {
  let server;
  return {
    name: 'source-html-fragments',
    configureServer(instance) { server = instance; },
    transformIndexHtml: {
      order: 'pre',
      handler(source, context) {
        return expandHtmlFragments(source, context.filename, {
          root, watch: filename => server?.watcher.add(filename),
        });
      },
    },
    handleHotUpdate(context) {
      if (context.file.endsWith('.html') && context.file.startsWith(root)) {
        context.server.ws.send({ type: 'full-reload' });
      }
    },
  };
}
