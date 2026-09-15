/* Independent of app authentication; Account uses the existing account route. */
(() => {
  'use strict';
  document.querySelectorAll('[data-cio-header]').forEach(header => {
    if (header.classList.contains('cio-enhanced')) return;
    const toggle = header.querySelector('.cio-menu-toggle');
    const nav = header.querySelector('.cio-nav');
    if (!toggle || !nav) return;
    const mobile = window.matchMedia('(max-width: 1023px)');
    const close = (returnFocus = false) => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      if (returnFocus) toggle.focus();
    };
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', event => { if (event.target.closest('a')) close(); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) close(true);
    });
    document.addEventListener('click', event => { if (!header.contains(event.target)) close(); });
    header.addEventListener('focusout', event => {
      if (event.relatedTarget && !header.contains(event.relatedTarget)) close();
    });
    mobile.addEventListener('change', () => close());
    // Keep navigation accessible without JavaScript; enhance after listeners exist.
    header.classList.add('cio-enhanced');
    if (!nav.querySelector('[aria-current="page"]')) {
      const path = location.pathname.replace(/\/$/, '');
      const localPreview = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
      nav.querySelectorAll('a').forEach(link => {
        const url = new URL(link.href, location.href);
        const target = url.pathname.replace(/\/$/, '');
        const sameSite = url.origin === location.origin || (localPreview && url.origin === 'https://cutitout.uk');
        if (sameSite && target && (path === target || path.startsWith(target + '/'))) link.setAttribute('aria-current', 'page');
      });
    }
  });
})();
