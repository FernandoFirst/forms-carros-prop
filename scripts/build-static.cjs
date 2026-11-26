const { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, rmSync } = require('node:fs');
const { resolve, join, dirname, basename, sep } = require('node:path');

const root = resolve(__dirname, '..');
const output = join(root, 'dist');
const entries = ['index.html', 'assets', 'css', 'js', 'vendor'];

// A limpeza se limita à pasta gerada deste projeto, inclusive no Windows.
if (
  dirname(output) !== root ||
  basename(output) !== 'dist' ||
  (existsSync(output) && lstatSync(output).isSymbolicLink())
)
  throw new Error('Diretório de publicação inválido.');

for (const entry of entries) {
  if (!existsSync(join(root, entry))) throw new Error(`Arquivo de publicação ausente: ${entry}`);
}
rmSync(output, { recursive: true, force: true });
mkdirSync(output);
for (const entry of entries)
  cpSync(join(root, entry), join(output, entry), {
    recursive: true,
    filter(source) {
      if (lstatSync(source).isSymbolicLink())
        throw new Error('Links simbólicos não são aceitos na publicação.');
      return true;
    },
  });

// Detectar referências locais ausentes antes de publicar uma tela incompleta.
const html = readFileSync(join(output, 'index.html'), 'utf8');
for (const [, reference] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  if (reference.startsWith('#') || /^https?:/.test(reference)) continue;
  const target = resolve(output, reference);
  if (!target.startsWith(output + sep) || !existsSync(target))
    throw new Error(`Referência inválida na publicação: ${reference}`);
}
console.log(
  'Publicação estática pronta em dist/: HTML, estilos, scripts, imagens e ExcelJS local.',
);
