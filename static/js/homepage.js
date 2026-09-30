(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  // Keep the dark header through the opening, then use grey-green at the gallery.
  const header = document.querySelector('.cio-header');
  const openingFilm = document.getElementById('manufacturingJourney');
  const heroIntro = document.querySelector('.hero-intro');
  let headerHeight = header.offsetHeight, headerFrame = 0;
  const updateHeader = () => {
    headerFrame = 0;
    header.classList.toggle('header-scrolled', openingFilm.getBoundingClientRect().bottom <= headerHeight);
    const fadeDistance = Math.max(160, Math.min(280, innerHeight * .3));
    heroIntro?.style.setProperty('--hero-intro-opacity', String(Math.max(0, 1 - scrollY / fadeDistance)));
  };
  addEventListener('scroll', () => { if (!headerFrame) headerFrame = requestAnimationFrame(updateHeader); }, { passive: true });
  new ResizeObserver(() => { headerHeight = header.offsetHeight; updateHeader(); }).observe(header);
  addEventListener('pageshow', updateHeader);
  addEventListener('resize', updateHeader, { passive: true });
  updateHeader();

  // Semantic details remain fully usable when JavaScript is unavailable.
  const details = [...document.querySelectorAll('[data-material]')];
  const sample = document.getElementById('materialImage');
  const label = document.getElementById('materialLabel');
  details.forEach(item => item.addEventListener('toggle', () => {
    if (!item.open) return;
    details.forEach(other => { if (other !== item) other.open = false; });
    const name = item.querySelector('summary span').textContent;
    sample.src = `/static/img/materials/${item.dataset.material}.webp`;
    sample.alt = `${name} surface`;
    label.textContent = name.toUpperCase();
    document.querySelector('.sample-mark').textContent = `CUT / ${String(details.indexOf(item) + 1).padStart(2, '0')}`;
    if (!reduced.matches) sample.animate([{ opacity: .5 }, { opacity: 1 }], { duration: 350, easing: 'ease-out' });
  }));

  // Keep reading order and normal scrolling. Animate only images, never hide copy.
  const animations = new Set();
  const reveal = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      reveal.unobserve(entry.target);
      if (reduced.matches) continue;
      const animation = entry.target.animate([{ transform: 'translateY(32px)', opacity: .65 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 800, easing: 'cubic-bezier(.2,.7,.2,1)' });
      animations.add(animation);
      animation.onfinish = () => animations.delete(animation);
    }
  }, { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(element => reveal.observe(element));
  reduced.addEventListener('change', () => { if (reduced.matches) { animations.forEach(animation => animation.cancel()); animations.clear(); } });
})();
