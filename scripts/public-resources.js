import { cpSync, mkdirSync } from 'node:fs';
import path from 'node:path';

export function developmentSourcePaths(html, filename) {
  return html.replace(/(?<=["'])(?:\.\.\/)+[^"'\s]+\.(?:js|css)(?:\?[^"'\s]*)?/g, source => {
    const [file, query] = source.split('?');
    const absolute = path.resolve(path.dirname(filename), file).replaceAll('\\', '/');
    return `/@fs/${absolute}${query ? `?${query}` : ''}`;
  });
}

// Only legacy public resources; never copy the repository or local configuration.
export function publicResources(repository) {
  return {
    name: 'legacy-public-resources',
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        return context.server ? developmentSourcePaths(html, context.filename) : html;
      },
    },
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        if (request.url?.startsWith('/assets/')) {
          request.url = `/@fs/${repository.replaceAll('\\', '/')}${request.url}`;
        }
        next();
      });
    },
    closeBundle() {
      const output = path.join(repository, 'dist');
      mkdirSync(output, { recursive: true });
      cpSync(path.join(repository, 'assets'), path.join(output, 'assets'), { recursive: true });
      cpSync(path.join(repository, 'version.json'), path.join(output, 'version.json'));
    },
  };
}

export function excludePrivateConfiguration() {
  const privateModule = '\0private-local-config';
  return {
    name: 'exclude-private-local-config',
    enforce: 'pre',
    resolveId(source) {
      if (source.endsWith('.local.js')) return privateModule;
    },
    load(id) {
      if (id !== privateModule) return;
      return 'export const LOCAL_WEBHOOK_CONFIG = {}; export const LOCAL_AVATAR_RANK_CONFIG = {};';
    },
  };
}
