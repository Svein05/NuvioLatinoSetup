import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['src/integrations/**/*.js'],
    rules: {
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'sessionStorage'],
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'max-lines-per-function': ['error', { max: 60, skipBlankLines: false, skipComments: false }],
      'max-depth': ['error', 3],
      'max-params': ['error', 4],
      'no-restricted-syntax': ['error', {
        selector: 'ExportAllDeclaration',
        message: 'Exportar nombres explícitos; no usar índices globales.',
      }],
    },
  },
  {
    files: ['src/**/model/**/*.js', 'src/**/data/**/*.js'],
    rules: {
      'no-restricted-globals': ['error', 'window', 'document', 'fetch', 'localStorage',
        'sessionStorage', 'setTimeout', 'setInterval', 'requestAnimationFrame'],
    },
  },
  {
    files: ['**/*.test.js'],
    rules: { 'max-lines-per-function': 'off' },
  },
];
