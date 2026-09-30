/* Local instrumentation hooks. Reporting/consent must be configured separately. */
(() => {
  'use strict';
  const canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) return;
  let pagePath;
  try {
    const url = new URL(canonical.href);
    if (url.origin !== 'https://cutitout.uk' || !/^\/[a-z0-9/-]*$/.test(url.pathname)) return;
    pagePath = url.pathname;
  } catch { return; }
  const emit = details => {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ ...details, page_path: pagePath });
    } catch { /* Instrumentation must never interrupt an order journey. */ }
  };
  const click = event => {
    if ((event.type === 'click' && event.button > 0) || (event.type === 'auxclick' && event.button !== 1)) return;
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    try {
      const url = new URL(link.href, location.href);
      if (url.origin !== 'https://app.cutitout.uk') return;
      const path = url.pathname.replace(/\/$/, '');
      const name = { '/quote': 'cio_quote_cta_click', '/file-workshop': 'cio_workshop_cta_click' }[path];
      if (!name) return;
      const section = link.closest('section,header,footer,aside');
      const id = section?.id || section?.tagName?.toLowerCase() || 'page';
      emit({ event: name, destination: path, cta_section: /^[a-z0-9_-]{1,64}$/i.test(id) ? id : 'page' });
    } catch { /* Keep ordinary navigation working. */ }
  };
  document.addEventListener('click', click);
  document.addEventListener('auxclick', click);
  let scaleRecorded = false;
  document.addEventListener('cio:tool-used', event => {
    if (event.detail?.tool !== 'dxf_scale' || scaleRecorded) return;
    scaleRecorded = true;
    emit({ event: 'cio_tool_used', tool: 'dxf_scale' });
  });
})();
