const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync(require('node:path').join(__dirname, '../static/js/manufacturing-film.js'), 'utf8');

function harness({ reduced = false, fail = false, manual = false, intersect = true, saveData = false } = {}) {
    const events = {}, media = {}, requested = [];
    const downloads = [], timers = new Map();
    let timerId = 0;
    let top = 0;
    const element = () => {
        const classes = new Set(), props = new Map(), attrs = new Map();
        return { dataset: {}, textContent: '', hidden: false,
            classList: { add: (...xs) => xs.forEach(x => classes.add(x)), remove: (...xs) => xs.forEach(x => classes.delete(x)), contains: x => classes.has(x), toggle: (x, on) => on ? classes.add(x) : classes.delete(x) },
            style: { setProperty: (k,v) => props.set(k,String(v)), removeProperty: k => props.delete(k), getPropertyValue: k => props.get(k) },
            setAttribute: (k,v) => attrs.set(k,v), removeAttribute: k => attrs.delete(k),
            addEventListener: (k,cb) => { events[k] = cb; },
            scrollIntoView() { this.scrolled = true; }, focus() { this.focused = true; }
        };
    };
    const ids = Object.fromEntries(['manufacturingJourney','journeyCanvas','journeyTitle','journeyCaption','journeyKicker','journeyLoading','journeyProgress','afterJourney'].map(id => [id, element()]));
    const section = ids.manufacturingJourney, sticky = element(), fallback = element(), skip = element();
    const steps = Array.from({length:5},element);
    sticky.clientWidth = 1280; sticky.clientHeight = 800; section.offsetHeight = 6240;
    section.getBoundingClientRect = () => ({top, bottom:top+6240});
    section.querySelector = s => ({'.journey-sticky':sticky,'.journey-fallback':fallback,'.journey-skip':skip}[s]);
    section.querySelectorAll = () => steps;
    ids.journeyCanvas.getContext = () => ({setTransform(){},fillRect(){},drawImage(){}});
    const context = {
        document: {getElementById:id=>ids[id]}, navigator:{connection:{saveData}}, history:{replaceState(){}},
        setTimeout:(cb, delay)=>{const id=++timerId;timers.set(id,{cb,delay});return id;},
        clearTimeout:id=>timers.delete(id),
        window: {innerHeight:800,devicePixelRatio:1,addEventListener:(k,cb)=>events[k]=cb,
            matchMedia:q=>media[q] ||= {matches:q.includes('reduced-motion')&&reduced,addEventListener(k,cb){this.change=cb;}}},
        requestAnimationFrame:cb=>{queueMicrotask(cb);return 1;},
        IntersectionObserver:class {constructor(cb){this.cb=cb;} observe(){if(intersect)queueMicrotask(()=>this.cb([{isIntersecting:true}]));} disconnect(){}},
        Image:class {naturalWidth=1280;naturalHeight=800;decode(){return Promise.resolve();} set src(value){
            this.url=value;if(!value)return;requested.push(value);downloads.push(this);
            if(!manual)queueMicrotask(()=>fail?this.onerror?.():this.onload?.());
        }}
    };
    vm.runInNewContext(source,context);
    const flush = () => new Promise(resolve=>setImmediate(resolve));
    return {ids,section,requested,downloads,media,events,flush,
        tick(delay){for(const [id,timer] of [...timers])if(timer.delay<=delay){timers.delete(id);timer.cb();}},
        async complete(frame){const image=downloads.findLast(img=>img.url.includes(`frame-${String(frame).padStart(4,'0')}.`));await image?.onload?.();await flush();},
        async seek(frame){top=-(frame-1)/279*(6240-800);events.scroll();await flush();}, skip(){events.click({preventDefault(){}});} };
}

test('packaging completes before the fade; centred end card holds and reverses', async () => {
    const h=harness();await h.flush();
    await h.seek(240);
    assert.equal(h.ids.journeyCanvas.dataset.frame,'240');
    assert.equal(h.section.style.getPropertyValue('--end-opacity'),'0');
    assert.equal(h.section.classList.contains('is-final'),false);
    await h.seek(250);
    assert.equal(h.section.style.getPropertyValue('--end-opacity'),'0.5');
    await h.seek(270);
    assert.equal(h.section.style.getPropertyValue('--end-opacity'),'1');
    assert.equal(h.section.style.getPropertyValue('--copy-opacity'),'1');
    assert.equal(h.section.classList.contains('is-final'),true);
    assert.equal(h.ids.journeyTitle.textContent,'Your next part starts here.');
    assert.equal(h.ids.journeyCaption.textContent,'Upload your drawing. Get an instant quote.');
    assert.ok(h.requested.every(url=>!url.includes('0241')));
    await h.seek(179);
    assert.equal(h.section.style.getPropertyValue('--end-opacity'),'0');
    assert.equal(h.section.classList.contains('is-final'),false);
    assert.equal(h.ids.journeyTitle.textContent,'A finish you can feel.');
    await h.seek(99);
    assert.equal(h.ids.journeyTitle.textContent,'Cut to your design.');
});

test('reduced motion uses a visible still, no frame downloads, and a quote action', async () => {
    const h=harness({reduced:true});await h.flush();
    assert.equal(h.section.classList.contains('is-static'),true);
    assert.equal(h.section.classList.contains('is-final'),false);
    assert.equal(h.requested.length,0);
    assert.equal(h.ids.journeyTitle.textContent,'Your drawing. Made real.');
});

test('skip reaches the next section and unavailable images fall back safely',async()=>{
    const h=harness({fail:true});await h.flush();
    assert.equal(h.section.classList.contains('is-static'),true);
    h.skip();assert.equal(h.ids.afterJourney.scrolled,true);assert.equal(h.ids.afterJourney.focused,true);
});

test('opening frames warm early with only two low-priority downloads',async()=>{
    const h=harness({manual:true,intersect:false});await h.flush();
    assert.equal(h.requested.length,0);h.tick(150);
    assert.equal(h.requested.length,2);
    assert.ok(h.downloads.every(img=>img.fetchPriority==='low'));
    assert.ok(h.requested.every(url=>url.includes('.webp')));
});

test('fast jumps cancel obsolete requests and immediately request the new target',async()=>{
    const h=harness({manual:true});await h.flush();
    const old=[...h.downloads];
    await h.seek(180);
    assert.ok(old.every(img=>img.url===''));
    assert.ok(h.downloads.some(img=>img.url.includes('0180.webp')&&img.fetchPriority==='high'));
    assert.equal(h.downloads.filter(img=>img.url).length,6);
    await h.complete(180);
    assert.equal(h.ids.journeyCanvas.dataset.frame,'180');
});

test('brief misses do not flash loading; sustained waits clear when the frame arrives',async()=>{
    const h=harness({manual:true});await h.flush();
    assert.equal(h.ids.journeyLoading.hidden,true);
    h.tick(400);assert.equal(h.ids.journeyLoading.hidden,true);
    h.tick(450);assert.equal(h.ids.journeyLoading.hidden,false);
    await h.complete(1);assert.equal(h.ids.journeyLoading.hidden,true);
    await h.seek(120);h.tick(450);assert.equal(h.ids.journeyLoading.hidden,false);
    await h.complete(120);assert.equal(h.ids.journeyLoading.hidden,true);
});

test('reverse scrolling prioritises the preceding frames',async()=>{
    const h=harness({manual:true});await h.flush();await h.seek(180);await h.seek(90);
    const active=h.downloads.filter(img=>img.url).map(img=>img.url);
    assert.ok(active[0].includes('0090.webp'));
    assert.ok(active[1].includes('0089.webp'));
});

test('end card does not wait for downloads or display a buffering message',async()=>{
    const h=harness({manual:true});await h.flush();await h.seek(270);h.tick(450);
    assert.equal(h.section.style.getPropertyValue('--end-opacity'),'1');
    assert.equal(h.ids.journeyLoading.hidden,true);
    await h.complete(240);
    assert.equal(h.ids.journeyTitle.textContent,'Your next part starts here.');
});

test('data saver skips prefetch and switching to reduced motion cancels pending frames',async()=>{
    const h=harness({saveData:true});await h.flush();h.tick(500);
    assert.equal(h.requested.length,0);
    const active=harness({manual:true});await active.flush();
    const reduced=active.media['(prefers-reduced-motion: reduce)'];
    reduced.matches=true;reduced.change();active.tick(500);
    assert.ok(active.downloads.every(img=>img.url===''));
    assert.equal(active.section.classList.contains('is-static'),true);
});

test('continuous forward travel requests each frame only once',async()=>{
    const h=harness();await h.flush();
    for(let frame=1;frame<=240;frame++)await h.seek(frame);
    assert.equal(h.requested.length,240);
    assert.equal(new Set(h.requested).size,240);
});

test('a breakpoint change cancels the old variant and a restored page resumes',async()=>{
    const h=harness({manual:true});await h.flush();
    const old=[...h.downloads];
    const mobile=h.media['(max-width: 680px)'];mobile.matches=true;mobile.change();await h.flush();
    assert.ok(old.every(img=>img.url===''));
    assert.ok(h.downloads.filter(img=>img.url).every(img=>img.url.includes('/mobile/')));
    h.events.pagehide();assert.ok(h.downloads.every(img=>img.url===''));
    h.events.pageshow();await h.flush();await h.complete(1);
    assert.equal(h.ids.journeyCanvas.dataset.frame,'1');
});
