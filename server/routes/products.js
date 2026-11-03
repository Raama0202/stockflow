import { Router } from 'express';
import { db } from '../db.js';
import { HttpError } from '../errors.js';
import { requireAuth } from '../auth.js';
import { parseId, validateAdjustment, validateProduct } from '../validation.js';

const router = Router();
router.use(requireAuth);

// Every query is filtered by organization_id so tenants can never see each other's data.
const PRODUCT_COLUMNS = `
  p.id, p.name, p.sku, p.description,
  p.quantity_on_hand AS quantityOnHand,
  p.cost_price AS costPrice,
  p.selling_price AS sellingPrice,
  p.low_stock_threshold AS lowStockThreshold,
  COALESCE(p.low_stock_threshold, o.default_low_stock_threshold) AS effectiveThreshold,
  p.quantity_on_hand <= COALESCE(p.low_stock_threshold, o.default_low_stock_threshold) AS isLowStock,
  p.last_stock_note AS lastStockNote,
  u.email AS lastUpdatedBy,
  p.created_at AS createdAt,
  p.updated_at AS updatedAt
`;
const FROM = `
  FROM products p
  JOIN organizations o ON o.id = p.organization_id
  LEFT JOIN users u ON u.id = p.last_updated_by
`;

const listProducts = db.prepare(`
  SELECT ${PRODUCT_COLUMNS} ${FROM}
  WHERE p.organization_id = :org
    AND (:search IS NULL OR p.name LIKE :search ESCAPE '\\' OR p.sku LIKE :search ESCAPE '\\')
    AND (:lowOnly = 0 OR p.quantity_on_hand <= COALESCE(p.low_stock_threshold, o.default_low_stock_threshold))
  ORDER BY p.name COLLATE NOCASE
`);
const getProduct = db.prepare(`
  SELECT ${PRODUCT_COLUMNS} ${FROM} WHERE p.id = ? AND p.organization_id = ?
`);
const findSku = db.prepare(
  'SELECT id FROM products WHERE organization_id = ? AND sku = ? AND id != ?',
);
const insertProduct = db.prepare(`
  INSERT INTO products (organization_id, name, sku, description, quantity_on_hand, cost_price,
                        selling_price, low_stock_threshold, last_updated_by)
  VALUES (:org, :name, :sku, :description, :quantityOnHand, :costPrice,
          :sellingPrice, :lowStockThreshold, :userId)
`);
const updateProduct = db.prepare(`
  UPDATE products
  SET name = :name, sku = :sku, description = :description, quantity_on_hand = :quantityOnHand,
      cost_price = :costPrice, selling_price = :sellingPrice,
      low_stock_threshold = :lowStockThreshold, last_updated_by = :userId,
      updated_at = datetime('now')
  WHERE id = :id AND organization_id = :org
`);
const adjustStock = db.prepare(`
  UPDATE products
  SET quantity_on_hand = quantity_on_hand + :delta, last_stock_note = :note,
      last_updated_by = :userId, updated_at = datetime('now')
  WHERE id = :id AND organization_id = :org AND quantity_on_hand + :delta >= 0
`);
const deleteProduct = db.prepare('DELETE FROM products WHERE id = ? AND organization_id = ?');

const toProduct = (row) => row && { ...row, isLowStock: Boolean(row.isLowStock) };

function loadProduct(req) {
  const id = parseId(req.params.id);
  const product = id && getProduct.get(id, req.user.organizationId);
  if (!product) throw new HttpError(404, 'Product not found.');
  return toProduct(product);
}

function assertSkuAvailable(orgId, sku, excludeId = 0) {
  if (findSku.get(orgId, sku, excludeId)) {
    throw new HttpError(409, 'A product with this SKU already exists.', {
      sku: 'This SKU is already used by another product.',
    });
  }
}

router.get('/', (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const rows = listProducts.all({
    org: req.user.organizationId,
    search: search ? `%${search.replace(/[\\%_]/g, '\\$&')}%` : null,
    lowOnly: req.query.lowStock === 'true' ? 1 : 0,
  });
  res.json({ products: rows.map(toProduct) });
});

router.get('/:id', (req, res) => {
  res.json({ product: loadProduct(req) });
});

router.post('/', (req, res) => {
  const data = validateProduct(req.body);
  assertSkuAvailable(req.user.organizationId, data.sku);
  const result = insertProduct.run({ ...data, org: req.user.organizationId, userId: req.user.id });
  const product = toProduct(getProduct.get(Number(result.lastInsertRowid), req.user.organizationId));
  res.status(201).json({ product });
});

router.put('/:id', (req, res) => {
  const existing = loadProduct(req);
  const data = validateProduct(req.body);
  assertSkuAvailable(req.user.organizationId, data.sku, existing.id);
  updateProduct.run({
    ...data,
    id: existing.id,
    org: req.user.organizationId,
    userId: req.user.id,
  });
  res.json({ product: toProduct(getProduct.get(existing.id, req.user.organizationId)) });
});

router.post('/:id/adjust', (req, res) => {
  const existing = loadProduct(req);
  const { delta, note } = validateAdjustment(req.body);
  const result = adjustStock.run({
    delta,
    note,
    id: existing.id,
    org: req.user.organizationId,
    userId: req.user.id,
  });
  if (result.changes === 0) {
    throw new HttpError(400, 'Stock cannot go below zero.', {
      delta: `Only ${existing.quantityOnHand} units on hand.`,
    });
  }
  res.json({ product: toProduct(getProduct.get(existing.id, req.user.organizationId)) });
});

router.delete('/:id', (req, res) => {
  const existing = loadProduct(req);
  deleteProduct.run(existing.id, req.user.organizationId);
  res.json({ ok: true });
});

export default router;
