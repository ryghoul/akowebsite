/* =========================================================
   contact.js — Contact form submission
   ========================================================= */

(function () {

  function getApiBase() {
    const isLocal =
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1';
    return isLocal ? 'http://localhost:3000' : '';
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  onReady(() => {
    const form      = document.getElementById('contact-form');
    const sendBtn   = document.getElementById('sendBtn');
    const btnText   = sendBtn?.querySelector('.btn-text');
    const status    = document.getElementById('formStatus');

    if (!form) {
      console.error('[contact] #contact-form not found');
      return;
    }

    function setStatus(msg, type = '') {
      if (!status) return;
      status.textContent = msg;
      status.className   = 'form-status' + (type ? ' ' + type : '');
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const data = {
        name:    document.getElementById('name')?.value?.trim(),
        email:   document.getElementById('email')?.value?.trim(),
        subject: document.getElementById('subject')?.value?.trim(),
        message: document.getElementById('message')?.value?.trim(),
        website: '' // honeypot — must stay empty
      };

      if (!data.name || !data.email || !data.message) {
        setStatus('Please fill out your name, email, and message.', 'error');
        return;
      }

      /* Loading state */
      if (sendBtn)  sendBtn.disabled  = true;
      if (btnText)  btnText.textContent = 'Sending…';
      setStatus('');

      const API = getApiBase();

      try {
        const resp = await fetch(`${API}/contact`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(data)
        });

        const bodyText = await resp.text();
        let payload = null;
        try { payload = JSON.parse(bodyText); } catch {}

        if (resp.ok) {
          setStatus(payload?.message || 'Message sent — we\'ll be in touch soon!', 'success');
          form.reset();
        } else {
          const msg = payload?.message || bodyText || `Something went wrong (${resp.status})`;
          setStatus(msg, 'error');
          console.error('Contact error:', { status: resp.status, msg, payload });
        }

      } catch (err) {
        setStatus('Network error — please try again or email us directly.', 'error');
        console.error('Fetch failed:', err);
      } finally {
        if (sendBtn)  sendBtn.disabled   = false;
        if (btnText)  btnText.textContent = 'Send Message';
      }
    });
  });

})();