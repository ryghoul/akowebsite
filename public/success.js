/* =========================================================
   success.js — Confirms a Stripe checkout session server-side
   and reports the result. All the actual work (verifying
   payment, decrementing stock, sending receipt emails) happens
   in GET /api/confirm-order — this page just calls it and shows
   the outcome.
   ========================================================= */

(function () {

  const statusEl = document.getElementById('successStatus');
  const detailEl = document.getElementById('successDetail');

  function showState(state, title, detail) {
    document.body.dataset.state = state; // 'loading' | 'success' | 'error' | 'canceled'
    if (statusEl) statusEl.textContent = title;
    if (detailEl) detailEl.textContent = detail || '';
  }

  async function confirmOrder() {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id') || params.get('sessionId');

    if (params.get('canceled')) {
      showState('canceled', 'Checkout canceled', 'Your cart is still saved — you can check out again any time.');
      return;
    }

    if (!sessionId) {
      showState('error', 'No order found', 'We couldn’t find an order to confirm. If you were charged, please contact us.');
      return;
    }

    try {
      const res = await fetch(`/api/confirm-order?session_id=${encodeURIComponent(sessionId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Unable to confirm your order.');
      }
      showState('success', 'Thank you for your order!', 'A confirmation email is on its way. We can’t wait for you to try it.');
      // Order is confirmed paid — clear the persisted cart so the items
      // just bought don't linger and invite a duplicate checkout.
      window.AKO?.clearCart?.();
    } catch (err) {
      console.error('[success] confirm-order failed:', err);
      showState('error', 'Something went wrong', err.message || 'We couldn’t confirm your order. If you were charged, please contact us and we’ll sort it out.');
    }
  }

  confirmOrder();

})();
