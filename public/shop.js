/* =========================================================
   shop.js — Inventory fetch, stock display, filter, cart
   ========================================================= */

(function () {

  let inventory = {};

  /* ── Product metadata for cart display ── */
  const PRODUCTS = {
    'shirt|V1': { name: '"Oh no, my matcha!" Boxy Tee V.1', price: 3000, emoji: '👕' },
    'shirt|V2': { name: '"Oh no, my matcha!" Boxy Tee V.2', price: 3000, emoji: '👚' },
    'tote|Black|NOSIZE':        { name: 'AKO* Tea Bag', price: 3500, emoji: '🛍', variant: 'Black' },
    'tote|Green|NOSIZE':        { name: 'AKO* Tea Bag', price: 3500, emoji: '🛍', variant: 'Green' },
    'bandana|MORE TEA|NOSIZE':  { name: 'AKO* Bandana S.2', price: 2000, emoji: '🎽', variant: 'MORE TEA' },
    'bandana|PERFORMATIVE|NOSIZE': { name: 'AKO* Bandana S.2', price: 2000, emoji: '🎽', variant: 'PERFORMATIVE' },
    'bandana|REACH|NOSIZE':     { name: 'AKO* Bandana S.2', price: 2000, emoji: '🎽', variant: 'REACH' },
  };

  /* ── Fetch inventory ── */
  async function loadInventory() {
    try {
      const res = await fetch('/api/inventory');
      if (!res.ok) throw new Error('Failed to load inventory');
      inventory = await res.json();
      applyStockToAll();
    } catch (err) {
      console.error('[shop] inventory load failed:', err);
    }
  }

  /* ── Stock helpers ── */
  function getStock(sku) {
    return typeof inventory[sku] === 'number' ? inventory[sku] : null;
  }

  function stockLabel(stock) {
    if (stock === null) return { text: '', cls: '' };
    if (stock === 0)    return { text: 'Sold out',          cls: 'sold-out' };
    if (stock <= 3)     return { text: `Only ${stock} left`, cls: 'low-stock' };
    return               { text: 'In stock',                cls: 'in-stock' };
  }

  function setBadge(el, stock) {
    if (!el) return;
    const { text, cls } = stockLabel(stock);
    el.textContent = text;
    el.className   = 'stock-badge' + (cls ? ' ' + cls : '');
  }

  function setStatus(el, stock) {
    if (!el) return;
    const { text, cls } = stockLabel(stock);
    el.textContent = text;
    el.className   = 'stock-status' + (cls ? ' ' + cls : '');
  }

  /* ── Apply stock to all products ── */
  function applyStockToAll() {
    applyShirtStock('V1');
    applyShirtStock('V2');
    applyBagStock('Black');
    applyBagStock('Green');
    applyBandanaStock('MORE TEA');
    applyBandanaStock('PERFORMATIVE');
    applyBandanaStock('REACH');
  }

  function applyShirtStock(version) {
    const card     = document.querySelector(`[data-product="shirt|${version}"]`);
    const statusEl = document.getElementById(`stock-shirt-${version}`);
    const addBtn   = card?.querySelector('.add-to-cart');
    if (!card) return;

    ['S', 'M', 'L', 'XL'].forEach(size => {
      const sku = `shirt|${version}|${size}`;
      const btn = card.querySelector(`[data-sku="${sku}"]`);
      if (!btn) return;
      const stock = getStock(sku);
      if (stock === 0) { btn.classList.add('out-of-stock'); btn.title = 'Sold out'; }
      else             { btn.classList.remove('out-of-stock'); btn.title = ''; }
    });

    updateShirtStatus(version, statusEl, addBtn);
  }

  function updateShirtStatus(version, statusEl, addBtn) {
    const card        = document.querySelector(`[data-product="shirt|${version}"]`);
    const activeSzBtn = card?.querySelector('.sz.active:not(.out-of-stock)');
    const stock       = activeSzBtn ? getStock(activeSzBtn.dataset.sku) : 0;
    setStatus(statusEl, stock);
    if (addBtn) addBtn.disabled = (stock === 0 || !activeSzBtn);
  }

  function applyBagStock(color) {
    const sku     = `tote|${color}|NOSIZE`;
    const stock   = getStock(sku);
    const badgeEl = document.getElementById(`stock-tote-${color}`);
    const btn     = document.querySelector(`[data-sku="${sku}"].bag-btn`);
    setBadge(badgeEl, stock);
    if (btn) btn.disabled = (stock === 0);
  }

  function applyBandanaStock(name) {
    const sku     = `bandana|${name}|NOSIZE`;
    const stock   = getStock(sku);
    const badgeId = 'stock-bandana-' + name.replace(/\s+/g, '-');
    const badgeEl = document.getElementById(badgeId);
    const btn     = document.querySelector(`[data-sku="${sku}"].bandana-btn`);
    setBadge(badgeEl, stock);
    if (btn) btn.disabled = (stock === 0);
  }

  /* ── Size button interactions ── */
  document.querySelectorAll('.shirt-card').forEach(card => {
    const version  = card.dataset.product?.split('|')[1];
    const statusEl = document.getElementById(`stock-shirt-${version}`);
    const addBtn   = card.querySelector('.add-to-cart');

    card.querySelectorAll('.size-row .sz').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (btn.classList.contains('out-of-stock')) return;
        card.querySelectorAll('.sz').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const stock = getStock(btn.dataset.sku);
        setStatus(statusEl, stock);
        if (addBtn) addBtn.disabled = (stock === 0);
      });
    });
  });

  /* ── Filter buttons ── */
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      ['shirts', 'bags', 'bandanas'].forEach(cat => {
        const sec = document.getElementById('sec-' + cat);
        if (!sec) return;
        if (filter === 'all' || filter === cat) sec.classList.remove('hidden');
        else sec.classList.add('hidden');
      });
    });
  });

  /* ── Add to cart ── */
  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (btn.disabled) return;

      let sku, variant;

      if (btn.dataset.product?.startsWith('shirt|')) {
        const card      = btn.closest('.shirt-card');
        const activeBtn = card?.querySelector('.sz.active:not(.out-of-stock)');
        if (!activeBtn) return;
        sku     = activeBtn.dataset.sku;
        variant = activeBtn.dataset.size;
      } else {
        sku = btn.dataset.sku;
      }

      if (!sku) return;

      // Get product metadata
      const productKey = sku.startsWith('shirt|')
        ? sku.split('|').slice(0, 2).join('|')   // shirt|V1
        : sku;

      const meta = PRODUCTS[productKey] || PRODUCTS[sku] || {};

      window.AKO?.addToCart({
        sku,
        name:    meta.name    || sku,
        variant: variant      || meta.variant || '',
        price:   meta.price   || 0,
        emoji:   meta.emoji   || '🛍',
      });
    });
  });

  /* ── Init ── */
  loadInventory();

})();