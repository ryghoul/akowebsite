// server.js
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const cookie = require('cookie');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const packageJson = require('./package.json');

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

const repoUrl = String(packageJson.repository?.url || '');
const repoMatch = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/i);
const GITHUB_OWNER = process.env.GITHUB_OWNER || (repoMatch ? repoMatch[1] : '');
const GITHUB_REPO = process.env.GITHUB_REPO || (repoMatch ? repoMatch[2] : '');
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const MENU_STATE_REPO_PATH = process.env.MENU_STATE_REPO_PATH || 'data/menu-state.json';
const SHOP_CATALOG_REPO_PATH = process.env.SHOP_CATALOG_REPO_PATH || 'data/shop-catalog.json';

const ADMIN_USER = process.env.ADMIN_USER || 'akostaff';
const ADMIN_PASS = process.env.ADMIN_PASS || 'teaparasaamin';
const ADMIN_COOKIE_NAME = 'ako_admin_session';
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'ako-admin-session-secret';

const DATA_DIR = path.resolve(__dirname, 'data');
const MENU_STATE_FILE = process.env.MENU_STATE_FILE || path.join(DATA_DIR, 'menu-state.json');

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

const Product = require('./models/Product');
const OrderEvent = require('./models/OrderEvent');

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
// Default 100kb is too small for the shop/menu editors' staged image uploads —
// a picked photo rides along as a base64 data URL in the regular Save/Edit
// request body (not just the dedicated /api/github/upload-image route), and
// base64 adds ~33% overhead on top of the 5MB image cap enforced there.
app.use(express.json({ limit: '8mb' }));
app.use(express.static(STATIC_ROOT, { fallthrough: true }));

const exists = p => { try { return fs.existsSync(p); } catch { return false; } };

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonFile(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function loadSavedMenuSnapshot() {
  if (!exists(MENU_STATE_FILE)) return null;
  return readJsonFile(MENU_STATE_FILE);
}

function isValidMenuSnapshot(snapshot) {
  return isPlainObject(snapshot)
    && isPlainObject(snapshot.menuData)
    && isPlainObject(snapshot.menuImages)
    && Array.isArray(snapshot.archiveItems)
    && Array.isArray(snapshot.currentSections);
}

function signAdminPayload(payload) {
  return crypto
    .createHmac('sha256', ADMIN_SESSION_SECRET)
    .update(payload)
    .digest('base64url');
}

function createAdminSessionToken(username) {
  const payload = Buffer.from(JSON.stringify({
    username,
    exp: Date.now() + ADMIN_SESSION_TTL_MS,
  })).toString('base64url');
  return `${payload}.${signAdminPayload(payload)}`;
}

function verifyAdminSessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = signAdminPayload(payload);
  if (signature !== expected) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed || parsed.exp < Date.now() || parsed.username !== ADMIN_USER) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readAdminSession(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  return verifyAdminSessionToken(cookies[ADMIN_COOKIE_NAME]);
}

function setAdminSessionCookie(res, token) {
  res.append('Set-Cookie', cookie.serialize(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(ADMIN_SESSION_TTL_MS / 1000),
    expires: new Date(Date.now() + ADMIN_SESSION_TTL_MS),
  }));
}

function clearAdminSessionCookie(res) {
  res.append('Set-Cookie', cookie.serialize(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  }));
}

function requireAdmin(req, res, next) {
  const session = readAdminSession(req);
  if (!session) return res.status(401).json({ ok: false, error: 'Admin sign-in required.' });
  req.adminSession = session;
  next();
}

// Commits (creates or updates) a single file in the GitHub repo via the
// Contents API — get-sha-then-PUT, so it works whether the file already
// exists or not. `base64Content` must already be base64-encoded (callers
// decide whether they're encoding JSON text or binary image data).
async function commitFileToGitHub(repoPath, base64Content, commitMessage) {
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    throw new Error('GitHub publishing is not configured. Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO.');
  }

  if (typeof fetch !== 'function') {
    throw new Error('This Node runtime does not provide fetch().');
  }

  const encodedPath = repoPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
  const url = `https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/contents/${encodedPath}`;
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ako-editor',
  };

  let sha;
  const existingResponse = await fetch(`${url}?ref=${encodeURIComponent(GITHUB_BRANCH)}`, { headers });
  if (existingResponse.status === 200) {
    const existing = await existingResponse.json();
    sha = existing.sha;
  } else if (existingResponse.status !== 404) {
    const message = await existingResponse.text();
    throw new Error(`GitHub lookup failed: ${existingResponse.status} ${message}`);
  }

  const publishResponse = await fetch(url, {
    method: 'PUT',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: commitMessage,
      branch: GITHUB_BRANCH,
      content: base64Content,
      sha,
    }),
  });

  if (!publishResponse.ok) {
    const message = await publishResponse.text();
    throw new Error(`GitHub publish failed: ${publishResponse.status} ${message}`);
  }

  const payload = await publishResponse.json();
  return {
    commitSha: payload.commit?.sha || '',
    commitUrl: payload.commit?.html_url || '',
    path: payload.content?.path || repoPath,
  };
}

async function publishMenuSnapshotToGitHub(snapshot) {
  const base64 = Buffer.from(JSON.stringify(snapshot, null, 2) + '\n', 'utf8').toString('base64');
  return commitFileToGitHub(MENU_STATE_REPO_PATH, base64, `Update shared menu state (${new Date().toISOString()})`);
}

// ─────────────────────────────────────────────────────────────
// Debug & Health
// ─────────────────────────────────────────────────────────────
app.get('/debug/public-list', (_req, res) => {
  let list;
  try { list = fs.readdirSync(STATIC_ROOT); } catch { list = ['<missing public/>']; }
  res.json({ STATIC_ROOT, list });
});
app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/api/admin/status', (req, res) => {
  const session = readAdminSession(req);
  res.json({ ok: true, authenticated: !!session, username: session?.username || null });
});

app.post('/api/admin/login', (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');

  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    clearAdminSessionCookie(res);
    return res.status(401).json({ ok: false, error: 'Invalid staff credentials.' });
  }

  setAdminSessionCookie(res, createAdminSessionToken(username));
  res.json({ ok: true, username });
});

app.post('/api/admin/logout', (_req, res) => {
  clearAdminSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/menu-state', (_req, res) => {
  try {
    const snapshot = loadSavedMenuSnapshot();
    if (!snapshot) return res.json({ ok: true, snapshot: null });
    res.json({ ok: true, snapshot });
  } catch (error) {
    console.error('[menu-state] load error:', error);
    res.status(500).json({ ok: false, error: 'Failed to load menu state.' });
  }
});

app.post('/api/menu-state', requireAdmin, async (req, res) => {
  try {
    const snapshot = req.body?.snapshot;
    if (!isValidMenuSnapshot(snapshot)) {
      return res.status(400).json({ ok: false, error: 'Invalid menu state payload.' });
    }

    writeJsonFile(MENU_STATE_FILE, snapshot);

    let published = false;
    let publishResult = null;
    let publishError = null;

    if (process.env.MENU_AUTO_PUBLISH === '1') {
      try {
        publishResult = await publishMenuSnapshotToGitHub(snapshot);
        published = true;
      } catch (error) {
        publishError = error.message;
      }
    }

    res.json({
      ok: true,
      savedAt: new Date().toISOString(),
      published,
      publishResult,
      publishError,
    });
  } catch (error) {
    console.error('[menu-state] save error:', error);
    res.status(500).json({ ok: false, error: 'Failed to save menu state.' });
  }
});

app.post('/api/menu-state/publish', requireAdmin, async (_req, res) => {
  try {
    const snapshot = loadSavedMenuSnapshot();
    if (!snapshot) {
      return res.status(400).json({ ok: false, error: 'No saved menu state to publish yet.' });
    }

    const publishResult = await publishMenuSnapshotToGitHub(snapshot);
    res.json({ ok: true, publishResult });
  } catch (error) {
    console.error('[menu-state] publish error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to publish menu state.' });
  }
});

// ─────────────────────────────────────────────────────────────
// Pages (explicit routes)
// ─────────────────────────────────────────────────────────────
const successFile = path.join(STATIC_ROOT, 'success.html');
const shopFile    = path.join(STATIC_ROOT, 'shop.html');
const indexFile   = path.join(STATIC_ROOT, 'index.html');

const sendSuccessPage = (_req, res) => res.sendFile(successFile, err => {
  if (err) res.status(404).send('No success page. Ensure public/success.html exists.');
});
app.get('/success', sendSuccessPage);
app.get('/success.html', sendSuccessPage);
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
// Shared checkout stock decrement (used only from the server-verified
// confirm-order path below — never call this from an unauthenticated,
// client-triggered route, since nothing here confirms payment happened).
// ─────────────────────────────────────────────────────────────

// Guarded $inc-with-rollback, one sku at a time — no Mongo transaction
// (no replica set configured), same discipline as the rest of this file.
async function decrementInventoryForCart(cartLines) {
  const decremented = [];
  for (const line of cartLines) {
    const sku = String(line?.sku || '').trim();
    const qty = Math.max(1, parseInt(line?.qty, 10) || 0);
    if (!sku || !Number.isFinite(qty)) continue;

    const result = await Inventory.updateOne(
      { sku, stock: { $gte: qty } },
      { $inc: { stock: -qty } }
    );

    if (result.modifiedCount !== 1) {
      for (const prev of decremented) {
        await Inventory.updateOne({ sku: prev.sku }, { $inc: { stock: prev.qty } });
      }
      throw new Error(`Insufficient stock for ${sku}.`);
    }
    decremented.push({ sku, qty });
  }
}

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

      // Sanitize to {sku, qty} — sku is required now; name/price (if the
      // client still sends them) are ignored, never trusted for pricing.
      const cart = [];
      for (const item of items) {
        const sku = String(item?.sku || '').trim();
        const qty = Math.max(1, parseInt(item?.quantity, 10) || 0);
        if (!sku || !Number.isFinite(qty)) {
          return res.status(400).json({ error: 'Each item needs a valid sku and quantity.' });
        }
        cart.push({ sku, qty });
      }

      // Resolve every sku to its live Product doc server-side. Only active
      // products are purchasable — this check is intentionally separate
      // from the decrement-at-confirm step, which must still work even if
      // staff deactivates/deletes the product after payment goes through.
      const products = await Product.find({ active: true }).lean();
      const skuToProduct = {};
      for (const p of products) {
        for (const size of p.sizes) skuToProduct[`${p.productKey}|${size}`] = p;
      }

      const line_items = [];
      for (const line of cart) {
        const product = skuToProduct[line.sku];
        if (!product) {
          return res.status(400).json({ error: `"${line.sku}" is not an available item.` });
        }
        line_items.push({
          price_data: {
            currency: 'usd',
            product_data: { name: product.name },
            unit_amount: product.price, // cents, resolved server-side
          },
          quantity: line.qty,
          // Disabled deliberately: the site's own cart drawer already lets
          // customers adjust quantity before checkout. If Stripe's hosted
          // UI could also adjust it, the cart snapshot we stash in session
          // metadata below (and decrement from at confirm-order time) could
          // go stale relative to what was actually paid for.
          adjustable_quantity: { enabled: false },
        });
      }

      const cartMetadata = JSON.stringify(cart);
      if (cartMetadata.length > 450) {
        // Stripe caps metadata values at 500 chars; fail loudly rather than
        // silently truncate the cart we'll later decrement stock from.
        return res.status(400).json({ error: 'Cart is too large to check out in one order — please split it into smaller orders.' });
      }

      const successUrl = `${PUBLIC_BASE_URL}/success.html?paid=1&session_id={CHECKOUT_SESSION_ID}`;
      // success.html has dedicated "checkout canceled" messaging — route
      // cancels there too rather than back to shop.html, which silently
      // ignores the ?canceled=1 param.
      const cancelUrl = `${PUBLIC_BASE_URL}/success.html?canceled=1`;

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items,
        customer_email: customer?.email,
        shipping_address_collection: { allowed_countries: ['US','CA','GB','AU','JP','DE','FR','MX','SG'] },
        success_url: successUrl,
        cancel_url:  cancelUrl,
        metadata: { cart: cartMetadata },
      });

      res.json({ url: session.url });
    } catch (e) {
      console.error('Stripe error:', e);
      res.status(500).json({ error: e?.raw?.message || e.message || 'Unable to create checkout session' });
    }
  });

  // Confirm Order (no webhook) → decrement stock + send emails, each at most
  // once per session, tracked independently. Idempotency is anchored to a
  // unique OrderEvent doc in Mongo (not an in-memory Set) so it survives a
  // server restart between a customer's page refresh and this request.
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

      // Find-or-create the OrderEvent doc for this session (unique index on
      // sessionId makes concurrent creates safe — the loser just re-fetches).
      let orderEvent;
      try {
        orderEvent = await OrderEvent.create({ sessionId: session_id });
      } catch (err) {
        if (err.code === 11000) {
          orderEvent = await OrderEvent.findOne({ sessionId: session_id });
        } else {
          throw err;
        }
      }

      // Decrement and email are claimed independently via their own
      // decrementedAt/emailedAt fields, not a single shared flag — so if
      // e.g. email fails on the first attempt (decrement already succeeded),
      // a later retry (page refresh) still retries the email without
      // re-running (and double-decrementing) the stock update.
      if (!orderEvent.decrementedAt) {
        try {
          let cartLines = [];
          try { cartLines = JSON.parse(session.metadata?.cart || '[]'); } catch { cartLines = []; }
          if (Array.isArray(cartLines) && cartLines.length) {
            await decrementInventoryForCart(cartLines);
          }
          orderEvent.decrementedAt = new Date();
          await orderEvent.save();
        } catch (err) {
          // Customer already paid via Stripe — never fail their confirmation
          // page over a stock-accounting hiccup. Just log it for follow-up.
          // decrementedAt stays unset so the next confirm-order call retries.
          console.error('[confirm-order] decrement error:', err);
        }
      }

      const mailer = tryGetMailer();
      if (mailer && !orderEvent.emailedAt) {
        try {
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

          orderEvent.emailedAt = new Date();
          await orderEvent.save();
        } catch (err) {
          console.error('[confirm-order] email error:', err);
        }
      }

      res.json({ ok: true, emailed: true });
    } catch (err) {
      console.error('Confirm-order error:', err);
      res.status(500).json({ error: err.message });
    }
  });
}

// ─────────────────────────────────────────────────────────────
// Shop Catalog API (read)
// ─────────────────────────────────────────────────────────────

// GET /api/shop-catalog -> { ok, products: [{ ...product, stock: {size: count} }] }
// Public (matches existing GET /api/menu-state precedent); returns inactive
// products too — the storefront filters them client-side, editor mode shows
// them with a "hidden" treatment.
app.get('/api/shop-catalog', async (_req, res) => {
  try {
    const products = await Product.find({}).sort({ section: 1, order: 1, createdAt: 1 }).lean();

    const skus = [];
    for (const p of products) {
      for (const size of p.sizes) skus.push(`${p.productKey}|${size}`);
    }

    const inventoryRows = skus.length
      ? await Inventory.find({ sku: { $in: skus } }, { _id: 0, sku: 1, stock: 1 }).lean()
      : [];
    const stockBySku = {};
    for (const row of inventoryRows) stockBySku[row.sku] = row.stock;

    const catalog = products.map(p => {
      const stock = {};
      for (const size of p.sizes) {
        const sku = `${p.productKey}|${size}`;
        stock[size] = typeof stockBySku[sku] === 'number' ? stockBySku[sku] : 0;
      }
      return { ...p, stock };
    });

    res.json({ ok: true, products: catalog });
  } catch (e) {
    console.error('[shop-catalog] load error:', e);
    res.status(500).json({ ok: false, error: 'Failed to load shop catalog.' });
  }
});

// ─────────────────────────────────────────────────────────────
// Shop Catalog API (write) — staff only
// ─────────────────────────────────────────────────────────────

// Pulls out only the fields present in `body`, validating each as it goes.
// `partial: true` (used for PUT) skips the "required" checks for fields the
// caller didn't send, so an update can touch just one field at a time.
function sanitizeProductInput(body, { partial = false } = {}) {
  const out = {};
  const errors = [];

  if (!partial || body.section !== undefined) {
    const section = String(body.section || '').trim();
    if (!section) errors.push('section is required');
    out.section = section;
  }
  if (!partial || body.name !== undefined) {
    const name = String(body.name || '').trim();
    if (!name) errors.push('name is required');
    out.name = name;
  }
  if (!partial || body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) errors.push('price must be a non-negative number (cents)');
    out.price = price;
  }
  if (!partial || body.sizes !== undefined) {
    const rawSizes = Array.isArray(body.sizes) ? body.sizes : [];
    const sizes = [...new Set(rawSizes.map(s => String(s).trim()).filter(Boolean))];
    if (!sizes.length) errors.push('sizes must be a non-empty array');
    if (sizes.some(s => s.includes('|'))) errors.push('sizes cannot contain "|"');
    out.sizes = sizes;
  }

  if (body.description !== undefined) out.description = String(body.description || '').trim();
  if (body.image !== undefined) out.image = String(body.image || '').trim();
  if (body.tagLabel !== undefined) out.tagLabel = String(body.tagLabel || '').trim();
  if (body.colorHex !== undefined) out.colorHex = String(body.colorHex || '').trim();
  if (body.accentHex !== undefined) out.accentHex = String(body.accentHex || '').trim();
  if (body.specs !== undefined) out.specs = String(body.specs || '').trim();
  if (body.presale !== undefined) out.presale = !!body.presale;
  if (body.order !== undefined) out.order = Number(body.order) || 0;
  if (body.active !== undefined) out.active = !!body.active;

  return { data: out, errors };
}

// Makes sure an Inventory row exists (defaulting to 0 stock) for every sku a
// product needs, without touching rows that already exist. No transaction —
// each upsert is independently atomic, matching the rest of this file's
// no-replica-set discipline.
async function ensureInventoryRowsForProduct(productKey, sizes) {
  await Promise.all(sizes.map(size =>
    Inventory.updateOne(
      { sku: `${productKey}|${size}` },
      { $setOnInsert: { stock: 0 } },
      { upsert: true }
    )
  ));
}

// POST /api/shop-catalog -> create a product
app.post('/api/shop-catalog', requireAdmin, async (req, res) => {
  try {
    const productKey = String(req.body?.productKey || '').trim();
    if (!productKey) return res.status(400).json({ ok: false, error: 'productKey is required.' });

    const { data, errors } = sanitizeProductInput(req.body || {});
    if (errors.length) return res.status(400).json({ ok: false, error: errors.join('; ') });

    const existing = await Product.findOne({ productKey }).lean();
    if (existing) return res.status(409).json({ ok: false, error: `A product with productKey "${productKey}" already exists.` });

    const product = await Product.create({ productKey, ...data });
    await ensureInventoryRowsForProduct(productKey, product.sizes);

    res.json({ ok: true, product });
  } catch (e) {
    console.error('[shop-catalog] create error:', e);
    if (e.name === 'ValidationError') return res.status(400).json({ ok: false, error: e.message });
    res.status(500).json({ ok: false, error: 'Failed to create product.' });
  }
});

// PUT /api/shop-catalog/:productKey -> update a product (productKey itself is immutable)
app.put('/api/shop-catalog/:productKey', requireAdmin, async (req, res) => {
  try {
    const productKey = req.params.productKey; // Express already decodeURIComponent()s this
    const existing = await Product.findOne({ productKey });
    if (!existing) return res.status(404).json({ ok: false, error: 'Product not found.' });

    if (req.body?.productKey !== undefined && String(req.body.productKey).trim() !== productKey) {
      return res.status(400).json({ ok: false, error: 'productKey cannot be changed. Delete and recreate instead.' });
    }

    const { data, errors } = sanitizeProductInput(req.body || {}, { partial: true });
    if (errors.length) return res.status(400).json({ ok: false, error: errors.join('; ') });

    const previousSizes = new Set(existing.sizes);
    Object.assign(existing, data);
    await existing.save();

    const newSizes = existing.sizes.filter(s => !previousSizes.has(s));
    if (newSizes.length) await ensureInventoryRowsForProduct(productKey, newSizes);

    res.json({ ok: true, product: existing });
  } catch (e) {
    console.error('[shop-catalog] update error:', e);
    if (e.name === 'ValidationError') return res.status(400).json({ ok: false, error: e.message });
    res.status(500).json({ ok: false, error: 'Failed to update product.' });
  }
});

// DELETE /api/shop-catalog/:productKey -> remove a product listing
// (Inventory rows are left untouched — harmless orphans, avoids losing stock
// history and keeps a stale cart referencing this sku from crashing checkout.)
app.delete('/api/shop-catalog/:productKey', requireAdmin, async (req, res) => {
  try {
    const productKey = req.params.productKey;
    const result = await Product.deleteOne({ productKey });
    if (!result.deletedCount) return res.status(404).json({ ok: false, error: 'Product not found.' });
    res.json({ ok: true });
  } catch (e) {
    console.error('[shop-catalog] delete error:', e);
    res.status(500).json({ ok: false, error: 'Failed to delete product.' });
  }
});

// POST /api/shop-catalog/:productKey/stock -> set an absolute stock count per size
// (a $set, not a delta — staff are entering a physical count, not an adjustment)
app.post('/api/shop-catalog/:productKey/stock', requireAdmin, async (req, res) => {
  try {
    const productKey = req.params.productKey;
    const product = await Product.findOne({ productKey }).lean();
    if (!product) return res.status(404).json({ ok: false, error: 'Product not found.' });

    const stocks = req.body?.stocks;
    if (!stocks || typeof stocks !== 'object' || Array.isArray(stocks)) {
      return res.status(400).json({ ok: false, error: 'stocks must be an object of {size: count}.' });
    }

    const sizeSet = new Set(product.sizes);
    const updates = [];
    for (const [size, rawValue] of Object.entries(stocks)) {
      if (!sizeSet.has(size)) return res.status(400).json({ ok: false, error: `"${size}" is not a valid size for this product.` });
      const value = Number(rawValue);
      if (!Number.isFinite(value) || value < 0) return res.status(400).json({ ok: false, error: `stock for "${size}" must be a non-negative number.` });
      updates.push({ size, value: Math.floor(value) });
    }

    await Promise.all(updates.map(({ size, value }) =>
      Inventory.updateOne(
        { sku: `${productKey}|${size}` },
        { $set: { stock: value } },
        { upsert: true }
      )
    ));

    res.json({ ok: true });
  } catch (e) {
    console.error('[shop-catalog] stock update error:', e);
    res.status(500).json({ ok: false, error: 'Failed to update stock.' });
  }
});

// POST /api/shop-catalog/publish -> commit the current catalog to GitHub as
// a JSON snapshot. Server re-reads Product itself (not client-supplied) so
// this can never publish stale data. This is a backup/version-history mirror
// only — MongoDB remains the live source of truth for what the site serves;
// publishing here does not change that. Stock/Inventory is never included.
app.post('/api/shop-catalog/publish', requireAdmin, async (_req, res) => {
  try {
    const products = await Product.find({}, { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })
      .sort({ section: 1, order: 1 })
      .lean();

    const publishResult = await commitFileToGitHub(
      SHOP_CATALOG_REPO_PATH,
      Buffer.from(JSON.stringify(products, null, 2) + '\n', 'utf8').toString('base64'),
      `Update shop catalog (${new Date().toISOString()})`
    );

    res.json({ ok: true, publishResult });
  } catch (e) {
    console.error('[shop-catalog] publish error:', e);
    res.status(500).json({ ok: false, error: e.message || 'Failed to publish shop catalog.' });
  }
});

// POST /api/github/upload-image -> commit a staff-picked image file to the
// repo. Shared by the Menu and Shop editors, both of which stage a picked
// image as a base64 data URL locally and only call this at Publish time —
// so routine edits never touch GitHub, only a deliberate Publish click does.
const MAX_UPLOAD_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB — repo history keeps every version forever
const ALLOWED_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']);

app.post('/api/github/upload-image', requireAdmin, async (req, res) => {
  try {
    const { dataUrl, folder, filename } = req.body || {};

    const match = /^data:([^;]+);base64,(.+)$/.exec(String(dataUrl || ''));
    if (!match) return res.status(400).json({ ok: false, error: 'dataUrl must be a base64 data: URL.' });
    const [, mimeType, base64Data] = match;
    if (!ALLOWED_IMAGE_MIME.has(mimeType)) {
      return res.status(400).json({ ok: false, error: `Unsupported image type: ${mimeType}` });
    }

    const approxBytes = Math.ceil(base64Data.length * 0.75);
    if (approxBytes > MAX_UPLOAD_IMAGE_BYTES) {
      return res.status(400).json({ ok: false, error: `Image is too large (max ${MAX_UPLOAD_IMAGE_BYTES / (1024 * 1024)}MB).` });
    }

    const allowedFolders = new Set(['Pictures/menu', 'Pictures/merch']);
    if (!allowedFolders.has(folder)) {
      return res.status(400).json({ ok: false, error: 'folder must be one of: ' + [...allowedFolders].join(', ') });
    }

    const safeName = String(filename || '')
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!safeName) return res.status(400).json({ ok: false, error: 'filename is required.' });

    const uniqueName = `${Date.now()}-${safeName}`;
    const repoPath = `public/${folder}/${uniqueName}`;

    const publishResult = await commitFileToGitHub(
      repoPath,
      base64Data,
      `Upload image ${uniqueName} (${new Date().toISOString()})`
    );

    res.json({ ok: true, path: `${folder}/${uniqueName}`, publishResult });
  } catch (e) {
    console.error('[github] image upload error:', e);
    res.status(500).json({ ok: false, error: e.message || 'Failed to upload image.' });
  }
});

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
