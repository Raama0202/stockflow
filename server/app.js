import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { CLIENT_DIST } from './config.js';
import { errorHandler } from './errors.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import dashboardRoutes from './routes/dashboard.js';
import settingsRoutes from './routes/settings.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    next();
  });

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

  const indexHtml = path.join(CLIENT_DIST, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(CLIENT_DIST, { index: false, maxAge: '1h' }));
    // Hand every non-API route to the React router.
    app.get('/{*splat}', (req, res) => res.sendFile(indexHtml));
  } else {
    app.get('/', (req, res) =>
      res
        .status(503)
        .type('text')
        .send('Frontend not built yet. Run "npm run build" (or use run.bat) and restart.'),
    );
  }

  app.use(errorHandler);
  return app;
}
