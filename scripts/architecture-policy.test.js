import { describe, expect, it } from 'vitest';
import { parse } from 'espree';
import { countLines, importSpecifiers, importViolation, maximumLines, relativeTarget } from './architecture-policy.js';

describe('architecture boundaries', () => {
  it('allows pages to consume feature public APIs', () => {
    expect(importViolation('src/pages/account/index.js', 'src/features/profiles/index.js')).toBeNull();
  });

  it('rejects private feature imports and cross-feature coupling', () => {
    expect(importViolation('src/pages/account/index.js', 'src/features/profiles/state/draft.js')).toBeTruthy();
    expect(importViolation('src/features/addons/index.js', 'src/features/auth/index.js')).toBeTruthy();
  });

  it('keeps shared modules independent and new code away from legacy modules', () => {
    expect(importViolation('src/shared/http/request.js', 'src/app/config.js')).toBeTruthy();
    expect(importViolation('src/features/addons/index.js', 'js/state.js')).toBeTruthy();
  });

  it('keeps pure models away from UI and mutable state', () => {
    expect(importViolation('src/features/addons/model/order.js', 'src/features/addons/state/draft.js')).toBeTruthy();
  });

  it('detects dynamic imports as well as static imports and reexports', () => {
    const ast = parse("import './one.js'; export { value } from './two.js'; function load() { return import('./three.js'); }", {
      ecmaVersion: 'latest', sourceType: 'module',
    });
    expect(importSpecifiers(ast)).toEqual(['./one.js', './two.js', './three.js']);
  });
});

describe('physical line limits', () => {
  it('counts comments, whitespace and either newline convention', () => {
    expect(countLines('// comment\r\n\r\nconst value = 1;\r\n')).toBe(3);
    expect(countLines('one\ntwo')).toBe(2);
  });

  it('uses stricter limits for entrypoints and separate limits for tests', () => {
    expect(maximumLines('src/pages/account/index.js')).toBe(150);
    expect(maximumLines('src/features/addons/index.js')).toBe(300);
    expect(maximumLines('src/features/addons/tests/order.test.js')).toBe(400);
  });

  it('resolves relative imports consistently on Windows and Linux', () => {
    expect(relativeTarget('src/features/addons/index.js', './model/identity.js'))
      .toBe('src/features/addons/model/identity.js');
  });
});
