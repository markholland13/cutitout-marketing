(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const track = document.getElementById('partsTrack');
  const slides = [...track.children];
  const previous = document.getElementById('partsPrevious');
  const next = document.getElementById('partsNext');
  const position = document.getElementById('partsPosition');
  let selected = 0, settleTimer = 0;
  function update() {
    previous.disabled = selected === 0; next.disabled = selected === slides.length - 1;
    position.textContent = `${selected + 1} / ${slides.length}`;
  }
  function select(index, instant = false) {
    selected = Math.max(0, Math.min(slides.length - 1, index)); update();
    slides[selected].querySelector('img').loading = 'eager';
    track.scrollTo({ left: selected * track.clientWidth, behavior: reduced.matches || instant ? 'instant' : 'smooth' });
  }
  previous.addEventListener('click', () => select(selected - 1));
  next.addEventListener('click', () => select(selected + 1));
  track.addEventListener('keydown', event => {
    const actions = { ArrowRight: selected + 1, ArrowLeft: selected - 1, Home: 0, End: slides.length - 1 };
    if (!(event.key in actions)) return;
    event.preventDefault(); select(actions[event.key]);
  });
  function settled() {
    clearTimeout(settleTimer);
    selected = Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / track.clientWidth))); update();
  }
  track.addEventListener('scroll', () => { clearTimeout(settleTimer); settleTimer = setTimeout(settled, 160); }, { passive: true });
  track.addEventListener('scrollend', settled);
  let lastWidth = track.clientWidth;
  new ResizeObserver(() => {
    if (track.clientWidth === lastWidth) return;
    lastWidth = track.clientWidth; select(selected, true);
  }).observe(track);
  document.getElementById('partsCarouselControls').hidden = false;
  update();

  const video = document.getElementById('partsWorkshopVideo');
  const toggle = document.getElementById('partsWorkshopToggle');
  const connection = navigator.connection;
  const limited = () => reduced.matches || connection?.saveData || ['2g', 'slow-2g'].includes(connection?.effectiveType);
  let visible = false, loaded = false, failed = false, wantsPlayback = !limited(), loadTimer = 0;
  function label() { toggle.innerHTML = video.paused ? 'Play <span aria-hidden="true">▷</span>' : 'Pause <span aria-hidden="true">Ⅱ</span>'; toggle.setAttribute('aria-label', video.paused ? 'Play workshop video' : 'Pause workshop video'); }
  function fail() {
    failed = true; loaded = false; clearTimeout(loadTimer); video.pause();
    video.removeAttribute('src'); video.load(); toggle.hidden = true;
  }
  function sync() {
    if (!visible || !wantsPlayback || document.hidden || failed) { video.pause(); return; }
    if (!loaded) {
      loaded = true; video.src = '/static/img/home/video.mp4?v=20260915-light'; video.load();
      loadTimer = setTimeout(() => { if (video.readyState < 2) fail(); }, 12000);
    }
    video.play().catch(label);
  }
  toggle.hidden = false; label();
  toggle.addEventListener('click', () => { wantsPlayback = video.paused; sync(); });
  video.addEventListener('loadeddata', () => clearTimeout(loadTimer));
  video.addEventListener('play', label); video.addEventListener('pause', label);
  video.addEventListener('error', () => { if (loaded) fail(); });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .35; sync();
  }, { threshold: .35 }).observe(video);
  document.addEventListener('visibilitychange', sync);
  const preferences = () => { if (limited()) { wantsPlayback = false; sync(); } };
  reduced.addEventListener('change', preferences); connection?.addEventListener?.('change', preferences);
  addEventListener('pagehide', () => video.pause());
})();
