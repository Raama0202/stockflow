import { exec } from 'node:child_process';
import http from 'node:http';
import { createApp } from './app.js';
import { DB_PATH, PORT } from './config.js';
import { DEMO_EMAIL, DEMO_ENABLED, DEMO_PASSWORD, ensureDemoAccount } from './seed.js';

const MAX_PORT_ATTEMPTS = 10;
// run.bat checks for this code to close quietly instead of reporting a stop.
const EXIT_ALREADY_RUNNING = 3;

if (DEMO_ENABLED) ensureDemoAccount();

const app = createApp();

function openBrowser(url) {
  if (process.env.OPEN_BROWSER !== '1') return;
  const opener =
    process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(opener);
}

async function isStockFlowRunning(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, {
      signal: AbortSignal.timeout(1500),
    });
    return (await res.json()).app === 'stockflow';
  } catch {
    return false;
  }
}

function listen(port, attempt = 1) {
  const server = http.createServer(app);
  server.listen(port);

  server.once('listening', () => {
    const url = `http://localhost:${port}`;
    console.log(`\n  StockFlow is running at ${url}`);
    console.log(`  Database: ${DB_PATH}`);
    if (DEMO_ENABLED) console.log(`  Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
    console.log('  Press Ctrl+C to stop.\n');
    openBrowser(url);
  });

  server.once('error', async (err) => {
    if (err.code !== 'EADDRINUSE') throw err;

    if (await isStockFlowRunning(port)) {
      const url = `http://localhost:${port}`;
      console.log(`\n  StockFlow is already running at ${url} - opening it.\n`);
      openBrowser(url);
      process.exit(EXIT_ALREADY_RUNNING);
    }
    if (attempt >= MAX_PORT_ATTEMPTS) {
      console.error(`\n  Ports ${PORT}-${port} are all in use. Set PORT to a free port and try again.\n`);
      process.exit(1);
    }
    console.log(`  Port ${port} is busy, trying ${port + 1}...`);
    listen(port + 1, attempt + 1);
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => server.close(() => process.exit(0)));
  }
}

listen(PORT);
