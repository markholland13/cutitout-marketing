/* Muted background footage; respect user choice, reduced motion and data saving. */
(() => {
  const video = document.getElementById('workshopVideo');
  const toggle = document.getElementById('workshopVideoToggle');
  if (!video || !toggle) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let wantsPlayback = !reduced.matches && !navigator.connection?.saveData;
  let visible = true;
  toggle.hidden = false;
  const label = () => { toggle.textContent = video.paused ? 'Play workshop video' : 'Pause workshop video'; };
  const sync = () => {
    if (!wantsPlayback || !visible || document.hidden) { video.pause(); return; }
    video.muted = true;
    const playing = video.play();
    if (playing?.catch) playing.catch(label);
  };
  toggle.addEventListener('click', () => { wantsPlayback = video.paused; sync(); });
  video.addEventListener('play', label);
  video.addEventListener('pause', label);
  video.addEventListener('error', () => { toggle.hidden = true; });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      sync();
    }, {threshold:0.05}).observe(video);
  } else sync();
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', () => { if (reduced.matches) { wantsPlayback = false; sync(); } });
  label();
})();
