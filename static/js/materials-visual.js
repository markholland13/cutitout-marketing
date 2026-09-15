(() => {
  'use strict';
  const picker = document.querySelector('[data-material-picker]');
  const tabs = [...picker.querySelectorAll('[role="tab"]')];
  const panels = [...document.querySelectorAll('[data-material-panel]')];
  function selectMaterial(id, focus = false) {
    const target = tabs.find(tab => tab.getAttribute('aria-controls') === id);
    if (!target) return;
    tabs.forEach(tab => {
      const selected = tab === target;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(panel => { panel.hidden = panel.id !== id; });
    if (focus) target.focus();
  }
  picker.hidden = false;
  selectMaterial(panels.some(panel => `#${panel.id}` === location.hash) ? location.hash.slice(1) : 'mild-steel');
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectMaterial(tab.getAttribute('aria-controls')));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); selectMaterial(tabs[next].getAttribute('aria-controls'), true); }
    });
  });
  document.querySelectorAll('[data-material-jump]').forEach(link => {
    link.addEventListener('click', () => selectMaterial(link.hash.slice(1)));
  });
  window.addEventListener('hashchange', () => selectMaterial(location.hash.slice(1)));
  const header = document.querySelector('.cio-header');
  const measure = () => document.documentElement.style.setProperty('--sv-header', `${header.getBoundingClientRect().height}px`);
  measure();
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(header);
  else window.addEventListener('resize', measure);
})();
