const { copyFileSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
mkdirSync(join(root, 'vendor'), { recursive: true });
for (const [source, destination] of [
  ['dist/exceljs.min.js', 'exceljs.min.js'],
  ['LICENSE', 'EXCELJS-LICENSE.txt'],
]) {
  copyFileSync(join(root, 'node_modules/exceljs', source), join(root, 'vendor', destination));
}
console.log('ExcelJS 4.4.0 e licença copiados para vendor/.');
