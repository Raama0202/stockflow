import { exec } from 'node:child_process';
import { createApp } from './app.js';
import { DB_PATH, PORT } from './config.js';

const app = createApp();

const server = app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  StockFlow is running at ${url}`);
  console.log(`  Database: ${DB_PATH}`);
  console.log('  Press Ctrl+C to stop.\n');

  if (process.env.OPEN_BROWSER === '1') {
    const opener =
      process.platform === 'win32'
        ? `start "" "${url}"`
        : process.platform === 'darwin'
          ? `open "${url}"`
          : `xdg-open "${url}"`;
    exec(opener);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Port ${PORT} is already in use. Close the other app or set PORT to a free port.\n`);
    process.exit(1);
  }
  throw err;
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
