
(function () {
  const galleries = new Map();

  function initGallery(galleryEl) {
    const productKey = galleryEl.dataset.product;
    const track = galleryEl.querySelector('.pg-track');
    const viewport = galleryEl.querySelector('.pg-viewport');
    const allImgs = Array.from(track.querySelectorAll('img'));
    const prevBtn = galleryEl.querySelector('.pg-prev');
    const nextBtn = galleryEl.querySelector('.pg-next');
    const select = document.querySelector(`.variant-select[data-product="${productKey}"]`);

    const state = {
      productKey,
      index: 0,
      variant: select ? select.value : null,
      allImgs,
      track
    };
    galleries.set(productKey, state);

    function getSet() {
      if (!state.variant) return state.allImgs;
      const match = state.allImgs.filter(img => (img.dataset.variant || '') === state.variant);
      return match.length ? match : state.allImgs.filter(img => !img.dataset.variant);
    }

    function rebuildTrack() {
      const set = getSet();
      state.track.innerHTML = '';
      set.forEach(img => state.track.appendChild(img));
      state.index = Math.min(state.index, Math.max(0, set.length - 1));
      applyTransform();
    }

    function applyTransform() {
      const setLen = state.track.children.length || 1;
      if (state.index < 0) state.index = setLen - 1;
      if (state.index >= setLen) state.index = 0;
      state.track.style.transform = `translateX(-${state.index * 100}%)`;
    }

    // Cross-fade helper for option changes
    function crossFadeToNewVariant(newVariant) {
      // overlay with current visible slide
      const imgs = Array.from(state.track.children);
      const current = imgs[state.index] || imgs[0];
      if (current && viewport) {
        const fader = document.createElement('div');
        fader.className = 'pg-fader';
        const clone = current.cloneNode(true);
        fader.appendChild(clone);
        viewport.appendChild(fader);

        // swap underneath
        state.variant = newVariant;
        state.index = 0;
        rebuildTrack();

        // fade overlay out, then remove
        requestAnimationFrame(() => { fader.style.opacity = '0'; });
        fader.addEventListener('transitionend', () => fader.remove(), { once: true });
      } else {
        state.variant = newVariant;
        state.index = 0;
        rebuildTrack();
      }
    }

    // init
    rebuildTrack();

    // arrows
    prevBtn?.addEventListener('click', () => {
      state.index -= 1;
      applyTransform();
    });
    nextBtn?.addEventListener('click', () => {
      state.index += 1;
      applyTransform();
    });

    // variant change WITH fade
    if (select) {
      select.addEventListener('change', (e) => {
        crossFadeToNewVariant(e.target.value);
      });
    }

    // drag / swipe
    let startX = null, lastX = null, dragging = false;

    function onStart(e) {
      dragging = true;
      startX = lastX = (e.touches ? e.touches[0].clientX : e.clientX);
      state.track.style.transition = 'none';
    }
    function onMove(e) {
      if (!dragging) return;
      const x = (e.touches ? e.touches[0].clientX : e.clientX);
      const dx = x - startX;
      lastX = x;
      state.track.style.transform = `translateX(calc(${-state.index * 100}% + ${dx}px))`;
    }
    function onEnd() {
      if (!dragging) return;
      dragging = false;
      const dx = lastX - startX;
      state.track.style.transition = ''; // restore CSS transition
      const threshold = 40;
      if (dx > threshold) state.index -= 1;
      else if (dx < -threshold) state.index += 1;
      applyTransform();
    }

    viewport.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    viewport.addEventListener('touchstart', onStart, { passive: true });
    viewport.addEventListener('touchmove', onMove, { passive: true });
    viewport.addEventListener('touchend', onEnd);
  }

  document.querySelectorAll('.product-gallery').forEach(initGallery);
})();

// shop.js

// --- Helpers ---
function currentSKUForCard(card) {
  const product = card.dataset.product;
  const variantSel = card.querySelector('.variant-select[data-product="'+product+'"]');
  const sizeSel = card.querySelector('.size-select[data-product="'+product+'"]');

  const variant = variantSel ? variantSel.value.trim() : 'NOVARIANT';
  const size = sizeSel ? sizeSel.value.trim() : 'NOSIZE';

  return `${product}|${variant}|${size}`;
}

function updateStockLine(card, invMap) {
  const sku = currentSKUForCard(card);
  const line = card.querySelector('.stock-line');
  const countEl = card.querySelector('.stock-line .stock-count');
  const addBtn = card.querySelector('.add-to-cart');

  const stock = invMap[sku] ?? 0;

  if (countEl) countEl.textContent = stock;
  if (addBtn) {
    addBtn.disabled = stock <= 0;
    addBtn.textContent = stock > 0 ? 'Add to Cart' : 'Out of Stock';
  }
}

// Build cart payload from your sidebar DOM (simple example)
function getCartFromSidebar() {
  // You likely already track cart items; if not, adapt this.
  // Here’s a minimal structure read from DOM elements with data-sku/qty.
  const items = [];
  document.querySelectorAll('#cart-items .cart-item').forEach(ci => {
    const sku = ci.getAttribute('data-sku');
    const qty = parseInt(ci.getAttribute('data-qty'), 10) || 1;
    if (sku && qty > 0) items.push({ sku, qty });
  });
  return items;
}

// Optionally keep a local working copy of inventory so users
// can’t add more than what they just saw.
let INVENTORY = {}; // filled by /api/inventory

async function fetchInventory() {
  const res = await fetch('/api/inventory', { method: 'GET' });
  if (!res.ok) throw new Error('Failed to load inventory');
  const data = await res.json(); // { sku: stock }
  INVENTORY = data;
}

function attachVariantSizeListeners(card) {
  const product = card.dataset.product;
  const selects = card.querySelectorAll(`.variant-select[data-product="${product}"], .size-select[data-product="${product}"]`);
  selects.forEach(sel => {
    sel.addEventListener('change', () => updateStockLine(card, INVENTORY));
  });
}

function attachAddToCart(card) {
  const addBtn = card.querySelector('.add-to-cart');
  if (!addBtn) return;

  addBtn.addEventListener('click', () => {
    const sku = currentSKUForCard(card);
    const stock = INVENTORY[sku] ?? 0;
    if (stock <= 0) return;

    // Add to your cart UI (adjust to your structure)
    const cartItems = document.getElementById('cart-items');
    const existing = cartItems.querySelector(`.cart-item[data-sku="${sku}"]`);
    if (existing) {
      const currentQty = parseInt(existing.getAttribute('data-qty'), 10) || 1;
      if (currentQty + 1 > stock) {
        // Not enough local stock
        alert('Not enough stock for that quantity.');
        return;
      }
      existing.setAttribute('data-qty', String(currentQty + 1));
      existing.querySelector('.ci-qty').textContent = `× ${currentQty + 1}`;
    } else {
      const div = document.createElement('div');
      div.className = 'cart-item';
      div.setAttribute('data-sku', sku);
      div.setAttribute('data-qty', '1');
      div.innerHTML = `
        <div class="ci-line">
          <span class="ci-name">${sku}</span>
          <span class="ci-qty">× 1</span>
        </div>
      `;
      cartItems.innerHTML = ''; // remove "Your cart is empty." placeholder
      cartItems.appendChild(div);
    }

    // Toast
    const toast = document.getElementById('cart-toast');
    if (toast) {
      toast.textContent = 'Added to cart!';
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 1200);
    }
  });
}

async function doCheckout() {
  const cart = getCartFromSidebar();
  if (!cart.length) {
    alert('Cart is empty.');
    return;
  }

  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cart })
  });

  const data = await res.json();

  if (!res.ok || !data.ok) {
    alert(data.error || 'Checkout failed.');
    // Refresh inventory (maybe it ran out)
    await fetchInventory();
    // Refresh stock lines
    document.querySelectorAll('.product-card[data-product]').forEach(card => updateStockLine(card, INVENTORY));
    return;
  }

  // Success: update local inventory and UI
  cart.forEach(item => {
    if (typeof INVENTORY[item.sku] === 'number') {
      INVENTORY[item.sku] = Math.max(0, INVENTORY[item.sku] - item.qty);
    }
  });

  document.querySelectorAll('.product-card[data-product]').forEach(card => updateStockLine(card, INVENTORY));

  // Clear cart
  const cartItems = document.getElementById('cart-items');
  cartItems.innerHTML = '<p>Your cart is empty.</p>';

  alert('Order placed! Thanks :)');
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await fetchInventory();
  } catch (e) {
    console.error(e);
  }

  // Initialize each product card
  document.querySelectorAll('.product-card[data-product]').forEach(card => {
    attachVariantSizeListeners(card);
    attachAddToCart(card);
    updateStockLine(card, INVENTORY);
  });

  // Hook checkout button
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) checkoutBtn.addEventListener('click', doCheckout);
});
