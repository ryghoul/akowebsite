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

/* =========================================================
   AKO — staff editor login + editor mode
   ========================================================= */
(function () {
  const STORAGE_KEY = 'ako_editor_enabled';
  const ADMIN_LOGIN_URL = '/api/admin/login';
  const ADMIN_STATUS_URL = '/api/admin/status';

  async function loginAsStaff(username, password) {
    const response = await fetch(ADMIN_LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ username, password }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || 'Invalid staff credentials.');
    }

    return payload;
  }

  async function getAdminStatus() {
    try {
      const response = await fetch(ADMIN_STATUS_URL, { credentials: 'same-origin' });
      const payload = await response.json().catch(() => ({}));
      return !!(response.ok && payload.authenticated);
    } catch {
      return false;
    }
  }

  function isDesktopViewport() {
    return window.matchMedia('(min-width: 769px)').matches;
  }

  function isMenuPage() {
    const path = window.location.pathname.split('/').pop() || '';
    return path.toLowerCase() === 'menu.html' || !!document.querySelector('.menu-tab');
  }

  function ensureStaffControls() {
    if (!isDesktopViewport()) {
      const button = document.getElementById('staffLoginBtn');
      const modal = document.getElementById('staffLoginModal');
      if (button) button.remove();
      if (modal) modal.remove();
      return;
    }

    if (document.getElementById('staffLoginBtn')) return;

    const navLinks = document.getElementById('navLinks');
    const button = document.createElement('button');
    button.id = 'staffLoginBtn';
    button.type = 'button';
    button.className = 'staff-login-btn';
    button.textContent = 'Staff Login';

    if (navLinks) {
      const listItem = document.createElement('li');
      listItem.appendChild(button);
      navLinks.appendChild(listItem);
    } else {
      button.style.position = 'fixed';
      button.style.right = '20px';
      button.style.top = '20px';
      button.style.zIndex = '100';
      document.body.appendChild(button);
    }

    const modal = document.createElement('div');
    modal.id = 'staffLoginModal';
    modal.className = 'staff-modal hidden';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="staff-modal-panel" role="dialog" aria-modal="true" aria-labelledby="staffLoginTitle">
        <button type="button" class="staff-modal-close" aria-label="Close login">×</button>
        <h3 id="staffLoginTitle">Staff Access</h3>
        <form id="staffLoginForm" class="staff-login-form">
          <label>
            Username
            <input id="staffUser" name="username" type="text" required />
          </label>
          <label>
            Password
            <input id="staffPass" name="password" type="password" required />
          </label>
          <p id="staffLoginError" class="staff-login-error" hidden></p>
          <button type="submit">Enter Editor Mode</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.staff-modal-close');
    const form = modal.querySelector('#staffLoginForm');

    button.addEventListener('click', openLoginModal);
    closeBtn.addEventListener('click', closeLoginModal);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeLoginModal();
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const errorEl = document.getElementById('staffLoginError');
      const username = document.getElementById('staffUser').value.trim();
      const password = document.getElementById('staffPass').value;

      if (submitBtn) submitBtn.disabled = true;
      if (errorEl) {
        errorEl.hidden = true;
        errorEl.textContent = '';
      }

      try {
        await loginAsStaff(username, password);
        setEditorMode(true);
        closeLoginModal();
        form.reset();
      } catch (error) {
        if (errorEl) {
          errorEl.hidden = false;
          errorEl.textContent = error.message || 'Invalid staff credentials.';
        } else {
          alert(error.message || 'Invalid staff credentials.');
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeLoginModal();
      }
    });
  }

  function openLoginModal() {
    const modal = document.getElementById('staffLoginModal');
    const menuOverlay = document.getElementById('modalOverlay');
    if (menuOverlay) {
      menuOverlay.classList.remove('open');
      document.body.style.overflow = '';
    }
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeLoginModal() {
    const modal = document.getElementById('staffLoginModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  function setEditorMode(enabled) {
    document.body.classList.toggle('editor-enabled', enabled);
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');

    const detailModal = document.getElementById('modalOverlay');
    if (detailModal) detailModal.classList.remove('open');
    const editModal = document.getElementById('menuEditorModal');
    if (editModal) editModal.classList.add('hidden');

    const toolbar = document.getElementById('editorToolbar');
    if (toolbar) toolbar.remove();

    if (!enabled || !isMenuPage()) {
      if (window.AKOEditor && typeof window.AKOEditor.refreshMenuEditorState === 'function') {
        window.AKOEditor.refreshMenuEditorState();
      }
      return;
    }

    if (!document.getElementById('editorToolbar')) {
      const menuToolbar = document.createElement('div');
      menuToolbar.id = 'editorToolbar';
      menuToolbar.className = 'editor-toolbar';

      const undoBtn = document.createElement('button');
      undoBtn.type = 'button';
      undoBtn.textContent = 'Undo';
      undoBtn.addEventListener('click', () => {
        if (window.AKOEditor && typeof window.AKOEditor.undoMenuChange === 'function') {
          window.AKOEditor.undoMenuChange();
        }
      });

      const redoBtn = document.createElement('button');
      redoBtn.type = 'button';
      redoBtn.textContent = 'Redo';
      redoBtn.addEventListener('click', () => {
        if (window.AKOEditor && typeof window.AKOEditor.redoMenuChange === 'function') {
          window.AKOEditor.redoMenuChange();
        }
      });

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.textContent = 'Add Drink';
      addBtn.addEventListener('click', () => {
        if (window.AKOEditor && typeof window.AKOEditor.addDrinkFromPrompt === 'function') {
          window.AKOEditor.addDrinkFromPrompt();
        }
      });

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = 'Edit Selected';
      editBtn.addEventListener('click', () => {
        if (window.AKOEditor && typeof window.AKOEditor.editSelectedDrink === 'function') {
          window.AKOEditor.editSelectedDrink();
        }
      });

      const moveCurrentBtn = document.createElement('button');
      moveCurrentBtn.type = 'button';
      moveCurrentBtn.textContent = 'Move to Current';
      moveCurrentBtn.addEventListener('click', () => {
        if (window.AKOEditor && typeof window.AKOEditor.moveSelectedArchiveItem === 'function') {
          window.AKOEditor.moveSelectedArchiveItem();
        }
      });

      const moveArchiveBtn = document.createElement('button');
      moveArchiveBtn.type = 'button';
      moveArchiveBtn.textContent = 'Move to Archive';
      moveArchiveBtn.addEventListener('click', () => {
        if (window.AKOEditor && typeof window.AKOEditor.moveSelectedCurrentItemToArchive === 'function') {
          window.AKOEditor.moveSelectedCurrentItemToArchive();
        }
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Delete Selected';
      deleteBtn.addEventListener('click', () => {
        if (window.AKOEditor && typeof window.AKOEditor.deleteSelectedDrink === 'function') {
          window.AKOEditor.deleteSelectedDrink();
        }
      });

      const sectionBtn = document.createElement('button');
      sectionBtn.type = 'button';
      sectionBtn.textContent = 'Create Section';
      sectionBtn.addEventListener('click', () => {
        if (window.AKOEditor && typeof window.AKOEditor.createMenuSection === 'function') {
          window.AKOEditor.createMenuSection();
        }
      });

      const publishBtn = document.createElement('button');
      publishBtn.type = 'button';
      publishBtn.textContent = 'Publish GitHub';
      publishBtn.addEventListener('click', async () => {
        if (!window.AKOEditor || typeof window.AKOEditor.publishMenuStateToGitHub !== 'function') {
          return;
        }

        publishBtn.disabled = true;
        const originalLabel = publishBtn.textContent;
        publishBtn.textContent = 'Publishing...';

        try {
          await window.AKOEditor.publishMenuStateToGitHub();
        } finally {
          publishBtn.disabled = false;
          publishBtn.textContent = originalLabel;
        }
      });

      const exitBtn = document.createElement('button');
      exitBtn.type = 'button';
      exitBtn.textContent = 'Exit Editor';
      exitBtn.addEventListener('click', () => setEditorMode(false));

      menuToolbar.append(undoBtn, redoBtn, addBtn, editBtn, moveCurrentBtn, moveArchiveBtn, deleteBtn, sectionBtn, publishBtn, exitBtn);
      document.body.appendChild(menuToolbar);
    }

    if (window.AKOEditor && typeof window.AKOEditor.refreshMenuEditorState === 'function') {
      window.AKOEditor.refreshMenuEditorState();
    }
  }

  ensureStaffControls();

  window.addEventListener('resize', () => {
    if (!isDesktopViewport()) {
      const button = document.getElementById('staffLoginBtn');
      const modal = document.getElementById('staffLoginModal');
      if (button) button.remove();
      if (modal) modal.remove();
      setEditorMode(false);
      return;
    }

    ensureStaffControls();
  });

  (async () => {
    if (localStorage.getItem(STORAGE_KEY) !== '1') return;
    const isAuthenticated = await getAdminStatus();
    if (isAuthenticated) {
      setEditorMode(true);
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    setEditorMode(false);
  })();

  window.AKO = window.AKO || {};
  window.AKO.editor = {
    setEditorMode,
    openLoginModal,
    closeLoginModal,
  };
  window.AKOEditor = window.AKO.editor;
})();