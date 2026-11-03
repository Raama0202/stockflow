import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
const { createApp } = await import('../server/app.js');

let server;
let baseUrl;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

/** Minimal cookie-aware client so each test user keeps its own session. */
function client() {
  let cookie = '';
  return async (method, url, body) => {
    const res = await fetch(baseUrl + url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    return { status: res.status, body: await res.json() };
  };
}

async function signup(api, email, organizationName = 'Test Org') {
  const res = await api('POST', '/api/auth/signup', {
    email,
    password: 'password123',
    confirmPassword: 'password123',
    organizationName,
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.user;
}

const widget = (overrides = {}) => ({
  name: 'Widget',
  sku: 'W-1',
  quantityOnHand: 10,
  costPrice: 2.5,
  sellingPrice: 5,
  ...overrides,
});

describe('auth', () => {
  test('signup creates an organization and logs the user in', async () => {
    const api = client();
    const user = await signup(api, 'owner@example.com', 'My Test Store');
    assert.equal(user.organizationName, 'My Test Store');
    assert.equal(user.passwordHash, undefined);

    const me = await api('GET', '/api/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.user.email, 'owner@example.com');
  });

  test('signup validates input and rejects duplicate emails', async () => {
    const api = client();
    const bad = await api('POST', '/api/auth/signup', {
      email: 'nope',
      password: 'short',
      confirmPassword: 'different',
      organizationName: '',
    });
    assert.equal(bad.status, 400);
    assert.deepEqual(Object.keys(bad.body.fields).sort(), [
      'confirmPassword',
      'email',
      'organizationName',
      'password',
    ]);

    await signup(api, 'dupe@example.com');
    const dupe = await api('POST', '/api/auth/signup', {
      email: 'DUPE@example.com',
      password: 'password123',
      organizationName: 'Other',
    });
    assert.equal(dupe.status, 409);
  });

  test('login, logout and protected routes', async () => {
    const api = client();
    await signup(api, 'login@example.com');
    await api('POST', '/api/auth/logout');
    assert.equal((await api('GET', '/api/dashboard')).status, 401);

    const wrong = await api('POST', '/api/auth/login', {
      email: 'login@example.com',
      password: 'wrong-password',
    });
    assert.equal(wrong.status, 401);

    const ok = await api('POST', '/api/auth/login', {
      email: 'Login@Example.com',
      password: 'password123',
    });
    assert.equal(ok.status, 200);
    assert.equal((await api('GET', '/api/dashboard')).status, 200);
  });
});

describe('products', () => {
  test('full CRUD lifecycle', async () => {
    const api = client();
    await signup(api, 'crud@example.com');

    const created = await api('POST', '/api/products', widget({ description: 'Blue' }));
    assert.equal(created.status, 201);
    const id = created.body.product.id;
    assert.equal(created.body.product.effectiveThreshold, 5);
    assert.equal(created.body.product.isLowStock, false);

    const list = await api('GET', '/api/products');
    assert.equal(list.body.products.length, 1);

    const updated = await api('PUT', `/api/products/${id}`, widget({ quantityOnHand: 2 }));
    assert.equal(updated.status, 200);
    assert.equal(updated.body.product.quantityOnHand, 2);
    assert.equal(updated.body.product.isLowStock, true);
    assert.equal(updated.body.product.description, null);

    assert.equal((await api('DELETE', `/api/products/${id}`)).status, 200);
    assert.equal((await api('GET', `/api/products/${id}`)).status, 404);
  });

  test('validates fields and enforces unique SKU per organization', async () => {
    const api = client();
    await signup(api, 'sku@example.com');

    const invalid = await api('POST', '/api/products', {
      name: '',
      sku: '',
      quantityOnHand: 1.5,
      costPrice: -1,
    });
    assert.equal(invalid.status, 400);
    assert.ok(invalid.body.fields.name && invalid.body.fields.sku);
    assert.ok(invalid.body.fields.quantityOnHand && invalid.body.fields.costPrice);

    await api('POST', '/api/products', widget());
    const dupe = await api('POST', '/api/products', widget({ sku: 'w-1' }));
    assert.equal(dupe.status, 409);

    // Another organization can reuse the same SKU.
    const other = client();
    await signup(other, 'sku-other@example.com');
    assert.equal((await other('POST', '/api/products', widget())).status, 201);
  });

  test('search filters by name or SKU', async () => {
    const api = client();
    await signup(api, 'search@example.com');
    await api('POST', '/api/products', widget({ name: 'Red Apple', sku: 'FR-01' }));
    await api('POST', '/api/products', widget({ name: 'Banana', sku: 'FR-02' }));
    await api('POST', '/api/products', widget({ name: 'Carrot', sku: 'VG-01' }));

    const byName = await api('GET', '/api/products?search=apple');
    assert.deepEqual(byName.body.products.map((p) => p.sku), ['FR-01']);
    const bySku = await api('GET', '/api/products?search=FR-');
    assert.equal(bySku.body.products.length, 2);
  });

  test('stock adjustments cannot go negative', async () => {
    const api = client();
    await signup(api, 'adjust@example.com');
    const { id } = (await api('POST', '/api/products', widget())).body.product;

    const plus = await api('POST', `/api/products/${id}/adjust`, { delta: 5, note: 'Restock' });
    assert.equal(plus.body.product.quantityOnHand, 15);
    assert.equal(plus.body.product.lastStockNote, 'Restock');
    assert.equal(plus.body.product.lastUpdatedBy, 'adjust@example.com');

    const minus = await api('POST', `/api/products/${id}/adjust`, { delta: -20 });
    assert.equal(minus.status, 400);
    assert.equal((await api('GET', `/api/products/${id}`)).body.product.quantityOnHand, 15);
  });
});

describe('dashboard and settings', () => {
  test('summary and low stock use product or default threshold', async () => {
    const api = client();
    await signup(api, 'dash@example.com');
    await api('POST', '/api/products', widget({ sku: 'A', quantityOnHand: 10 }));
    await api('POST', '/api/products', widget({ sku: 'B', quantityOnHand: 4 }));
    await api('POST', '/api/products', widget({ sku: 'C', quantityOnHand: 12, lowStockThreshold: 20 }));

    let dash = (await api('GET', '/api/dashboard')).body;
    assert.equal(dash.summary.totalProducts, 3);
    assert.equal(dash.summary.totalQuantity, 26);
    assert.equal(dash.summary.inventoryValue, 65);
    assert.deepEqual(dash.lowStockItems.map((p) => p.sku), ['B', 'C']);

    const saved = await api('PUT', '/api/settings', { defaultLowStockThreshold: 10 });
    assert.equal(saved.status, 200);
    dash = (await api('GET', '/api/dashboard')).body;
    assert.deepEqual(dash.lowStockItems.map((p) => p.sku), ['B', 'A', 'C']);

    const bad = await api('PUT', '/api/settings', { defaultLowStockThreshold: -1 });
    assert.equal(bad.status, 400);
  });
});

describe('tenant isolation', () => {
  test('users cannot read or modify another organization\'s products', async () => {
    const alice = client();
    const bob = client();
    await signup(alice, 'alice@example.com', 'Alice Co');
    await signup(bob, 'bob@example.com', 'Bob Co');

    const { id } = (await alice('POST', '/api/products', widget())).body.product;

    assert.equal((await bob('GET', '/api/products')).body.products.length, 0);
    assert.equal((await bob('GET', `/api/products/${id}`)).status, 404);
    assert.equal((await bob('PUT', `/api/products/${id}`, widget({ name: 'Hacked' }))).status, 404);
    assert.equal((await bob('POST', `/api/products/${id}/adjust`, { delta: 1 })).status, 404);
    assert.equal((await bob('DELETE', `/api/products/${id}`)).status, 404);
    assert.equal((await bob('GET', '/api/dashboard')).body.summary.totalProducts, 0);

    const stillThere = await alice('GET', `/api/products/${id}`);
    assert.equal(stillThere.body.product.name, 'Widget');
  });
});
