// routes/inventory.js
const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');

// GET /api/inventory -> { sku: stock, ... }
router.get('/', async (req, res) => {
  try {
    const items = await Inventory.find({}, { _id: 0, sku: 1, stock: 1 }).lean();
    const map = {};
    for (const it of items) map[it.sku] = it.stock;
    res.json(map);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'Failed to load inventory' });
  }
});

// POST /api/checkout { cart: [{sku, qty}, ...] }
router.post('/checkout', async (req, res) => {
  try {
    const cart = Array.isArray(req.body.cart) ? req.body.cart : [];
    if (!cart.length) {
      return res.status(400).json({ ok: false, error: 'Cart is empty' });
    }

    // Sanitize
    for (const line of cart) {
      line.sku = String(line.sku || '').trim();
      line.qty = Math.max(1, parseInt(line.qty, 10) || 0);
      if (!line.sku || !Number.isFinite(line.qty)) {
        return res.status(400).json({ ok: false, error: 'Bad cart line' });
      }
    }

    // One-by-one conditional decrements with rollback list
    const decremented = []; // { sku, qty } that succeeded

    for (const line of cart) {
      // Only decrement if stock >= qty
      const result = await Inventory.updateOne(
        { sku: line.sku, stock: { $gte: line.qty } },
        { $inc: { stock: -line.qty } }
      );

      if (result.modifiedCount !== 1) {
        // Not enough stock for this line. Roll back previous decrements.
        for (const success of decremented) {
          await Inventory.updateOne(
            { sku: success.sku },
            { $inc: { stock: success.qty } }
          );
        }
        return res.status(409).json({
          ok: false,
          error: `Insufficient stock for ${line.sku}. Please adjust quantities.`
        });
      }

      decremented.push({ sku: line.sku, qty: line.qty });
    }

    // At this point, all decrements succeeded.
    // You could also create an Order record here if needed.
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: 'Checkout failed' });
  }
});

module.exports = router;
