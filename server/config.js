import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT_DIR = path.resolve(__dirname, '..');
export const DATA_DIR = process.env.DATA_DIR || path.join(ROOT_DIR, 'data');
export const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'stockflow.db');
export const CLIENT_DIST = path.join(ROOT_DIR, 'client', 'dist');
export const PORT = Number(process.env.PORT) || 3000;
export const GLOBAL_DEFAULT_LOW_STOCK = 5;
export const SESSION_COOKIE = 'sf_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function resolveJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  // Persist a generated secret so sessions survive local restarts.
  if (DB_PATH === ':memory:') return crypto.randomBytes(32).toString('hex');
  const secretFile = path.join(DATA_DIR, '.jwt-secret');
  try {
    return fs.readFileSync(secretFile, 'utf8').trim();
  } catch {
    const secret = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(secretFile, secret);
    return secret;
  }
}

export const JWT_SECRET = resolveJwtSecret();
