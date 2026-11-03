import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import { db, transaction } from './db.js';

export const DEMO_EMAIL = 'demo@stockflow.app';
export const DEMO_PASSWORD = 'demo1234';
export const DEMO_ENABLED = process.env.DEMO_ACCOUNT !== 'off';

const DEMO_PRODUCTS = [
  ['Wireless Mouse', 'WM-1001', 'Ergonomic 2.4GHz wireless mouse', 42, 6.5, 14.99, 10],
  ['Mechanical Keyboard', 'KB-2040', 'Tenkeyless, brown switches', 3, 38, 79, 5],
  ['USB-C Cable 1m', 'CB-USBC-1', 'Braided, 60W charging', 120, 1.2, 6.99, 25],
  ['27" Monitor', 'MN-2701', '1440p IPS panel', 2, 165, 289, null],
  ['Laptop Stand', 'LS-0300', 'Adjustable aluminium stand', 0, 12, 34.5, 4],
  ['Webcam HD', 'WC-1080', '1080p with privacy shutter', 17, 18, 45, null],
  ['Noise-Cancelling Headset', 'HS-NC-77', 'Over-ear, Bluetooth 5.3', 8, 55, 129, 8],
  ['Desk Mat XL', 'DM-XL-90', '90x40cm stitched edges', 31, 4, 19.99, null],
];

/**
 * Makes sure the demo account exists and its password is DEMO_PASSWORD.
 * Returns 'created', 'repaired' or 'ok'.
 */
export function ensureDemoAccount() {
  const existing = db
    .prepare('SELECT id, password_hash AS passwordHash FROM users WHERE email = ?')
    .get(DEMO_EMAIL);

  if (existing) {
    if (bcrypt.compareSync(DEMO_PASSWORD, existing.passwordHash)) return 'ok';
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
      bcrypt.hashSync(DEMO_PASSWORD, 10),
      existing.id,
    );
    return 'repaired';
  }

  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  transaction(() => {
    const org = db.prepare('INSERT INTO organizations (name) VALUES (?)').run('Demo Electronics Store');
    const orgId = Number(org.lastInsertRowid);
    const user = db
      .prepare('INSERT INTO users (organization_id, email, password_hash) VALUES (?, ?, ?)')
      .run(orgId, DEMO_EMAIL, hash);
    const insert = db.prepare(`
      INSERT INTO products (organization_id, name, sku, description, quantity_on_hand,
                            cost_price, selling_price, low_stock_threshold, last_updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of DEMO_PRODUCTS) insert.run(orgId, ...p, Number(user.lastInsertRowid));
  });
  return 'created';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  ensureDemoAccount();
  console.log(`  Demo account ready: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}
