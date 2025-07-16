document.addEventListener('DOMContentLoaded', () => {
  const cartToggle = document.getElementById('cart-toggle');
  const cartSidebar = document.getElementById('cart-sidebar');
  const cartClose = document.getElementById('cart-close');
  const cartItemsContainer = document.getElementById('cart-items');
  const addToCartButtons = document.querySelectorAll('.add-to-cart');
  const totalDisplay = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('checkout-btn');
  const badge = document.getElementById('cart-badge');

  // ─── OPEN / CLOSE CART ───────────────────────────
  cartToggle.addEventListener('click', e => {
    e.preventDefault();
    cartSidebar.classList.add('open');
    cartSidebar.setAttribute('aria-hidden', 'false');
  });

  cartClose.addEventListener('click', () => {
    cartSidebar.classList.remove('open');
    cartSidebar.setAttribute('aria-hidden', 'true');
  });

  // ─── ADD TO CART BUTTON ───────────────────────────
  addToCartButtons.forEach(button => {
    button.addEventListener('click', () => {
      const productCard = button.closest('.product-card');
      const productInfo = productCard.querySelector('.product-info');
      const name = productInfo.querySelector('h1').innerText;
      const price = productInfo.querySelector('.price-tag')?.innerText || '$0';
      const color = productInfo.querySelector('label:nth-of-type(1) select')?.value || '';
      const size = productInfo.querySelector('label:nth-of-type(2) select')?.value || '';
      const imageEl = productCard.querySelector('.product-image img');
      const image = imageEl ? new URL(imageEl.getAttribute('src'), window.location.origin).href : 'placeholder.jpg';




      const currentCart = JSON.parse(localStorage.getItem('cart')) || [];

      const existingItem = currentCart.find(item =>
        item.name === name && item.color === color && item.size === size
      );

      if (existingItem) {
        existingItem.quantity++;
        } else {
      currentCart.push({ name, price, color, size, quantity: 1, image });
        }

      localStorage.setItem('cart', JSON.stringify(currentCart));
      showToast();
      renderCart();

      cartToggle.classList.add('pulse');
      setTimeout(() => cartToggle.classList.remove('pulse'), 300);
    });
  });

  // ─── CHECKOUT BUTTON ──────────────────────────────
  checkoutBtn.addEventListener('click', async () => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];

    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    const items = cart.map(item => {
      const numericPrice = parseFloat(item.price.replace(/[^0-9.]/g, '')) || 0;
      return {
        name: item.name + (item.color ? ` - ${item.color}` : '') + (item.size ? ` (${item.size})` : ''),
        price: Math.round(numericPrice * 100),
        quantity: item.quantity
      };
    });

    try {
      const res = await fetch('/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No Stripe session URL received:', data);
        alert('Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Failed to start checkout. Please try again later.');
    }
  });

  // ─── RENDER CART ──────────────────────────────────
  function renderCart() {
    cartItemsContainer.innerHTML = '';
    const cart = JSON.parse(localStorage.getItem('cart')) || [];

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
      if (totalDisplay) totalDisplay.textContent = 'Total: $0.00';
      if (checkoutBtn) checkoutBtn.style.display = 'none';
      if (badge) badge.style.display = 'none';
      return;
    } else {
      if (checkoutBtn) checkoutBtn.style.display = 'block';
    }

    cart.forEach((item, index) => addCartItemToDOM(item, index));

    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const index = Number(e.target.closest('.cart-item').dataset.index);
        const cart = JSON.parse(localStorage.getItem('cart')) || [];

        cart.splice(index, 1);
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCart();
      });
    });

    document.querySelectorAll('.qty-plus').forEach(btn => {
      btn.addEventListener('click', e => {
        const index = Number(e.target.closest('.cart-item').dataset.index);
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        cart[index].quantity++;
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCart();
      });
    });

    document.querySelectorAll('.qty-minus').forEach(btn => {
      btn.addEventListener('click', e => {
        const index = Number(e.target.closest('.cart-item').dataset.index);
        const cart = JSON.parse(localStorage.getItem('cart')) || [];

        if (cart[index].quantity > 1) {
          cart[index].quantity--;
        } else {
          cart.splice(index, 1);
        }

        localStorage.setItem('cart', JSON.stringify(cart));
        renderCart();
      });
    });

    let total = 0;
    cart.forEach(item => {
      const numericPrice = parseFloat(item.price.replace(/[^0-9.]/g, '')) || 0;
      total += numericPrice * item.quantity;
    });

    if (totalDisplay) {
      totalDisplay.textContent = `Total: $${total.toFixed(2)}`;
    }

    if (badge) {
      const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
      badge.style.display = itemCount ? 'inline-block' : 'none';
      badge.textContent = itemCount;
    }
  }

  // ─── ADD CART ITEM TO DOM ─────────────────────────
  function addCartItemToDOM(item, index) {
    const div = document.createElement('div');
    div.classList.add('cart-item');
    div.dataset.index = index;

    div.innerHTML = `
      <div class="cart-item-content">
        <img src="${item.image || 'placeholder.jpg'}" alt="${item.name}" class="cart-thumb" />
        <div class="cart-details">
          <p><strong>${item.name}</strong> - ${item.price}</p>
          ${item.color ? `<p>Color: ${item.color}</p>` : ''}
          ${item.size ? `<p>Size: ${item.size}</p>` : ''}
          <div class="qty-controls">
            <button class="qty-minus">−</button>
            <span class="item-qty">${item.quantity}</span>
            <button class="qty-plus">+</button>
          </div>
          <button class="remove-btn">Remove</button>
        </div>
      </div>
      <hr>
    `;

    cartItemsContainer.appendChild(div);
  }

  // ─── TOAST ─────────────────────────────────────────
  function showToast(message = 'Added to cart!') {
    const toast = document.getElementById('cart-toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.classList.add('hidden'), 300);
    }, 2000);
  }

  // ─── INITIAL RENDER ───────────────────────────────
  renderCart();
});
