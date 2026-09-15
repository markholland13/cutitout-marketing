/* Catch one downward gesture at the quote card. Never lock the page or steal focus. */
((root, factory) => {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.createJourneyEndStop = factory;
})(typeof window === 'object' ? window : globalThis, function createJourneyEndStop({section, sticky, onHold, win = window}) {
  let previous = win.scrollY, consumed = false, held = false, disabled = false, engaged = false;
  let lastWheel = -Infinity, heldAt = 0, timer = 0;
  const listeners = [];
  const now = () => win.performance.now();
  const bounds = () => {
    const start = section.getBoundingClientRect().top + win.scrollY;
    return {start, stop:start + Math.max(1, section.offsetHeight - sticky.clientHeight) * 269 / 279};
  };
  const listen = (type, fn, options) => { win.addEventListener(type, fn, options); listeners.push([type, fn, options]); };
  const release = () => {
    held = false;
    win.clearTimeout(timer);
    section.classList.remove('is-end-held');
  };
  const skip = () => { consumed = true; release(); };
  const hold = stop => {
    consumed = true; held = true; heldAt = now();
    section.classList.add('is-end-held');
    previous = stop;
    win.scrollTo({top:stop, behavior:'instant'});
    onHold();
    // Safety release: even a continuous wheel/key stream cannot trap someone here.
    timer = win.setTimeout(release, 1800);
  };
  const scroll = () => {
    if (disabled) return;
    // Browser history restoration and anchor navigation are not scroll gestures.
    if (!engaged) { previous = win.scrollY; return; }
    const y = win.scrollY, {start, stop} = bounds();
    if (held) {
      if (y < stop - 2) release(); // Backward scrolling always works.
      else if (y > stop + 1) { win.scrollTo({top:stop, behavior:'instant'}); return; }
    }
    if (!consumed && y > previous && previous < stop && y >= stop) hold(stop);
    else previous = y;
    // Re-arm only after leaving above the whole sequence, not on small reversals.
    if (y < start - win.innerHeight) consumed = false;
  };
  listen('scroll', scroll, {passive:true});
  listen('wheel', event => {
    if (disabled || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (!engaged) { engaged = true; previous = win.scrollY; }
    const time = now(), gap = time - lastWheel;
    lastWheel = time;
    if (held) {
      if (event.deltaY < 0 || (gap > 220 && time - heldAt > 300)) { release(); return; }
      if (event.cancelable) event.preventDefault();
      return;
    }
    if (consumed || event.deltaY <= 0) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? win.innerHeight : 1);
    const {stop} = bounds();
    if (win.scrollY < stop && win.scrollY + delta >= stop) {
      if (event.cancelable) event.preventDefault();
      hold(stop);
    }
  }, {passive:false});
  listen('touchstart', () => { engaged = true; previous = win.scrollY; if (held) release(); }, {passive:true});
  listen('keydown', event => {
    if (event.key === 'Tab' || event.key === 'Escape' || event.key === 'End' || event.key === 'Home') { skip(); return; }
    if (['ArrowDown','PageDown',' ','ArrowUp','PageUp'].includes(event.key)) {
      engaged = true;
      if (!held) { previous = win.scrollY; return; }
      if (!event.repeat || event.key === 'ArrowUp' || event.key === 'PageUp') release();
      else if (event.cancelable) event.preventDefault();
    }
  });
  // Explicit navigation and scrollbar dragging take precedence over the pause.
  listen('click', event => { if (held && event.target.closest?.('a')) skip(); });
  listen('pointerdown', event => {
    if (event.clientX >= win.document.documentElement.clientWidth) skip();
  });
  listen('hashchange', () => { if (held) skip(); engaged = false; previous = win.scrollY; });
  listen('resize', () => { release(); previous = win.scrollY; });
  return {
    get held() { return held; },
    skip,
    destroy() { disabled = true; release(); listeners.forEach(args => win.removeEventListener(...args)); }
  };
});
