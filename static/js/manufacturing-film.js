(() => {
    'use strict';
    const section = document.getElementById('manufacturingJourney');
    if (!section) return;
    const canvas = document.getElementById('journeyCanvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    const title = document.getElementById('journeyTitle');
    const caption = document.getElementById('journeyCaption');
    const kicker = document.getElementById('journeyKicker');
    const loading = document.getElementById('journeyLoading');
    const progressBar = document.getElementById('journeyProgress');
    const steps = [...section.querySelectorAll('.journey-step')];
    const sticky = section.querySelector('.journey-sticky');
    const fallback = section.querySelector('.journey-fallback');
    let endStop = null;
    const continueJourney = event => {
        const next = document.getElementById('afterJourney');
        if (!next) return;
        event.preventDefault();
        endStop?.skip();
        next.tabIndex = -1;
        next.scrollIntoView({ behavior: 'instant', block: 'start' });
        next.focus({ preventScroll: true });
        history.replaceState(null, '', '#afterJourney');
    };
    section.querySelector('.journey-skip').addEventListener('click', continueJourney);
    section.querySelector('.journey-continue')?.addEventListener('click', continueJourney);
    const stages = [
        { frame: 1, step: 0, kicker: '01 / UPLOAD YOUR DRAWING', title: 'Your design. Our expertise.', caption: 'Upload your DXF for an instant laser cutting quote.' },
        { frame: 40, step: 1, kicker: '02 / FIBRE LASER CUTTING', title: 'Precision, from the start.', caption: 'Your design guides every cut.' },
        { frame: 55, step: 1, kicker: '02 / FIBRE LASER CUTTING', title: 'Cut to your design.', caption: 'Clean profiles. Intricate details. Precision in every part.' },
        { frame: 140, step: 2, kicker: '03 / YOUR PART', title: 'Designed by you. Made by us.', caption: 'From sheet metal to a component for your next project.' },
        { frame: 161, step: 3, kicker: '04 / SURFACE & EDGE FINISHING', title: 'A finish you can feel.', caption: 'Abrasive finishing refines the surface and softens cut edges.' },
        { frame: 193, step: 4, kicker: '05 / PACKED FOR DISPATCH', title: 'Care, all the way to your door.', caption: 'Protective packaging keeps your parts ready for what’s next.' },
        { frame: 252, step: 4, kicker: 'FROM DRAWING TO DELIVERY', title: 'Your next part starts here.', caption: 'Upload your drawing. Get an instant quote.' }
    ];
    let activeStage = -1;
    const updateCopy = frame => {
        const index = stages.findLastIndex(stage => frame >= stage.frame);
        if (index === activeStage) return;
        activeStage = index;
        const stage = stages[Math.max(index, 0)];
        title.textContent = stage.title;
        caption.textContent = stage.caption;
        kicker.textContent = stage.kicker;
        steps.forEach((step, i) => {
            step.classList.toggle('is-active', i === stage.step);
            if (i === stage.step) step.setAttribute('aria-current', 'step');
            else step.removeAttribute('aria-current');
        });
        section.classList.toggle('is-final', frame >= 252);
        section.classList.toggle('is-upload', frame < 40);
        section.classList.toggle('is-cutting', frame >= 51 && frame < 140);
    };
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let staticMode = false;
    let stopLoading = () => {};
    const staticView = () => {
        endStop?.destroy();
        stopLoading();
        staticMode = true;
        section.classList.add('is-static');
        section.classList.remove('is-ready', 'is-buffering');
        fallback.removeAttribute('aria-hidden');
        loading.hidden = true;
        updateCopy(280);
        section.classList.remove('is-final');
        section.style.removeProperty('--end-opacity');
        section.style.removeProperty('--copy-opacity');
        section.style.removeProperty('--ui-opacity');
        kicker.textContent = 'FROM DRAWING TO DISPATCH';
        title.textContent = 'Your drawing. Made real.';
        caption.textContent = 'We cut your part from sheet metal, finish the edges and pack it for dispatch.';
    };
    if (!ctx || reduced.matches || navigator.connection?.saveData) {
        staticView();
        return;
    }
    const showEndCard = () => {
        updateCopy(270);
        section.style.setProperty('--end-opacity', 1);
        section.style.setProperty('--copy-opacity', 1);
        section.style.setProperty('--ui-opacity', 0);
        loading.style.opacity = '0';
    };
    endStop = window.createJourneyEndStop?.({section, sticky, onHold:showEndCard});
    const mobile = window.matchMedia('(max-width: 680px)');
    let variant = mobile.matches ? 'mobile' : 'desktop';
    const cache = new Map();
    let wanted = new Set();
    const pending = new Map();
    const failures = new Map();
    let queue = [], inflight = 0, targetFrame = 1, timelineFrame = 1, paintedFrame = 0, started = false, raf = 0, generation = 0;
    let direction = 1, loadingTimer = 0, warmTimer = 0, lastPaint = '';
    // Bound decoded memory, not just compressed download size (about 156 MB
    // desktop / 63 MB mobile; smaller still on memory-constrained devices).
    const cacheLimit = () => navigator.deviceMemory <= 4 ? 22 : mobile.matches ? 32 : 40;
    loading.hidden = true;
    const setBuffering = waiting => {
        if (!waiting || staticMode || timelineFrame >= 260 || endStop?.held) {
            clearTimeout(loadingTimer); loadingTimer = 0;
            loading.hidden = true;
            loading.setAttribute('aria-hidden', 'true');
            section.classList.remove('is-buffering');
        } else if (!loadingTimer) {
            loadingTimer = setTimeout(() => {
                if (staticMode || timelineFrame >= 260 || cache.has(targetFrame)) return;
                loading.hidden = false;
                loading.style.opacity = '';
                loading.textContent = 'Loading the next moment…';
                loading.setAttribute('aria-hidden', 'false');
                section.classList.add('is-buffering');
            }, 450);
        }
    };
    function cancelRequests(keep = new Set()) {
        for (const [frame, request] of pending) {
            if (!keep.has(frame)) request.cancel();
        }
    }
    stopLoading = () => {
        clearTimeout(warmTimer);
        setBuffering(false);
        queue = [];
        cancelRequests();
        cache.clear();
    };
    const sceneCuts = [40, 51, 161, 193];
    const url = frame => `/static/img/home/journey-film/${variant}/frame-${String(frame).padStart(4, '0')}.webp?v=20260915-optimized`;
    function draw(frame) {
        const img = cache.get(frame);
        if (!img) return false;
        const w = sticky.clientWidth, h = sticky.clientHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        if (canvas.width !== Math.round(w*dpr) || canvas.height !== Math.round(h*dpr)) {
            canvas.width = Math.round(w*dpr); canvas.height = Math.round(h*dpr);
        }
        const cut = sceneCuts.find(cut => frame>=cut && frame<cut+3);
        const previous = cut ? cache.get(cut-1) : null;
        const paintKey = `${generation}:${frame}:${w}:${h}:${dpr}:${!!previous}`;
        if (lastPaint !== paintKey) {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.fillStyle = '#22292f'; ctx.fillRect(0, 0, w, h);
            // Separate portrait renders keep the subject in frame on small screens.
            const paint = image => {
                const scale = Math.max(w/image.naturalWidth, h/image.naturalHeight);
                const iw = image.naturalWidth*scale, ih = image.naturalHeight*scale;
                ctx.drawImage(image, (w-iw)/2, (h-ih)/2, iw, ih);
            };
            if (previous) {
                paint(previous);
                ctx.globalAlpha = Math.min(1, (frame-cut+1)/3);
            }
            paint(img);
            ctx.globalAlpha = 1;
            lastPaint = paintKey;
        }
        paintedFrame = frame;
        canvas.dataset.frame = String(frame);
        section.classList.add('is-ready');
        fallback.setAttribute('aria-hidden', 'true');
        const buffering = frame !== targetFrame && Math.abs(frame-targetFrame)>8;
        setBuffering(buffering);
        const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t*t*(3-2*t); };
        const storyFrame = endStop?.held ? 270 : frame===240 ? timelineFrame : frame;
        section.style.setProperty('--end-opacity', smooth((storyFrame-244)/12));
        section.style.setProperty('--ui-opacity', 1-smooth((storyFrame-244)/6));
        section.style.setProperty('--copy-opacity', storyFrame<252 ? 1-smooth((storyFrame-244)/6) : smooth((storyFrame-252)/8));
        updateCopy(storyFrame);
        return true;
    }
    function prune() {
        if (cache.size <= cacheLimit()) return;
        const distance = frame => Math.abs(frame-targetFrame) * ((frame-targetFrame)*direction < 0 ? 1.5 : 1);
        const farthest = [...cache.keys()].sort((a,b) =>
            Number(wanted.has(a))-Number(wanted.has(b)) || distance(b)-distance(a));
        for (const frame of farthest) {
            if (cache.size <= cacheLimit()) break;
            if (frame !== paintedFrame && frame !== targetFrame) cache.delete(frame);
        }
    }
    function pump() {
        while (!staticMode && inflight < (started ? 6 : 2) && queue.length) {
            const frame = queue.shift();
            if (cache.has(frame) || pending.has(frame) || (failures.get(frame)||0)>=2) continue;
            inflight++;
            const token = generation;
            const img = new Image(); img.decoding = 'async';
            img.fetchPriority = started && frame === targetFrame ? 'high' : 'low';
            let settled = false;
            const finish = () => {
                if (settled) return false;
                settled = true; inflight--;
                pending.delete(frame);
                return true;
            };
            pending.set(frame, {cancel() {
                if (!finish()) return;
                img.onload = img.onerror = null;
                img.src = '';
            }});
            img.onload = async () => {
                try { await img.decode(); } catch (_) { /* onload still supplies a drawable frame */ }
                if (!finish()) return;
                if (token !== generation) { pump(); return; }
                if (staticMode) return;
                cache.set(frame, img);
                if (frame === targetFrame || !paintedFrame || Math.abs(frame-targetFrame) < Math.abs(paintedFrame-targetFrame)) draw(frame);
                if (timelineFrame >= 260 || endStop?.held) showEndCard();
                prune(); pump();
            };
            img.onerror = () => {
                if (!finish()) return;
                if (token !== generation) { pump(); return; }
                if (staticMode) return;
                failures.set(frame, (failures.get(frame)||0)+1);
                if (frame === targetFrame && failures.get(frame)<2) queue.unshift(frame);
                if (frame === targetFrame && failures.get(frame)>=2) {
                    setBuffering(false);
                    section.classList.remove('is-buffering');
                    loading.hidden = false;
                    loading.removeAttribute('aria-hidden');
                    loading.textContent = 'This moment couldn’t load. Keep scrolling to continue.';
                    loading.style.opacity = '1';
                    if (!paintedFrame) staticView();
                }
                pump();
            };
            img.src = url(frame);
        }
    }
    function requestFrames(warm = false) {
        queue = [targetFrame];
        for (const cut of sceneCuts) {
            if (targetFrame>=cut && targetFrame<cut+3) queue.push(cut-1);
        }
        const ahead = warm ? 11 : cacheLimit()-10;
        const behind = warm ? 0 : 6;
        const add = frame => { if (frame >= 1 && frame <= 240) queue.push(frame); };
        for (let offset=1; offset<=ahead; offset++) {
            add(targetFrame+offset*direction);
            if (offset<=behind) add(targetFrame-offset*direction);
        }
        // Fast jumps must not wait behind downloads for an abandoned scene.
        wanted = new Set(queue);
        cancelRequests(wanted);
        pump();
    }
    function update() {
        raf = 0;
        if (!started || staticMode || reduced.matches) return;
        const rect = section.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top > window.innerHeight+1400) {
            setBuffering(false); queue = []; cancelRequests(); return;
        }
        const travel = Math.max(1, section.offsetHeight-sticky.clientHeight);
        const progress = Math.max(0, Math.min(1, -rect.top/travel));
        // Let the sealed, labelled parcel finish before fading to a held end card.
        timelineFrame = 1+Math.round(progress*279);
        if (timelineFrame >= 260) showEndCard();
        const nextFrame = Math.min(240, timelineFrame);
        if (nextFrame !== targetFrame) direction = Math.sign(nextFrame-targetFrame);
        targetFrame = nextFrame;
        canvas.dataset.targetFrame = String(targetFrame);
        progressBar.style.transform = `scaleX(${progress})`;
        if (!draw(targetFrame)) {
            const nearest = [...cache.keys()].sort((a,b)=>Math.abs(a-targetFrame)-Math.abs(b-targetFrame))[0];
            if (nearest !== undefined) draw(nearest);
            if (nearest === undefined) setBuffering(true);
        } else {
            loading.style.opacity = '';
        }
        requestFrames();
        // The quote action remains visible even if the final render is still loading.
        if (timelineFrame >= 260 || endStop?.held) showEndCard();
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    // Small, low-priority opening buffer while the visitor is still at the hero.
    warmTimer = setTimeout(() => { if (!started && !staticMode) requestFrames(true); }, 150);
    const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
            started = true; schedule(); observer.disconnect();
        }
    }, { rootMargin: '1400px' });
    observer.observe(section);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    mobile.addEventListener('change', () => {
        cancelRequests(); setBuffering(false);
        variant = mobile.matches ? 'mobile' : 'desktop'; generation++;
        cache.clear(); pending.clear(); failures.clear(); queue=[]; paintedFrame=0; schedule();
    });
    window.addEventListener('pagehide', stopLoading);
    window.addEventListener('pageshow', schedule);
    reduced.addEventListener('change', () => { if (reduced.matches) staticView(); });
})();
