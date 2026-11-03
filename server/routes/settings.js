import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { validateSettings } from '../validation.js';

const router = Router();
router.use(requireAuth);

const updateSettings = db.prepare(`
  UPDATE organizations
  SET default_low_stock_threshold = ?, updated_at = datetime('now')
  WHERE id = ?
`);

router.get('/', (req, res) => {
  res.json({
    settings: {
      organizationName: req.user.organizationName,
      defaultLowStockThreshold: req.user.defaultLowStockThreshold,
    },
  });
});

router.put('/', (req, res) => {
  const { defaultLowStockThreshold } = validateSettings(req.body);
  updateSettings.run(defaultLowStockThreshold, req.user.organizationId);
  res.json({
    settings: { organizationName: req.user.organizationName, defaultLowStockThreshold },
  });
});

export default router;
