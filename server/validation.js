import { ValidationError } from './errors.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

function text(fields, errors, key, label, { required = false, max = 255 } = {}) {
  const raw = fields[key];
  if (isBlank(raw)) {
    if (required) errors[key] = `${label} is required.`;
    return null;
  }
  if (typeof raw !== 'string') {
    errors[key] = `${label} must be text.`;
    return null;
  }
  const value = raw.trim();
  if (value.length > max) errors[key] = `${label} must be at most ${max} characters.`;
  return value;
}

function integer(fields, errors, key, label, { required = false, min = 0, max = 1_000_000_000 } = {}) {
  const raw = fields[key];
  if (isBlank(raw)) {
    if (required) errors[key] = `${label} is required.`;
    return null;
  }
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    errors[key] = `${label} must be a whole number.`;
    return null;
  }
  if (value < min || value > max) {
    errors[key] = `${label} must be between ${min} and ${max}.`;
    return null;
  }
  return value;
}

function money(fields, errors, key, label) {
  const raw = fields[key];
  if (isBlank(raw)) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000_000) {
    errors[key] = `${label} must be a positive amount.`;
    return null;
  }
  return Math.round(value * 100) / 100;
}

function finish(errors, value) {
  if (Object.keys(errors).length) throw new ValidationError(errors);
  return value;
}

export function validateSignup(body = {}) {
  const errors = {};
  const email = text(body, errors, 'email', 'Email', { required: true, max: 254 });
  if (email && !EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';

  const password = typeof body.password === 'string' ? body.password : '';
  if (!password) errors.password = 'Password is required.';
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
  else if (password.length > 128) errors.password = 'Password must be at most 128 characters.';

  if (body.confirmPassword !== undefined && body.confirmPassword !== password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  const organizationName = text(body, errors, 'organizationName', 'Organization name', {
    required: true,
    max: 120,
  });

  return finish(errors, { email: email?.toLowerCase(), password, organizationName });
}

export function validateLogin(body = {}) {
  const errors = {};
  const email = text(body, errors, 'email', 'Email', { required: true, max: 254 });
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password) errors.password = 'Password is required.';
  return finish(errors, { email: email?.toLowerCase(), password });
}

export function validateProduct(body = {}) {
  const errors = {};
  const product = {
    name: text(body, errors, 'name', 'Name', { required: true, max: 200 }),
    sku: text(body, errors, 'sku', 'SKU', { required: true, max: 64 }),
    description: text(body, errors, 'description', 'Description', { max: 2000 }),
    quantityOnHand: integer(body, errors, 'quantityOnHand', 'Quantity on hand', { required: true }),
    costPrice: money(body, errors, 'costPrice', 'Cost price'),
    sellingPrice: money(body, errors, 'sellingPrice', 'Selling price'),
    lowStockThreshold: integer(body, errors, 'lowStockThreshold', 'Low stock threshold', {
      max: 1_000_000,
    }),
  };
  if (product.sku && /\s/.test(product.sku)) errors.sku = 'SKU cannot contain spaces.';
  return finish(errors, product);
}

export function validateAdjustment(body = {}) {
  const errors = {};
  const delta = integer(body, errors, 'delta', 'Adjustment', {
    required: true,
    min: -1_000_000_000,
  });
  if (delta === 0) errors.delta = 'Adjustment cannot be zero.';
  const note = text(body, errors, 'note', 'Note', { max: 200 });
  return finish(errors, { delta, note });
}

export function validateSettings(body = {}) {
  const errors = {};
  const defaultLowStockThreshold = integer(
    body,
    errors,
    'defaultLowStockThreshold',
    'Default low stock threshold',
    { required: true, max: 1_000_000 },
  );
  return finish(errors, { defaultLowStockThreshold });
}

export function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}
