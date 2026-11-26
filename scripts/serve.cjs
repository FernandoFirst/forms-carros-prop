const http = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

const root = resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function createServer() {
  return http.createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      // O servidor de desenvolvimento expõe somente os arquivos públicos da aplicação.
      const relative = file
        .slice(root.length + 1)
        .split(sep)
        .join('/');
      if (
        !file.startsWith(root + sep) ||
        !(relative === 'index.html' || /^(css|js|vendor|assets)\//.test(relative)) ||
        !types[extname(file)]
      ) {
        response.writeHead(404).end('Não encontrado');
        return;
      }
      const body = await readFile(file);
      response
        .writeHead(200, {
          'Content-Type': types[extname(file)],
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        })
        .end(body);
    } catch {
      response.writeHead(404).end('Não encontrado');
    }
  });
}

if (require.main === module) {
  createServer().listen(port, '127.0.0.1', () => {
    console.log(`Aplicação em http://127.0.0.1:${port} — Ctrl+C para encerrar.`);
  });
}

module.exports = { createServer };
