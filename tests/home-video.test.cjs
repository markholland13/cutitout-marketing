const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname,'../static/js/home-video.js'),'utf8');
function harness({reduced=false,saveData=false,blocked=false}={}) {
  const actions={}, events={}, docEvents={};let intersection, preference;
  const video={paused:true,muted:false,play(){if(blocked)return Promise.reject(new Error('blocked'));this.paused=false;events.play?.();return Promise.resolve();},pause(){this.paused=true;events.pause?.();},addEventListener:(t,f)=>events[t]=f};
  const toggle={hidden:true,textContent:'',addEventListener:(t,f)=>actions[t]=f};
  const media={matches:reduced,addEventListener:(_,f)=>preference=f};
  const document={hidden:false,getElementById:id=>id==='workshopVideo'?video:toggle,addEventListener:(t,f)=>docEvents[t]=f};
  const Observer=class{constructor(fn){intersection=fn;}observe(){}};
  vm.runInNewContext(source,{document,navigator:{connection:{saveData}},window:{matchMedia:()=>media,IntersectionObserver:Observer},IntersectionObserver:Observer});
  return {video,toggle,click:()=>actions.click(),visible:on=>intersection([{isIntersecting:on}]),hidden:on=>{document.hidden=on;docEvents.visibilitychange();},reduce:()=>{media.matches=true;preference();}};
}
test('video resumes after leaving viewport, while a manual pause stays paused',()=>{
  const h=harness();h.visible(true);assert.equal(h.video.paused,false);assert.equal(h.video.muted,true);
  h.visible(false);assert.equal(h.video.paused,true);h.visible(true);assert.equal(h.video.paused,false);
  h.click();h.visible(false);h.visible(true);assert.equal(h.video.paused,true);
  assert.equal(h.toggle.textContent,'Play workshop video');
});
test('reduced motion and data saving start still; explicit play remains available',()=>{
  for(const settings of [{reduced:true},{saveData:true}]) {
    const h=harness(settings);h.visible(true);assert.equal(h.video.paused,true);h.click();assert.equal(h.video.paused,false);
    h.reduce();assert.equal(h.video.paused,true);
  }
});
test('background tab pauses and resumes playback; rejected autoplay retains a usable play button',async()=>{
  const h=harness();h.visible(true);h.hidden(true);assert.equal(h.video.paused,true);h.hidden(false);assert.equal(h.video.paused,false);
  const b=harness({blocked:true});b.visible(true);await Promise.resolve();assert.equal(b.toggle.hidden,false);assert.equal(b.toggle.textContent,'Play workshop video');
});
