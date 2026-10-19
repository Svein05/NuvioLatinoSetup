import path from 'node:path';
import { expect, it, vi } from 'vitest';
import { expandHtmlFragments } from './html-fragments.js';

const root = path.resolve('src');
const filename = path.join(root, 'pages/account/index.html');

it('expands nested fragments without changing markup or entry-relative asset URLs', () => {
  const files = {
    [path.join(root, 'pages/account/partials/profile.html')]: '<section><!-- @include "name.html" --></section>',
    [path.join(root, 'pages/account/partials/name.html')]: '<img src="../../../assets/logo/logo.webp">',
  };
  const watch = vi.fn();
  const source = '<main><!-- @include "partials/profile.html" --></main>';
  expect(expandHtmlFragments(source, filename, { root, read: file => files[file], watch }))
    .toBe('<main><section><img src="../../../assets/logo/logo.webp"></section></main>');
  expect(watch).toHaveBeenCalledTimes(2);
});

it('rejects paths outside source and recursive fragments', () => {
  expect(() => expandHtmlFragments('<!-- @include "../../../.env" -->', filename, { root })).toThrow('fuera');
  expect(() => expandHtmlFragments('<!-- @include "self.html" -->', filename, {
    root, read: () => '<!-- @include "self.html" -->',
  })).toThrow('circular');
});

it('reports a missing fragment rather than publishing an incomplete page', () => {
  expect(() => expandHtmlFragments('<!-- @include "missing.html" -->', filename, { root }))
    .toThrow();
});
