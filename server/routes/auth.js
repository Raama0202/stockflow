import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db, transaction } from '../db.js';
import { HttpError } from '../errors.js';
import { validateLogin, validateSignup } from '../validation.js';
import { clearSession, issueSession, requireAuth } from '../auth.js';
import { DEMO_EMAIL, DEMO_ENABLED, DEMO_PASSWORD, ensureDemoAccount } from '../seed.js';

const router = Router();

const findUserByEmail = db.prepare(`
  SELECT u.id, u.email, u.password_hash AS passwordHash, u.organization_id AS organizationId,
         o.name AS organizationName, o.default_low_stock_threshold AS defaultLowStockThreshold
  FROM users u
  JOIN organizations o ON o.id = u.organization_id
  WHERE u.email = ?
`);
const insertOrg = db.prepare('INSERT INTO organizations (name) VALUES (?)');
const insertUser = db.prepare(
  'INSERT INTO users (organization_id, email, password_hash) VALUES (?, ?, ?)',
);

// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const publicUser = ({ passwordHash, ...user }) => user;

router.post('/signup', async (req, res) => {
  const { email, password, organizationName } = validateSignup(req.body);

  if (findUserByEmail.get(email)) {
    throw new HttpError(409, 'An account with this email already exists.', {
      email: 'An account with this email already exists.',
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = transaction(() => {
    const org = insertOrg.run(organizationName);
    const organizationId = Number(org.lastInsertRowid);
    insertUser.run(organizationId, email, passwordHash);
    return findUserByEmail.get(email);
  });

  issueSession(res, user);
  res.status(201).json({ user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = validateLogin(req.body);
  const user = findUserByEmail.get(email);
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !valid) throw new HttpError(401, 'Invalid email or password.');

  issueSession(res, user);
  res.json({ user: publicUser(user) });
});

router.get('/demo', (req, res) => {
  res.json(
    DEMO_ENABLED
      ? { enabled: true, email: DEMO_EMAIL, password: DEMO_PASSWORD }
      : { enabled: false },
  );
});

router.post('/demo', (req, res) => {
  if (!DEMO_ENABLED) throw new HttpError(404, 'The demo account is disabled.');
  ensureDemoAccount();
  const user = findUserByEmail.get(DEMO_EMAIL);
  issueSession(res, user);
  res.json({ user: publicUser(user) });
});

router.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
