import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { excludePrivateConfiguration, publicResources } from '../scripts/public-resources.js';
import { injectPublicCounterConfig } from '../scripts/public-counter-config.js';
import postcss from './postcss.config.js';
import { htmlFragments } from '../scripts/html-fragments.js';

const repository = fileURLToPath(new URL('../', import.meta.url));
const pages = ['index', 'configuration/index', 'account/index', 'documentation/index', 'modder/index'];

export default defineConfig({
  appType: 'mpa',
  css: { postcss },
  root: path.join(repository, 'src/pages'),
  publicDir: path.join(repository, 'public'),
  plugins: [htmlFragments(path.join(repository, 'src')), excludePrivateConfiguration(),
    injectPublicCounterConfig(process.env), publicResources(repository)],
  server: { fs: { allow: [repository] } },
  build: {
    outDir: path.join(repository, 'dist'),
    emptyOutDir: true,
    rolldownOptions: {
      input: pages.map(page => path.join(repository, 'src/pages', `${page}.html`)),
    },
  },
});
