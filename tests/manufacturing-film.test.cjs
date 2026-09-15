const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync(require('node:path').join(__dirname, '../static/js/manufacturing-film.js'), 'utf8');

function harness({ reduced = false, fail = false } = {}) {
    const events = {}, media = {}, requested = [];
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
        document: {getElementById:id=>ids[id]}, navigator:{}, history:{replaceState(){}},
        window: {innerHeight:800,devicePixelRatio:1,addEventListener:(k,cb)=>events[k]=cb,
            matchMedia:q=>media[q] ||= {matches:q.includes('reduced-motion')&&reduced,addEventListener(){}}},
        requestAnimationFrame:cb=>{queueMicrotask(cb);return 1;},
        IntersectionObserver:class {constructor(cb){this.cb=cb;} observe(){queueMicrotask(()=>this.cb([{isIntersecting:true}]));} disconnect(){}},
        Image:class {naturalWidth=1280;naturalHeight=800;decode(){return Promise.resolve();} set src(value){requested.push(value);queueMicrotask(()=>fail?this.onerror():this.onload());}}
    };
    vm.runInNewContext(source,context);
    const flush = () => new Promise(resolve=>setImmediate(resolve));
    return {ids,section,requested,flush, async seek(frame){top=-(frame-1)/279*(6240-800);events.scroll();await flush();}, skip(){events.click({preventDefault(){}});} };
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
