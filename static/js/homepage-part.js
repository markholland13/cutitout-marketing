/* Automatic hero loop. The existing still is the no-JS/data fallback. */
(() => {
  'use strict';
  const stage = document.querySelector('.hero-object');
  const video = document.getElementById('partMotion');
  if (!stage || !video) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const small = matchMedia('(max-width: 680px)');
  const connection = navigator.connection;
  const limited = () => reduced.matches || connection?.saveData || ['2g', 'slow-2g'].includes(connection?.effectiveType) || navigator.deviceMemory <= 2;
  let loaded = false, ready = false, visible = false, failed = false;
  let timer = 0;

  function unload() {
    clearTimeout(timer);
    loaded = ready = false;
    video.pause(); video.removeAttribute('src'); video.load();
    stage.classList.remove('part-ready');
  }
  function fail() {
    failed = true; unload();
    document.getElementById('manufacturingJourney')?.dispatchEvent(new Event('cio:handoff-skip'));
  }
  async function play() {
    if (!ready || !visible || document.hidden || limited() || stage.dataset.handoff === 'active') return;
    try { await video.play(); }
    catch { stage.classList.remove('part-ready'); }
  }
  function load() {
    if (loaded || failed || limited() || !visible) return;
    loaded = true;
    video.src = `/static/home/part-reveal-loop-photo-${small.matches ? 'mobile' : 'desktop'}.mp4`;
    video.preload = 'auto'; video.playbackRate = 1; video.load();
    timer = setTimeout(() => { if (!ready) fail(); }, 10000);
  }
  video.addEventListener('loadeddata', () => {
    if (!loaded || limited()) return;
    clearTimeout(timer); ready = true;
    stage.classList.add('part-ready'); play();
  });
  video.addEventListener('playing', () => stage.classList.add('part-ready'));
  video.addEventListener('error', () => { if (loaded) fail(); });
  stage.addEventListener('cio:handoff-return', play);
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .35;
    if (visible) { load(); play(); }
    else video.pause();
  }, { threshold: .35 });
  const boot = () => observer.observe(stage);
  if (document.readyState === 'complete') boot(); else addEventListener('load', boot, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause(); else play();
  });
  const preferences = () => { if (limited()) unload(); else load(); };
  reduced.addEventListener('change', preferences);
  connection?.addEventListener?.('change', preferences);
  addEventListener('pagehide', () => video.pause());
})();
