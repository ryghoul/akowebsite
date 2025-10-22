// server.js
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────
// Optional Stripe (guarded if key is missing)
// ─────────────────────────────────────────────────────────────
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = STRIPE_KEY ? require('stripe')(STRIPE_KEY) : null;

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────
const app = express();
const PORT = Number(process.env.PORT) || 3000;

const STATIC_DIR  = process.env.STATIC_DIR || 'public';
const STATIC_ROOT = path.resolve(__dirname, STATIC_DIR);
const PUBLIC_BASE_URL =
  (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/,'') || `http://localhost:${PORT}`;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS
  || 'https://akobylee.onrender.com,http://localhost:3000,http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD || '';
const TO_EMAIL = process.env.TO_EMAIL || EMAIL_USER;

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
const MONGO_DB  = process.env.MONGO_DB  || 'akoshop';

console.log('[STATIC ROOT]', STATIC_ROOT);
console.log('[BASE URL]', PUBLIC_BASE_URL);

// ─────────────────────────────────────────────────────────────
// DB (MongoDB)
// ─────────────────────────────────────────────────────────────
mongoose.connect(MONGO_URL, { dbName: MONGO_DB })
  .then(() => console.log('[mongo] connected', mongoose.connection.host, mongoose.connection.name))
  .catch(err => console.error('[mongo] connection error', err));

// Inventory model (use external file if present, else fallback)
let Inventory;
try {
  Inventory = require('./models/Inventory');
} catch {
  const { Schema, model } = mongoose;
  const InventorySchema = new Schema({
    sku:   { type: String, unique: true, index: true, required: true },
    stock: { type: Number, default: 0, min: 0 },
    price: { type: Number, default: 0, min: 0 },
    active:{ type: Boolean, default: true },
  }, { collection: 'inventories', timestamps: true });
  Inventory = model('Inventory', InventorySchema);
}

// ─────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    // allow same-origin / curl / mobile apps (no Origin header)
    if (!origin) return cb(null, true);
    cb(null, ALLOWED_ORIGINS.includes(origin));
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(STATIC_ROOT, { fallthrough: true }));

const exists = p => { try { return fs.existsSync(p); } catch { return false; } };

// ─────────────────────────────────────────────────────────────
// Debug & Health
// ─────────────────────────────────────────────────────────────
app.get('/debug/public-list', (_req, res) => {
  let list;
  try { list = fs.readdirSync(STATIC_ROOT); } catch { list = ['<missing public/>']; }
  res.json({ STATIC_ROOT, list });
});
app.get('/health', (_req, res) => res.json({ ok: true }));

// ─────────────────────────────────────────────────────────────
// Pages (explicit routes)
// ─────────────────────────────────────────────────────────────
const successFile = path.join(STATIC_ROOT, 'success.html');
const shopFile    = path.join(STATIC_ROOT, 'shop.html');
const indexFile   = path.join(STATIC_ROOT, 'index.html');

app.get('/success', (_req, res) => res.sendFile(successFile));
app.get('/success.html', (_req, res) => res.sendFile(successFile));
app.get('/shop', (_req, res) => exists(shopFile) ? res.sendFile(shopFile) : res.redirect('/success.html'));
app.get('/shop.html', (_req, res) => exists(shopFile) ? res.sendFile(shopFile) : res.redirect('/success.html'));

app.get('/', (_req, res) => {
  const file = exists(indexFile) ? indexFile : exists(shopFile) ? shopFile : successFile;
  res.sendFile(file, err => {
    if (err) res.status(404).send('No landing page. Ensure public/index.html or success.html exists.');
  });
});

// ─────────────────────────────────────────────────────────────
// Contact Mailer (Gmail App Password)
// ─────────────────────────────────────────────────────────────
const corsMW = cors({ origin: ALLOWED_ORIGINS });

let contactTransporter = null;
function getTransporter() {
  if (contactTransporter) return contactTransporter;
  if (!EMAIL_USER || !EMAIL_APP_PASSWORD) throw new Error('Missing EMAIL_USER or EMAIL_APP_PASSWORD env');
  contactTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_APP_PASSWORD },
  });
  return contactTransporter;
}

const clean = (s, max = 4000) =>
  String(s ?? '').replace(/[\x00-\x08\x0B-\x1F\x7F]/g, '').slice(0, max).trim();
const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const lastHitByIp = new Map(); // naive spam throttle

app.options('/contact', corsMW);
app.post('/contact', corsMW, async (req, res) => {
  try {
    const ip = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim()
             || req.socket.remoteAddress || 'unknown';
    const now = Date.now(), last = lastHitByIp.get(ip) || 0;
    if (now - last < 20000) return res.status(429).json({ message: 'Please wait before sending again.' });
    lastHitByIp.set(ip, now);

    const name    = clean(req.body?.name, 80);
    const email   = clean(req.body?.email, 254);
    const message = clean(req.body?.message, 4000);
    const honey   = clean(req.body?.website || '', 50);

    if (honey) return res.status(200).json({ message: 'Thanks!' });
    if (!name || !email || !message) return res.status(400).json({ message: 'Name, email, and message are required.' });
    if (!isEmail(email)) return res.status(400).json({ message: 'Please provide a valid email address.' });

    const transporter = getTransporter();
    transporter.verify().catch(() => {});

    await transporter.sendMail({
      from: `"AKO Contact" <${EMAIL_USER}>`,
      to: TO_EMAIL,
      replyTo: email,
      subject: `New message from ${name}`,
      text: message,
      html: `<p><b>Name:</b> ${name}</p>
             <p><b>Email:</b> ${email}</p>
             <p>${message.replace(/\n/g,'<br>')}</p>`,
    });

    res.json({ message: 'Thanks! Your message has been sent.' });
  } catch (err) {
    const msg = err?.response || err?.message || 'Failed to send email. Check server logs.';
    console.error('[contact] error:', msg);
    res.status(500).json({ message: msg });
  }
});

// ─────────────────────────────────────────────────────────────
// Stripe: Create Checkout Session  (only if Stripe is configured)
// ─────────────────────────────────────────────────────────────
if (stripe) {
  app.post('/create-checkout-session', async (req, res) => {
    try {
      const { items = [], customer } = req.body || {};
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'No items in request.' });
      }

      const line_items = items.map(i => ({
        price_data: {
          currency: 'usd',
          product_data: { name: i.name },
          unit_amount: i.price, // cents
        },
        quantity: i.quantity,
        adjustable_quantity: { enabled: true, minimum: 1, maximum: 10 },
      }));

      const successUrl = `${PUBLIC_BASE_URL}/success.html?paid=1&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl  = exists(shopFile)
        ? `${PUBLIC_BASE_URL}/shop.html?canceled=1`
        : `${PUBLIC_BASE_URL}/success.html?canceled=1`;

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items,
        customer_email: customer?.email,
        shipping_address_collection: { allowed_countries: ['US','CA','GB','AU','JP','DE','FR','MX','SG'] },
        success_url: successUrl,
        cancel_url:  cancelUrl,
      });

      res.json({ url: session.url });
    } catch (e) {
      console.error('Stripe error:', e);
      res.status(500).json({ error: e?.raw?.message || e.message || 'Unable to create checkout session' });
    }
  });

  // Confirm Order (no webhook) → send emails
  const emailedSessions = new Set();
  function tryGetMailer() { try { return getTransporter(); } catch { return null; } }

  app.get('/api/confirm-order', async (req, res) => {
    try {
      const session_id = req.query.session_id || req.query.sessionId;
      if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ['line_items', 'customer_details'],
      });

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ error: 'Payment not completed', status: session.payment_status });
      }

      const mailer = tryGetMailer();
      if (mailer && !emailedSessions.has(session_id)) {
        const items = session.line_items?.data || [];
        const customerEmail = session.customer_details?.email || session.customer_email;
        const name = session.customer_details?.name || 'Customer';
        const amountTotal = (session.amount_total || 0) / 100;
        const currency = (session.currency || 'usd').toUpperCase();

        const list = items.map(i => {
          const unit = (i.price?.unit_amount || 0) / 100;
          const desc = i.description || i.price?.product || 'Item';
          return `• ${desc} — ${i.quantity} × $${unit.toFixed(2)}`;
        }).join('\n');

        const receiptText = `Thanks for your order, ${name}!

Order Summary
${list || '(no items?)'}

Total: $${amountTotal.toFixed(2)} ${currency}

— AKO by Lee`;

        if (customerEmail) {
          await mailer.sendMail({
            from: EMAIL_USER,
            to: customerEmail,
            subject: 'AKO by Lee — Order Confirmation',
            text: receiptText,
          });
        }

        await mailer.sendMail({
          from: EMAIL_USER,
          to: TO_EMAIL || EMAIL_USER,
          subject: `New Order — ${customerEmail || name}`,
          text: `Session: ${session.id}
Email: ${customerEmail || 'N/A'}
Name: ${name}
Total: $${amountTotal.toFixed(2)} ${currency}

Items:
${list || '(no items?)'}`,
        });

        emailedSessions.add(session_id);
      }

      res.json({ ok: true, emailed: true });
    } catch (err) {
      console.error('Confirm-order error:', err);
      res.status(500).json({ error: err.message });
    }
  });
}

// ─────────────────────────────────────────────────────────────
// Inventory API (atomic decrement, no replica set required)
// ─────────────────────────────────────────────────────────────

// GET /api/inventory  -> { "sku": stock, ... }
app.get('/api/inventory', async (_req, res) => {
  try {
    const items = await Inventory.find({}, { _id: 0, sku: 1, stock: 1 }).lean();
    const map = {};
    for (const it of items) map[it.sku] = it.stock;
    res.json(map);
  } catch (e) {
    console.error('[inventory] load error:', e);
    res.status(500).json({ ok: false, error: 'Failed to load inventory' });
  }
});

// POST /api/checkout { cart:[{sku,qty}] }
app.post('/api/checkout', async (req, res) => {
  try {
    const cart = Array.isArray(req.body.cart) ? req.body.cart : [];
    if (!cart.length) return res.status(400).json({ ok: false, error: 'Cart is empty' });

    // sanitize
    for (const line of cart) {
      line.sku = String(line.sku || '').trim();
      line.qty = Math.max(1, parseInt(line.qty, 10) || 0);
      if (!line.sku || !Number.isFinite(line.qty)) {
        return res.status(400).json({ ok: false, error: 'Bad cart line' });
      }
    }

    const decremented = [];

    // one-by-one guarded decrements + rollback on failure
    for (const line of cart) {
      const result = await Inventory.updateOne(
        { sku: line.sku, stock: { $gte: line.qty } },
        { $inc: { stock: -line.qty } }
      );

      if (result.modifiedCount !== 1) {
        // rollback
        for (const prev of decremented) {
          await Inventory.updateOne({ sku: prev.sku }, { $inc: { stock: prev.qty } });
        }
        return res.status(409).json({ ok: false, error: `Insufficient stock for ${line.sku}.` });
      }
      decremented.push({ sku: line.sku, qty: line.qty });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('[checkout] error:', e);
    res.status(500).json({ ok: false, error: 'Checkout failed' });
  }
});

// ─────────────────────────────────────────────────────────────
// Catch-all for client routes (after APIs)
// ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api') || req.path.startsWith('/debug')) return next();

  const fallback = exists(indexFile) ? indexFile : exists(shopFile) ? shopFile : successFile;
  res.sendFile(fallback, err => {
    if (err) res.status(404).send('No fallback page. Ensure public/index.html exists.');
  });
});

// ─────────────────────────────────────────────────────────────
// Start server (single .listen!)
// ─────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
