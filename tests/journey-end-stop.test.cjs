const {test} = require('node:test');
const assert = require('node:assert/strict');
const create = require('../static/js/journey-end-stop.js');
function harness() {
  const events = {}, classes = new Set();
  let time = 0, timeout, shown = 0;
  const win = {scrollY:0, innerHeight:800, performance:{now:()=>time}, document:{documentElement:{clientWidth:1200}},
    addEventListener:(type, fn)=>events[type]=fn, removeEventListener:type=>delete events[type],
    setTimeout:fn=>{timeout=fn;return 1;}, clearTimeout:()=>{timeout=null;}, scrollTo:({top})=>{win.scrollY=top;}};
  const section = {offsetHeight:6240, getBoundingClientRect:()=>({top:1000-win.scrollY}),
    classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}};
  const control = create({section,sticky:{clientHeight:800},win,onHold:()=>shown++});
  events.touchstart(); // Simulate a user's scroll session, not history restoration.
  const stop=1000+5440*269/279;
  const wheel = (deltaY, delay=16, extra={}) => {
    time+=delay;let prevented=false;
    events.wheel({deltaY,deltaX:0,deltaMode:0,cancelable:true,preventDefault:()=>prevented=true,...extra});
    return prevented;
  };
  const scroll = y => {win.scrollY=y;events.scroll();};
  return {win,events,control,stop,wheel,scroll,shown:()=>shown,expire:()=>timeout?.()};
}
test('fast wheel catches the full quote panel, absorbs momentum, and releases on fresh gesture',()=>{
  const h=harness();h.scroll(h.stop-30);
  assert.equal(h.wheel(900),true);assert.equal(h.control.held,true);
  assert.equal(h.win.scrollY,h.stop);assert.equal(h.shown(),1);
  assert.equal(h.wheel(120),true);
  assert.equal(h.wheel(150,400),false);assert.equal(h.control.held,false);
  h.scroll(h.stop+700);assert.equal(h.shown(),1);
});
test('touch momentum and large scroll jumps cannot skip the card; next touch releases',()=>{
  const h=harness();h.scroll(h.stop+1500);assert.equal(h.win.scrollY,h.stop);
  h.scroll(h.stop+70);assert.equal(h.win.scrollY,h.stop);
  h.events.touchstart();assert.equal(h.control.held,false);
  h.scroll(h.stop+500);assert.equal(h.win.scrollY,h.stop+500);
});
test('upward input, keyboard escape, timeout and explicit skip always release',()=>{
  for (const escape of [h=>h.wheel(-50),h=>h.events.keydown({key:'Escape'}),h=>h.expire(),h=>h.control.skip()]) {
    const h=harness();h.scroll(h.stop+10);escape(h);assert.equal(h.control.held,false);
  }
});
test('does not recatch small reversals; re-arms after going back above the sequence',()=>{
  const h=harness();h.scroll(h.stop+20);h.control.skip();
  h.scroll(h.stop-100);h.scroll(h.stop+100);assert.equal(h.shown(),1);
  h.scroll(0);h.scroll(h.stop+100);assert.equal(h.shown(),2);
});
test('resize releases and reduced-motion teardown removes all input handlers',()=>{
  const h=harness();h.scroll(h.stop+10);h.events.resize();assert.equal(h.control.held,false);
  h.control.destroy();assert.deepEqual(Object.keys(h.events),[]);
});
test('navigation to journey does not consume the end stop and pinch zoom is not blocked',()=>{
  const h=harness();h.events.click({target:{closest:()=>({})}});h.events.hashchange();
  h.scroll(h.stop-5);assert.equal(h.wheel(100,16,{ctrlKey:true}),false);
  assert.equal(h.wheel(100),true);
});
test('history restoration without fresh input does not pull the user back to the film',()=>{
  const h=harness();h.events.hashchange();h.scroll(h.stop+1500);
  assert.equal(h.shown(),0);assert.equal(h.win.scrollY,h.stop+1500);
});
