/* Normal film playback and optional seeking, coordinated with the scroll entrance. */
(() => {
  'use strict';
  const section = document.getElementById('manufacturingJourney');
  if (!section) return;
  const video = document.getElementById('journeyVideo');
  const controls = document.getElementById('journeyControls');
  const toggle = document.getElementById('journeyToggle');
  const scrubber = document.getElementById('journeyScrubber');
  const chapter = document.getElementById('journeyChapter');
  const number = document.getElementById('journeyChapterNumber');
  const quote = document.getElementById('journeyQuote');
  const endTitle = document.getElementById('journeyEndTitle');
  const shell = section.querySelector('.film-shell');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 680px)');
  const connection = navigator.connection;
  const base = '/static/home/journey/';
  let loaded = false, near = false, visible = false, started = false, manualPause = false;
  let frameCallback = 0, loadTimer = 0, stallTimer = 0, unavailable = false;
  let pendingSeek = null, queuedScrub = null, seekRaf = 0, dragging = false;
  const limited = () => reduced.matches || connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType) || navigator.deviceMemory <= 2;
  const stages = [
    [3, 'Your drawing.', 'The same part drawn in CAD software'],
    [5, 'Upload your file.', 'Uploading the drawing to Cut It Out'],
    [8, 'Material & price.', 'Stainless steel selected with an example quote of £24.80 per part'],
    [18, 'Laser cut.', 'Laser cutting, the part lifting and its matching CAD outline'],
    [22, 'Finished with care.', 'The part passing through the finishing machine'],
    [27, 'Protected & packed.', 'The same part wrapped and sealed in a branded parcel'],
    [29, 'On its way.', 'The finished parcel leaving for the customer'],
    [31, 'Delivered.', 'From your screen to your door'],
    [33, 'Delivered.', 'Let’s Cut It Out — get an instant quote']
  ];
  const clamp = value => Math.max(0, Math.min(1, value));
  // Align the HTML invitation to the logo in the contained landscape/portrait film.
  const alignEndCard = () => {
    const portrait = video.videoWidth ? video.videoHeight > video.videoWidth : mobile.matches;
    const aspect = portrait ? 768 / 1024 : 1440 / 900;
    const displayedHeight = Math.min(shell.clientHeight, shell.clientWidth / aspect);
    section.style.setProperty('--journey-logo-half', `${displayedHeight * (portrait ? 24 / 1024 : 50 / 900)}px`);
  };
  new ResizeObserver(alignEndCard).observe(shell);
  const update = () => {
    const ratio = video.duration ? Math.min(1, video.currentTime / video.duration) : 0;
    const time = video.currentTime;
    if (!dragging && queuedScrub === null) scrubber.value = (ratio * 100).toFixed(1);
    const stage = Math.max(0, stages.findIndex(([end], i) => time < end || i === stages.length - 1));
    number.textContent = String(stage + 1).padStart(2, '0');
    const outro = loaded && time >= 30;
    quote.hidden = loaded && time < 31;
    endTitle.hidden = !loaded || time < 31;
    section.classList.toggle('journey-outro', outro);
    section.style.setProperty('--delivery-opacity', String(1 - clamp((time - 30) / .8)));
    section.style.setProperty('--outro-opacity', String(clamp((time - 31) / .8)));
    chapter.parentElement.setAttribute('aria-hidden', String(outro && time >= 30.8));
    chapter.textContent = stages[stage][1];
    scrubber.setAttribute('aria-valuetext', stages[stage][2]);
    toggle.innerHTML = `${video.ended ? 'Replay' : video.paused ? 'Play' : 'Pause'} <span aria-hidden="true">${video.paused ? '↗' : 'Ⅱ'}</span>`;
  };
  const stopFrames = () => {
    if (frameCallback && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(frameCallback);
    frameCallback = 0;
  };
  const frame = () => {
    frameCallback = 0; update();
    if (!video.paused && !video.ended && video.requestVideoFrameCallback) frameCallback = video.requestVideoFrameCallback(frame);
  };
  const staticView = () => {
    clearTimeout(loadTimer); clearTimeout(stallTimer); cancelAnimationFrame(seekRaf); seekRaf = 0; queuedScrub = null; dragging = false; video.pause(); stopFrames();
    loaded = false; section.classList.remove('is-ready', 'has-controls');
    controls.hidden = true;
    video.removeAttribute('src'); video.preload = 'none'; video.load();
    number.textContent = '08'; chapter.textContent = 'Your finished part.';
    quote.hidden = false; endTitle.hidden = true;
    section.classList.remove('journey-outro');
    chapter.parentElement.removeAttribute('aria-hidden');
    section.style.removeProperty('--delivery-opacity');
    section.style.removeProperty('--outro-opacity');
  };
  const fail = () => { unavailable = true; staticView(); section.dispatchEvent(new Event('cio:handoff-skip')); };
  function load() {
    if (loaded || unavailable || limited() || !near) return;
    loaded = true; video.preload = 'auto';
    video.src = `${base}film-${mobile.matches ? 'mobile' : 'desktop'}.mp4?v=20260930-outro-1`;
    video.load();
    loadTimer = setTimeout(() => { if (video.readyState < 2) fail(); }, 12000);
  }
  async function play() {
    if (!loaded || limited() || unavailable || !visible || document.hidden || section.dataset.handoffHold === 'true') return;
    try {
      await video.play(); started = true;
    } catch {
      // Autoplay refusal keeps the poster and a usable explicit play control.
      manualPause = true;
    }
    update();
  }
  video.addEventListener('loadeddata', () => {
    clearTimeout(loadTimer);
    if (!loaded || limited()) return;
    controls.hidden = false; section.classList.add('has-controls');
    alignEndCard(); update();
    if (pendingSeek !== null) { video.currentTime = pendingSeek * video.duration; pendingSeek = null; }
    if (visible && !started && !manualPause) play();
  });
  video.addEventListener('playing', () => { clearTimeout(stallTimer); section.classList.add('is-ready'); stopFrames(); frame(); });
  video.addEventListener('pause', () => { clearTimeout(stallTimer); stopFrames(); update(); });
  video.addEventListener('waiting', () => {
    clearTimeout(stallTimer);
    if (!video.paused && visible) stallTimer = setTimeout(() => { if (!video.paused && video.readyState < 3 && visible) fail(); }, 5000);
  });
  video.addEventListener('ended', () => { stopFrames(); update(); });
  video.addEventListener('timeupdate', update);
  video.addEventListener('seeked', () => { section.classList.add('is-ready'); update(); commitSeek(); });
  video.addEventListener('error', () => { if (loaded) fail(); });
  // The scroll handoff owns only the opening CAD shot. The rest remains a normal film.
  section.addEventListener('cio:handoff', event => {
    const { hold, time } = event.detail;
    section.dataset.handoffHold = String(hold);
    if (hold) {
      video.pause(); near = true; load();
      if (Number.isFinite(time) && video.readyState >= 2) {
        queuedScrub = time / video.duration; commitSeek();
      }
    } else if (!manualPause && !video.ended) play();
  });
  toggle.addEventListener('click', () => {
    section.dispatchEvent(new CustomEvent('cio:handoff-skip',{detail:{keepLayout:true}}));
    if (video.paused || video.ended) {
      if (video.ended || video.currentTime >= video.duration - .05) { video.currentTime = 0; update(); }
      manualPause = false; play();
    } else { manualPause = true; video.pause(); }
  });
  function commitSeek() {
    seekRaf = 0;
    if (queuedScrub === null || !video.duration || video.seeking) return;
    const requested = queuedScrub; queuedScrub = null;
    video.currentTime = Math.min(video.duration - .001, requested * video.duration);
  }
  scrubber.addEventListener('pointerdown', () => { dragging = true; });
  const finishDrag = () => { dragging = false; commitSeek(); };
  scrubber.addEventListener('pointerup', finishDrag);
  scrubber.addEventListener('pointercancel', finishDrag);
  scrubber.addEventListener('blur', finishDrag);
  scrubber.addEventListener('input', () => {
    section.dispatchEvent(new CustomEvent('cio:handoff-skip',{detail:{keepLayout:true}}));
    queuedScrub = Number(scrubber.value) / 100;
    manualPause = true; started = true; video.pause();
    if (!seekRaf) seekRaf = requestAnimationFrame(commitSeek);
  });
  const nearObserver = new IntersectionObserver(entries => {
    near = entries[0].isIntersecting; if (near) load();
  }, { rootMargin: '350px 0px' });
  const activeObserver = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .35;
    if (!visible) video.pause();
    else if (!manualPause && !video.ended) { load(); play(); }
  }, { threshold: .35 });
  const boot = () => { nearObserver.observe(section); activeObserver.observe(section.querySelector('.cinematic-art')); };
  if (document.readyState === 'complete') boot(); else window.addEventListener('load', boot, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause(); else if (visible && !manualPause && !video.ended) play();
  });
  window.addEventListener('pagehide', () => video.pause());
  reduced.addEventListener('change', () => { if (limited()) staticView(); else load(); });
  connection?.addEventListener?.('change', () => { if (limited()) staticView(); else load(); });
  mobile.addEventListener('change', () => {
    if (!loaded) return;
    pendingSeek = queuedScrub !== null ? queuedScrub : video.duration ? video.currentTime / video.duration : 0;
    if (video.ended) manualPause = true;
    staticView(); started = false; load();
  });
  section.querySelector('.cinematic-skip').addEventListener('click', event => {
    const next = document.getElementById('afterJourney'); if (!next) return;
    event.preventDefault(); manualPause = true; video.pause(); next.tabIndex = -1;
    next.scrollIntoView({ behavior: 'instant', block: 'start' }); next.focus({ preventScroll: true });
    history.replaceState(null, '', '#afterJourney');
  });
})();
