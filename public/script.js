/* =========================================================
   AKO — script.js
   Site-wide JS: nav drawer + cart drawer open/close.
   ========================================================= */

(function () {

  /* ── NAV DRAWER ── */
  const logoBtn   = document.getElementById('logoBtn');
  const navDrawer = document.getElementById('navDrawer');
  const navOverlay= document.getElementById('navOverlay');

  function openNav() {
    document.body.classList.add('nav-open');
    if (logoBtn)   logoBtn.setAttribute('aria-expanded', 'true');
    if (navDrawer) navDrawer.setAttribute('aria-hidden', 'false');
  }

  function closeNav() {
    document.body.classList.remove('nav-open');
    if (logoBtn)   logoBtn.setAttribute('aria-expanded', 'false');
    if (navDrawer) navDrawer.setAttribute('aria-hidden', 'true');
  }

  if (logoBtn)    logoBtn.addEventListener('click', () => document.body.classList.contains('nav-open') ? closeNav() : openNav());
  if (navOverlay) navOverlay.addEventListener('click', closeNav);

  /* ── CART DRAWER ── */
  const cartDrawer  = document.getElementById('cartDrawer');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartBtn     = document.getElementById('cartBtn');
  const cartClose   = document.getElementById('cartClose');

  function openCart() {
    if (!cartDrawer) return;
    cartDrawer.classList.add('open');
    if (cartOverlay) cartOverlay.classList.add('open');
    closeNav(); // close nav if open
  }

  function closeCart() {
    if (!cartDrawer) return;
    cartDrawer.classList.remove('open');
    if (cartOverlay) cartOverlay.classList.remove('open');
  }

  if (cartBtn)     cartBtn.addEventListener('click', openCart);
  if (cartClose)   cartClose.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  /* ── Escape key closes both ── */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeNav(); closeCart(); }
  });

  /* ── Expose cart open/close globally for shop.js ── */
  window.AKO = window.AKO || {};
  window.AKO.openCart  = openCart;
  window.AKO.closeCart = closeCart;

})();


/* =========================================================
   AKO — cart.js (bundled into script.js)
   Cart state, render, badge update.
   ========================================================= */

(function () {

  /* ── Cart state (session only — no localStorage) ── */
  let cart = []; // [{ sku, name, variant, price, qty, emoji }]

  /* ── DOM refs ── */
  const itemsEl    = document.getElementById('cartItems');
  const badgeEl    = document.getElementById('cartBadge');
  const countEl    = document.getElementById('cartCount');
  const totalEl    = document.getElementById('cartTotal');
  const checkoutEl = document.getElementById('cartCheckoutBtn');

  /* ── Add item to cart ── */
  function addToCart({ sku, name, variant, price, emoji = '🛍' }) {
    const existing = cart.find(i => i.sku === sku);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ sku, name, variant, price, qty: 1, emoji });
    }
    render();
    if (window.AKO?.openCart) window.AKO.openCart();
  }

  /* ── Remove item ── */
  function removeItem(sku) {
    cart = cart.filter(i => i.sku !== sku);
    render();
  }

  /* ── Change qty ── */
  function changeQty(sku, delta) {
    const item = cart.find(i => i.sku === sku);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) removeItem(sku);
    else render();
  }

  /* ── Render cart drawer ── */
  function render() {
    const total    = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const count    = cart.reduce((s, i) => s + i.qty, 0);
    const totalFmt = '$' + (total / 100).toFixed(2);

    // Badge
    if (badgeEl) {
      badgeEl.textContent = count;
      badgeEl.classList.toggle('visible', count > 0);
    }

    // Count label
    if (countEl) countEl.textContent = count === 0 ? '' : `${count} item${count !== 1 ? 's' : ''}`;

    // Total
    if (totalEl) totalEl.textContent = totalFmt;

    // Checkout button
    if (checkoutEl) checkoutEl.disabled = cart.length === 0;

    // Items list
    if (!itemsEl) return;

    if (cart.length === 0) {
      itemsEl.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#7e6961" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6z"/>
            </svg>
          </div>
          <div class="cart-empty-text">Your cart is empty</div>
          <div class="cart-empty-sub">Add something to get started</div>
        </div>`;
      return;
    }

    itemsEl.innerHTML = cart.map(item => `
      <div class="cart-item" data-sku="${item.sku}">
        <div class="cart-item-thumb">${item.emoji}</div>
        <div>
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-variant">${item.variant}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" data-sku="${item.sku}" data-delta="-1">−</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" data-sku="${item.sku}" data-delta="1">+</button>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
          <div class="cart-item-price">$${(item.price * item.qty / 100).toFixed(2)}</div>
          <button class="cart-item-remove" data-sku="${item.sku}" aria-label="Remove">×</button>
        </div>
      </div>`).join('');

    // Qty buttons
    itemsEl.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => changeQty(btn.dataset.sku, parseInt(btn.dataset.delta)));
    });

    // Remove buttons
    itemsEl.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', () => removeItem(btn.dataset.sku));
    });
  }

  /* ── Checkout ── */
  if (checkoutEl) {
    checkoutEl.addEventListener('click', async () => {
      if (!cart.length) return;
      checkoutEl.disabled = true;
      checkoutEl.textContent = 'Loading…';

      try {
        const res = await fetch('/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cart.map(i => ({
              name:     i.name + (i.variant ? ` — ${i.variant}` : ''),
              price:    i.price,
              quantity: i.qty,
            }))
          })
        });

        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert(data.error || 'Unable to start checkout.');
          checkoutEl.disabled   = false;
          checkoutEl.textContent = 'Checkout';
        }
      } catch (err) {
        console.error('[cart] checkout error:', err);
        alert('Network error. Please try again.');
        checkoutEl.disabled   = false;
        checkoutEl.textContent = 'Checkout';
      }
    });
  }

  /* ── Expose globally so shop.js can call addToCart ── */
  window.AKO = window.AKO || {};
  window.AKO.addToCart = addToCart;

  render(); // initial empty render
})();