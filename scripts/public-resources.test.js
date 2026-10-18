import path from 'node:path';
import { expect, it } from 'vitest';
import { developmentSourcePaths, excludePrivateConfiguration } from './public-resources.js';

it('resolves source files outside the Vite pages root without rewriting public navigation', () => {
  const filename = path.resolve('src/pages/account/index.html');
  const html = '<a href="../configuration/">Go</a><script src="../../../js/app.js?v=1"></script>'
    + '<link href="../../shared/styles/tailwind.css" rel="stylesheet">';
  const result = developmentSourcePaths(html, filename);
  expect(result).toContain('href="../configuration/"');
  expect(result).toContain(`/@fs/${path.resolve('js/app.js').replaceAll('\\', '/')}?v=1`);
  expect(result).toContain(`/@fs/${path.resolve('src/shared/styles/tailwind.css').replaceAll('\\', '/')}`);
});

it('replaces private local configuration with an empty virtual module', () => {
  const plugin = excludePrivateConfiguration();
  const id = plugin.resolveId('./webhook-config.local.js');
  expect(plugin.load(id)).toContain('LOCAL_WEBHOOK_CONFIG = {}');
  expect(plugin.resolveId('./public-config.js')).toBeUndefined();
});
