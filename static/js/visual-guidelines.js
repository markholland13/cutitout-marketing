(() => {
  'use strict';
  // The same guide values used by the existing Design Centre pages.
  // These are reference values, not a live connection to the quote service.
  const guide = {
    metal: [
      { t: 1, hole: .7, min: 15, max: 900 },
      { t: 1.5, hole: .7, min: 15, max: 900 },
      { t: 2, hole: .8, min: 20, max: 850 },
      { t: 3, hole: 1.2, min: 25, max: 800 },
      { t: 4, hole: 1.5, min: 30, max: 700 },
      { t: 5, hole: 2.2, min: 40, max: 600 },
      { t: 6, hole: 2.8, min: 50, max: 500 }
    ],
    acrylic: [{ t: 3, hole: .7, min: 12, max: 500 }, { t: 5, hole: 1.5, min: 20, max: 500 }]
  };
  const $ = selector => document.querySelector(selector);
  const material = $('#material'), thickness = $('#thickness');
  function updateSizes() {
    const row = guide[material.value].find(row => row.t === Number(thickness.value));
    if (!row) return;
    $('#minimum-feature').innerHTML = `${row.hole} <small>mm</small>`;
    $('#feature-context').textContent = `For ${row.t} mm ${material.value} sheet.`;
    $('#size-material').textContent = `${row.t} mm ${material.value}`;
    $('#maximum-size').innerHTML = `${row.max} × ${row.max} <small>mm</small>`;
    $('#minimum-size').textContent = `${row.min} × ${row.min} mm`;
    $('#material-description').textContent = material.value === 'metal' ? 'Mild steel, stainless steel or aluminium.' : 'Available acrylic sheet thicknesses.';
  }
  function updateThicknesses() {
    const previous = Number(thickness.value);
    thickness.replaceChildren(...guide[material.value].map(row => new Option(`${row.t} mm`, row.t)));
    if (guide[material.value].some(row => row.t === previous)) thickness.value = previous;
    updateSizes();
  }
  material.addEventListener('change', updateThicknesses);
  thickness.addEventListener('change', updateSizes);
  updateThicknesses();
  $('#bolt').addEventListener('change', event => {
    const size = Number(event.target.value);
    $('#close-fit').innerHTML = `${(size + .2).toFixed(1)} <small>mm</small>`;
    $('#easy-fit').innerHTML = `${(size + .4).toFixed(1)} <small>mm</small>`;
  });

  const header = $('.cio-header');
  const updateHeaderHeight = () => document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
  updateHeaderHeight();
  if ('ResizeObserver' in window) new ResizeObserver(updateHeaderHeight).observe(header);
  else window.addEventListener('resize', updateHeaderHeight);

  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function selectTab(tab, focus = false) {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    });
    if (focus) tab.focus();
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let target;
      if (event.key === 'ArrowRight') target = (i + 1) % tabs.length;
      if (event.key === 'ArrowLeft') target = (i - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = tabs.length - 1;
      if (target !== undefined) { event.preventDefault(); selectTab(tabs[target], true); }
    });
  });

  // Open the on-page reference when arriving from the part-size chapter.
  const materialReference = $('#material-reference');
  const revealReference = () => {
    if (location.hash === '#material-reference') materialReference.open = true;
  };
  window.addEventListener('hashchange', revealReference);
  document.querySelectorAll('a[href="#material-reference"]').forEach(link => {
    link.addEventListener('click', () => { materialReference.open = true; });
  });
  revealReference();

  const chapters = [...document.querySelectorAll('.chapter')];
  const chapterLinks = [...document.querySelectorAll('.chapter-links a')];
  let scrollPending = false;
  function updateChapter() {
    let active = chapters[0];
    const threshold = header.getBoundingClientRect().height + 110;
    for (const chapter of chapters) if (chapter.getBoundingClientRect().top <= threshold) active = chapter;
    chapterLinks.forEach(link => {
      if (link.hash === `#${active.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    scrollPending = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollPending) { scrollPending = true; requestAnimationFrame(updateChapter); }
  }, { passive: true });
  updateChapter();

  const checks = [...document.querySelectorAll('.checklist-items input')];
  checks.forEach(input => input.addEventListener('change', () => {
    const done = checks.filter(input => input.checked).length;
    $('#check-progress').textContent = done === 4 ? 'All four checked. Your drawing is ready for the quote check.' : `${done} of 4 checked. You can upload whenever you’re ready.`;
  }));

  // Frames are fetched only after an explicit play request; the comparison is
  // complete without motion, JavaScript, or any successful animation download.
  const canvas = $('#stencil-canvas'), context = canvas.getContext('2d');
  const play = $('#stencil-play'), label = play.querySelector('.play-label');
  const status = $('#motion-status'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frames = [], playing = false, frameIndex = 0, frameRequest = 0, lastTick = 0;
  if (context) $('.motion-control').hidden = false;
  function pause() {
    playing = false;
    cancelAnimationFrame(frameRequest);
    label.textContent = frameIndex >= 35 ? 'Replay demonstration' : 'Resume demonstration';
    play.querySelector('.play-symbol').textContent = '▷';
    status.textContent = frameIndex >= 35 ? 'Without a bridge, the centre is a loose piece.' : 'Paused. The centre has no connection to the plate.';
  }
  function tick(time) {
    if (!playing) return;
    if (time - lastTick >= 1000 / 12) {
      context.drawImage(frames[frameIndex], 0, 0, canvas.width, canvas.height);
      lastTick = time;
      if (frameIndex >= frames.length - 1) { pause(); return; }
      frameIndex++;
    }
    frameRequest = requestAnimationFrame(tick);
  }
  play.addEventListener('click', async () => {
    if (playing) { pause(); return; }
    if (reduced.matches) {
      status.textContent = 'Motion is off in your device settings. Compare the two still examples above.';
      return;
    }
    if (!frames.length) {
      play.disabled = true;
      label.textContent = 'Loading demonstration…';
      status.textContent = 'Loading only this short example.';
      try {
        frames = await Promise.all(Array.from({ length: 36 }, (_, i) => new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = `/static/img/guidelines/visual/stencil-motion/frame-${String(i + 1).padStart(3, '0')}.jpg`;
        })));
      } catch {
        frames = [];
        label.textContent = 'Try demonstration again';
        status.textContent = 'The animation could not load. The still examples show the same rule.';
        return;
      } finally { play.disabled = false; }
    }
    if (reduced.matches || document.hidden) return;
    if (frameIndex >= frames.length - 1) frameIndex = 0;
    canvas.hidden = false;
    playing = true;
    lastTick = 0;
    label.textContent = 'Pause demonstration';
    play.querySelector('.play-symbol').textContent = 'Ⅱ';
    status.textContent = 'Watch the unconnected centre drop away.';
    frameRequest = requestAnimationFrame(tick);
  });
  reduced.addEventListener('change', () => { if (reduced.matches) { pause(); canvas.hidden = true; } });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) pause(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting && playing) pause();
  }, { threshold: .05 }).observe($('#stencil'));
})();
