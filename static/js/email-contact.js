/* Modest protection from basic HTML scrapers, not a spam-prevention guarantee.
   The address is assembled only when the visitor chooses to open their mail app. */
(() => {
  'use strict';
  document.querySelectorAll('[data-email-contact]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => {
      const name = String.fromCharCode(97, 100, 109, 105, 110);
      const domain = ['cutitout', 'uk'].join('.');
      window.location.href = ['mailto:', name, '@', domain].join('');
    });
  });
})();
