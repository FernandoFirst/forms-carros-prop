const { createServer } = require('../../scripts/serve.cjs');

module.exports = async () => {
  // No próprio processo do runner: o encerramento funciona também em sessões
  // Windows sem permissão de taskkill e não interfere no npm start do usuário.
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(4174, '127.0.0.1', resolve);
  });
  return async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  };
};
