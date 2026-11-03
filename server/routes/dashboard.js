import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const summary = db.prepare(`
  SELECT COUNT(p.id) AS totalProducts,
         COALESCE(SUM(p.quantity_on_hand), 0) AS totalQuantity,
         COALESCE(SUM(p.quantity_on_hand * p.cost_price), 0) AS inventoryValue,
         COALESCE(SUM(p.quantity_on_hand <= COALESCE(p.low_stock_threshold, o.default_low_stock_threshold)), 0)
           AS lowStockCount
  FROM organizations o
  LEFT JOIN products p ON p.organization_id = o.id
  WHERE o.id = ?
`);

const lowStock = db.prepare(`
  SELECT p.id, p.name, p.sku,
         p.quantity_on_hand AS quantityOnHand,
         p.low_stock_threshold AS lowStockThreshold,
         COALESCE(p.low_stock_threshold, o.default_low_stock_threshold) AS effectiveThreshold
  FROM products p
  JOIN organizations o ON o.id = p.organization_id
  WHERE p.organization_id = ?
    AND p.quantity_on_hand <= COALESCE(p.low_stock_threshold, o.default_low_stock_threshold)
  ORDER BY p.quantity_on_hand ASC, p.name COLLATE NOCASE
`);

router.get('/', (req, res) => {
  const orgId = req.user.organizationId;
  const totals = summary.get(orgId);
  res.json({
    summary: {
      ...totals,
      inventoryValue: Math.round(totals.inventoryValue * 100) / 100,
      defaultLowStockThreshold: req.user.defaultLowStockThreshold,
    },
    lowStockItems: lowStock.all(orgId),
  });
});

export default router;
