import path from 'node:path';
import { expect, it } from 'vitest';
import { renderSiteShell } from './site-shell.js';

const root = path.resolve('src/pages');

it.each(['index', 'account', 'configuration', 'documentation'])('renders relative links and exactly one active tab for %s', page => {
  const filename = path.join(root, page === 'index' ? 'index.html' : `${page}/index.html`);
  const source = ['index', 'account', 'configuration', 'documentation'].map(target =>
    `<a href="{{ site.href-${target} }}" class="lat-nav-tab{{ site.active-${target} }}" aria-current="{{ site.current-${target} }}"></a>`).join('');
  const output = renderSiteShell(source, filename, root);
  expect(output.match(/is-active/g)).toHaveLength(1);
  expect(output.match(/aria-current="page"/g)).toHaveLength(1);
  expect(output).not.toContain('{{');
  const links = [...output.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
  const targets = links.map(link => new URL(link, `https://example.invalid/${page === 'index' ? '' : `${page}/`}`).pathname);
  expect(targets).toEqual(['/', '/account/', '/configuration/', '/documentation/']);
  const footer = renderSiteShell('<footer class="{{ site.footer-background }}"></footer>', filename, root);
  const expectedBackground = ['account', 'documentation'].includes(page) ? '#060709' : '#08090c';
  expect(footer).toContain(`bg-[${expectedBackground}]`);
});

it('rejects unknown pages and undefined parameters instead of publishing broken navigation', () => {
  expect(() => renderSiteShell('{{ site.href-index }}', path.join(root, 'unknown/index.html'), root)).toThrow('Página sin');
  expect(() => renderSiteShell('{{ site.missing }}', path.join(root, 'index.html'), root)).toThrow('desconocido');
});
