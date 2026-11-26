const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { existsSync, readdirSync, readFileSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');

test('publicação inclui somente os arquivos da aplicação e preserva os assets byte a byte', () => {
  const root = resolve(__dirname, '..');
  const build = () =>
    execFileSync(process.execPath, ['scripts/build-static.cjs'], { cwd: root, stdio: 'pipe' });
  build();
  const output = join(root, 'dist');
  assert.deepEqual(readdirSync(output).sort(), ['assets', 'css', 'index.html', 'js', 'vendor']);
  for (const entry of [
    'index.html',
    'assets/first-symbol.png',
    'js/app.js',
    'js/veiculo-p8-app.js',
    'vendor/exceljs.min.js',
    'vendor/EXCELJS-LICENSE.txt',
  ])
    assert.deepEqual(readFileSync(join(output, entry)), readFileSync(join(root, entry)), entry);
  for (const entry of [
    '.env',
    'modelos_excel',
    'tests',
    'scripts',
    'package.json',
    'README.md',
    'node_modules',
  ])
    assert.equal(existsSync(join(output, entry)), false, entry);
  writeFileSync(join(output, '__nao-publicar.txt'), 'Arquivo antigo fora do pacote público');
  build();
  assert.equal(existsSync(join(output, '__nao-publicar.txt')), false);
  const config = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
  assert.equal(config.outputDirectory, 'dist');
  assert.equal(config.buildCommand, 'npm run build');
  assert.equal(config.installCommand, '');
});
