// Start wrapper that installs global error handlers and starts the Next standalone server
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

process.env.HOSTNAME = '0.0.0.0';
const path = require('path');
const serverPath = path.join(__dirname, '.next', 'standalone', 'server.js');
try {
  require(serverPath);
} catch (e) {
  console.error('Failed to start standalone server:', e && e.stack ? e.stack : e);
  process.exit(1);
}
