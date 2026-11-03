import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { HttpError } from './errors.js';
import { JWT_SECRET, SESSION_COOKIE, SESSION_TTL_SECONDS } from './config.js';

const findSessionUser = db.prepare(`
  SELECT u.id, u.email, u.organization_id AS organizationId,
         o.name AS organizationName, o.default_low_stock_threshold AS defaultLowStockThreshold
  FROM users u
  JOIN organizations o ON o.id = u.organization_id
  WHERE u.id = ?
`);

export function issueSession(res, user) {
  const token = jwt.sign({ sub: String(user.id), org: user.organizationId }, JWT_SECRET, {
    expiresIn: SESSION_TTL_SECONDS,
  });
  res.cookie(SESSION_COOKIE, token, {
    ...cookieOptions(res),
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export function clearSession(res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions(res));
}

// `req.secure` honours X-Forwarded-Proto (trust proxy), so HTTPS hosts get Secure cookies
// while plain-HTTP local runs still work.
const cookieOptions = (res) => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: res.req.secure,
  path: '/',
});

/** Loads the signed-in user into `req.user`; rejects the request otherwise. */
export function requireAuth(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) throw new HttpError(401, 'Please log in to continue.');

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    clearSession(res);
    throw new HttpError(401, 'Your session has expired. Please log in again.');
  }

  const user = findSessionUser.get(Number(payload.sub));
  if (!user) {
    clearSession(res);
    throw new HttpError(401, 'Please log in to continue.');
  }
  req.user = user;
  next();
}
