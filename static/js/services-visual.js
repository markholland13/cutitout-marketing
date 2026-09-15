(() => {
  'use strict';
  const controls = document.querySelector('[data-finish-controls]');
  const buttons = [...controls.querySelectorAll('button')];
  const options = [...document.querySelectorAll('[data-finish-view]')];
  function chooseFinish(finish) {
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.finish === finish)));
    options.forEach(option => { option.hidden = option.dataset.finishView !== finish; });
  }
  controls.hidden = false;
  chooseFinish('coated');
  buttons.forEach(button => button.addEventListener('click', () => chooseFinish(button.dataset.finish)));

  const header = document.querySelector('.cio-header');
  const sizeHeader = () => document.documentElement.style.setProperty('--sv-header', `${header.getBoundingClientRect().height}px`);
  sizeHeader();
  if ('ResizeObserver' in window) new ResizeObserver(sizeHeader).observe(header);
  else window.addEventListener('resize', sizeHeader);

  const sections = [...document.querySelectorAll('[data-service-section]')];
  const links = [...document.querySelectorAll('.sv-nav a')];
  let queued = false;
  function updateSection() {
    let active = sections[0];
    const threshold = header.getBoundingClientRect().height + 100;
    sections.forEach(section => { if (section.getBoundingClientRect().top <= threshold) active = section; });
    links.forEach(link => {
      if (link.hash === `#${active.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    queued = false;
  }
  window.addEventListener('scroll', () => {
    if (!queued) { queued = true; requestAnimationFrame(updateSection); }
  }, {passive:true});
  updateSection();
})();
