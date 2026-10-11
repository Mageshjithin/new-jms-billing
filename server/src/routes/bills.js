import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { loadData, transaction, httpError } from '../db.js';

const router = Router();
const money = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
    const { bills } = await loadData();
    res.json({ bills: [...bills].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit) });
  } catch (error) { next(error); }
});

router.delete('/', async (_req, res, next) => {
  try {
    const deletedCount = await transaction((data) => {
      const count = data.bills.length;
      data.bills = [];
      return count;
    });
    res.json({ deletedCount });
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await transaction((data) => {
      const index = data.bills.findIndex((bill) => bill._id === req.params.id);
      if (index === -1) throw httpError(404, 'Bill not found.');
      data.bills.splice(index, 1);
    });
    res.json({ message: 'Bill deleted.' });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const requested = Array.isArray(req.body.items) ? req.body.items : [];
    if (!requested.length) return res.status(400).json({ message: 'Add at least one product to the bill.' });

    const quantities = new Map();
    for (const item of requested) {
      if (typeof item.productId !== 'string' || !item.productId || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) {
        return res.status(400).json({ message: 'Each item needs a valid product and whole-number quantity.' });
      }
      quantities.set(item.productId, (quantities.get(item.productId) || 0) + Number(item.quantity));
    }

    // Runs as one transaction: if anything fails, no stock is reduced and no bill is saved.
    const result = await transaction((data) => {
      const now = new Date().toISOString();
      const items = [];
      for (const [productId, quantity] of quantities) {
        const product = data.products.find((p) => p._id === productId && p.active);
        if (!product) throw httpError(400, 'One or more selected products are unavailable.');
        if (product.stock < quantity) throw httpError(409, `Not enough stock for ${product.name}. Refresh stock and try again.`);
        product.stock -= quantity;
        product.updatedAt = now;
        items.push({ productId, name: product.name, sku: product.sku, quantity, unitPrice: product.price, lineTotal: money(product.price * quantity) });
      }

      const subtotal = money(items.reduce((sum, item) => sum + item.lineTotal, 0));
      const discount = money(Number(req.body.discount) || 0);
      const gstPercent = Number(req.body.gstPercent) || 0;
      if (discount < 0 || discount > subtotal || gstPercent < 0 || gstPercent > 100) {
        throw httpError(400, 'Discount or GST value is outside the allowed range.');
      }
      const tax = money((subtotal - discount) * gstPercent / 100);
      const prefix = (process.env.INVOICE_PREFIX || 'JMS').replace(/[^A-Za-z0-9-]/g, '').slice(0, 10);
      let invoiceSequence = Number.isSafeInteger(data.invoiceSequence) && data.invoiceSequence >= 0
        ? data.invoiceSequence + 1
        : 1;
      let invoiceNo = `${prefix}-${now.slice(0, 10).replaceAll('-', '')}-${invoiceSequence}`;
      while (data.bills.some((existing) => existing.invoiceNo === invoiceNo)) {
        invoiceSequence += 1;
        invoiceNo = `${prefix}-${now.slice(0, 10).replaceAll('-', '')}-${invoiceSequence}`;
      }
      data.invoiceSequence = invoiceSequence;
      const bill = {
        _id: randomUUID(),
        invoiceNo,
        customerName: String(req.body.customerName || 'Walk-in customer').trim().slice(0, 100),
        customerPhone: String(req.body.customerPhone || '').trim().slice(0, 20),
        items,
        subtotal,
        discount,
        gstPercent,
        tax,
        total: money(subtotal - discount + tax),
        createdAt: now,
        updatedAt: now,
      };
      data.bills.push(bill);
      const remainingStock = items.map(({ productId }) => ({ productId, stock: data.products.find((p) => p._id === productId).stock }));
      return { bill, remainingStock };
    });
    return res.status(201).json(result);
  } catch (error) { return next(error); }
});

export default router;
