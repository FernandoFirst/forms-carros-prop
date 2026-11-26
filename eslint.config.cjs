const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      'vendor/**',
      'node_modules/**',
      'dist/**',
      '.vercel/**',
      'artifacts/**',
      '.npm-cache/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: { sourceType: 'script', globals: globals.browser },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
  {
    files: ['tests/e2e/**/*.cjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
