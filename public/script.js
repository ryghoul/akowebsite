(function () {
  const enterBtn     = document.getElementById('enterBtn');
  const landing      = document.getElementById('landing');
  const home         = document.getElementById('home');
  const flyingLogo   = document.getElementById('flyingLogo');
  const headlineWrap = document.getElementById('headlineWrap');
  const navLogoSlot  = document.getElementById('navLogoSlot');
  const navLinks     = document.getElementById('navLinks');
  const homeContent  = document.getElementById('homeContent');
  const homeFooter   = document.getElementById('homeFooter');

  enterBtn.addEventListener('click', () => {
    enterBtn.disabled = true;

    /* ── STEP 1: Wipe text left → right ── */
    headlineWrap.classList.add('wipe-out');

    /* ── STEP 2: Logo flies to nav after wipe completes (~550ms) ── */
    setTimeout(() => {

      /* Reveal home shell so nav slot has real coords */
      home.setAttribute('aria-hidden', 'false');

      const fromRect = flyingLogo.getBoundingClientRect();
      const toRect   = navLogoSlot.getBoundingClientRect();

      const targetH = 40;
      const targetW = targetH * (fromRect.width / fromRect.height);

      /* Insert the final static logo immediately — opacity 0 so it's invisible
         until the clone finishes flying. No CSS animation on this element. */
      const finalLogo       = document.createElement('img');
      finalLogo.src         = flyingLogo.src;
      finalLogo.alt         = 'AKO';
      finalLogo.className   = 'nav-logo--static';
      finalLogo.style.cssText = `
        height: 40px;
        width: auto;
        object-fit: contain;
        opacity: 0;
      `;
      navLogoSlot.appendChild(finalLogo);

      /* Hide the original so it doesn't ghost behind the clone */
      flyingLogo.style.visibility = 'hidden';

      /* Create flying clone that starts at the logo's current position */
      const clone = flyingLogo.cloneNode(true);
      clone.removeAttribute('id');
      clone.style.cssText = `
        position: fixed;
        left:   ${fromRect.left}px;
        top:    ${fromRect.top}px;
        width:  ${fromRect.width}px;
        height: ${fromRect.height}px;
        object-fit: contain;
        z-index: 9999;
        pointer-events: none;
        transition: left   0.65s cubic-bezier(0.76,0,0.24,1),
                    top    0.65s cubic-bezier(0.76,0,0.24,1),
                    width  0.65s cubic-bezier(0.76,0,0.24,1),
                    height 0.65s cubic-bezier(0.76,0,0.24,1);
      `;
      document.body.appendChild(clone);

      /* Trigger the fly on the next two frames so transition fires */
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          clone.style.left   = `${toRect.left}px`;
          clone.style.top    = `${toRect.top + (toRect.height - targetH) / 2}px`;
          clone.style.width  = `${targetW}px`;
          clone.style.height = `${targetH}px`;
        });
      });

      /* Fade the landing background out mid-flight */
      setTimeout(() => {
        landing.style.transition = 'opacity 0.4s ease';
        landing.style.opacity    = '0';
      }, 350);

      /* Once clone has landed: remove landing, swap clone for static logo,
         then fade in nav links + content + footer (NOT the logo) */
      setTimeout(() => {
        landing.style.display = 'none';
        clone.remove();

        /* Pop the static logo in — no transition, no animation */
        finalLogo.style.opacity = '1';

        /* Stagger the rest of the page in */
        navLinks.classList.add('visible');
        homeContent.classList.add('visible');
        homeFooter.classList.add('visible');
      }, 750);

    }, 550);
  });
})();