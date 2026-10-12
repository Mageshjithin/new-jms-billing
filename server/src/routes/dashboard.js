import { Router } from 'express';
import { loadData } from '../db.js';

const router = Router();
router.get('/summary', async (_req, res, next) => {
  try {
    const istNow = new Date(Date.now() + 330 * 60 * 1000);
    const start = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()) - 330 * 60 * 1000).toISOString();
    const { products, bills } = await loadData();
    const today = bills.filter((b) => b.createdAt >= start);
    const active = products.filter((p) => p.active);
    res.json({ summary: {
      todaySales: Math.round(today.reduce((sum, b) => sum + b.total, 0) * 100) / 100,
      todayBills: today.length,
      productCount: active.length,
      lowStock: active.filter((p) => p.stock <= 5).length,
      billCount: bills.length,
    } });
  } catch (error) { next(error); }
});
export default router;
