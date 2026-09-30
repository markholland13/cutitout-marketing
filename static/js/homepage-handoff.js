/* Native scrolling carries the exact hero plane into the film's CAD camera.
 * Geometry is exported from the existing Blender master, not traced by eye.
 * The live video frame is captured once; only transforms change while scrolling.
 */
(() => {
  'use strict';
  const section = document.getElementById('manufacturingJourney');
  const hero = document.querySelector('.hero-object');
  const stage = document.querySelector('.part-stage');
  const part = document.getElementById('partMotion');
  const film = document.getElementById('journeyVideo');
  const shell = section?.querySelector('.film-shell');
  if (!section || !hero || !part || !shell) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width:680px)');
  const connection = navigator.connection;
  const limited = () => reduced.matches || connection?.saveData || ['2g','slow-2g'].includes(connection?.effectiveType) || navigator.deviceMemory <= 2;
  if (limited()) return;
  const clamp = x => Math.max(0, Math.min(1, x));
  const ease = x => { x = clamp(x); return x*x*(3-2*x); };
  const lerp = (a,b,t) => a+(b-a)*t;
  let data, plates = {}, ready = false, disabled = false, active = false, completed = false;
  let captured = false, sourceQuad, startQuad, start = 0, end = 1, raf = 0, lastTime = -1;
  let captureTime = 0, width = innerWidth;
  let caught=false, catching=false, caughtAt=0, continued=0, catchTimer=0, lastInput=-Infinity, previousY=scrollY, touchY=null;
  const overlay = document.createElement('div');
  overlay.className = 'part-handoff'; overlay.hidden = true; overlay.setAttribute('aria-hidden','true');
  const plate = document.createElement('img'); plate.className = 'handoff-plate'; plate.alt = '';
  const texture = document.createElement('canvas'); texture.className = 'handoff-metal';
  const echo = document.createElement('canvas'); echo.className = 'handoff-metal';
  const wire = document.createElement('canvas'); wire.classList.add('handoff-wire');
  overlay.append(plate, echo, texture, wire); document.body.append(overlay);
  const heroSection=hero.closest('.hero');
  const heroNext=hero.nextSibling;
  const flow=document.createElement('div'); flow.className='visual-flow';
  const pin=document.createElement('div'); pin.className='visual-pin';
  heroSection.after(flow); flow.append(pin); pin.append(hero,section);
  section.dataset.handoffHold = 'true';
  document.body.classList.add('handoff-enabled');

  function command(hold, time) {
    section.dispatchEvent(new CustomEvent('cio:handoff',{detail:{hold,time}}));
  }
  // Solve a projective transform for four point pairs, then emit a CSS matrix3d.
  function transform(from, to) {
    const rows = [];
    from.forEach(([x,y],i) => {
      const [u,v] = to[i];
      rows.push([x,y,1,0,0,0,-u*x,-u*y,u], [0,0,0,x,y,1,-v*x,-v*y,v]);
    });
    for (let c=0;c<8;c++) {
      let pivot=c;
      for(let r=c+1;r<8;r++) if(Math.abs(rows[r][c])>Math.abs(rows[pivot][c])) pivot=r;
      [rows[c],rows[pivot]]=[rows[pivot],rows[c]];
      const divisor=rows[c][c];
      if(Math.abs(divisor)<1e-10) return '';
      for(let k=c;k<9;k++) rows[c][k]/=divisor;
      for(let r=0;r<8;r++) if(r!==c) {
        const factor=rows[r][c];
        for(let k=c;k<9;k++) rows[r][k]-=factor*rows[c][k];
      }
    }
    const [a,b,c,d,e,f,g,h]=rows.map(r=>r[8]);
    return `matrix3d(${a},${d},0,${g},${b},${e},0,${h},0,0,1,0,${c},${f},0,1)`;
  }
  function measure() {
    const inset=document.querySelector('.cio-header').offsetHeight;
    const distance=Math.round(innerHeight*.62);
    // A short native scroll runway holds the landed scene. Continued scrolling
    // consumes it and releases the pin; wheel, touch and keyboard are never trapped.
    const hold=Math.round(Math.max(260,Math.min(480,innerHeight*.45)));
    flow.style.setProperty('--handoff-distance',`${distance}px`);
    flow.style.setProperty('--handoff-hold',`${hold}px`);
    flow.style.setProperty('--handoff-header',`${inset}px`);
    // The artwork overlaps the copy, but the scroll runway still starts after it.
    const top=scrollY+heroSection.getBoundingClientRect().bottom;
    start=Math.max(0,top-innerHeight*.3);
    end=top-inset+distance;
    end=Math.max(start+240,end);
    const dpr=Math.min(devicePixelRatio||1,2);
    wire.width=Math.round(innerWidth*dpr);wire.height=Math.round(innerHeight*dpr);
    wire.style.width=`${innerWidth}px`;wire.style.height=`${innerHeight}px`;
    wire.getContext('2d').setTransform(dpr,0,0,dpr,0,0);
    section.style.setProperty('--handoff-start',start);
    section.style.setProperty('--handoff-end',end);
    section.style.setProperty('--handoff-release',end+hold);
  }
  function capture() {
    if(part.readyState<2 || part.seeking) return false;
    part.pause(); captureTime=part.currentTime;
    texture.width=part.videoWidth; texture.height=part.videoHeight;
    texture.style.width=`${texture.width}px`; texture.style.height=`${texture.height}px`;
    texture.getContext('2d').drawImage(part,0,0);
    const frame=Math.floor(captureTime*24+1e-4)%192;
    const pose=Math.round((1-Math.cos(frame/192*Math.PI*2))/2*72);
    sourceQuad=data.desktop.hero[pose].map(([x,y])=>[x*texture.width,y*texture.height]);
    // Preserve the lifted outline at capture, but separate it from the metal plane
    // so it dissolves before the metal tilts towards the laptop screen.
    echo.width=texture.width; echo.height=texture.height;
    echo.style.width=`${echo.width}px`; echo.style.height=`${echo.height}px`;
    const context=texture.getContext('2d'), outside=echo.getContext('2d');
    outside.drawImage(texture,0,0);
    const matrixString=transform([[0,0],[600,0],[600,360],[0,360]],sourceQuad);
    const m=new DOMMatrix(matrixString);
    const outline=new Path2D();
    data.profiles.forEach(points=>{
      points.forEach(([x,y],i)=>{
        const point=new DOMPoint(x*600,y*360).matrixTransform(m);
        if(i)outline.lineTo(point.x/point.w,point.y/point.w);else outline.moveTo(point.x/point.w,point.y/point.w);
      });outline.closePath();
    });
    context.globalCompositeOperation='destination-in';context.fillStyle='#fff';context.fill(outline,'evenodd');context.globalCompositeOperation='source-over';
    outside.globalCompositeOperation='destination-out';outside.fill(outline,'evenodd');outside.globalCompositeOperation='source-over';
    const rect=stage.getBoundingClientRect();
    const pinAtStart=Math.max(document.querySelector('.cio-header').offsetHeight,
      scrollY+flow.getBoundingClientRect().top-start);
    const matrix=new DOMMatrix(getComputedStyle(part).transform);
    startQuad=data.desktop.hero[pose].map(([x,y])=>{
      const dx=(x-.5)*rect.width,dy=(y-.5)*rect.height;
      return [rect.left+rect.width/2+matrix.a*dx+matrix.c*dy+matrix.e,
        pinAtStart+(rect.top-pin.getBoundingClientRect().top)+rect.height/2+matrix.b*dx+matrix.d*dy+matrix.f];
    });
    captured=true; return true;
  }
  function returnHero() {
    active=false; captured=false; completed=false; overlay.hidden=true;
    document.body.classList.remove('handoff-active'); hero.removeAttribute('data-handoff');
    section.classList.remove('handoff-film-visible');
    hero.dispatchEvent(new Event('cio:handoff-return'));
  }
  function releaseCatch() {
    catching=false;clearTimeout(catchTimer);document.body.classList.remove('handoff-catching');
  }
  function catchFilm() {
    if(caught || disabled || !ready)return;
    caught=true;catching=true;caughtAt=performance.now();continued=0;
    document.body.classList.add('handoff-catching');
    scrollTo({top:Math.ceil(end),behavior:'instant'});schedule();
    // Never leave someone trapped if their input device stops sending events.
    catchTimer=setTimeout(releaseCatch,1800);
  }
  function scrollIntent(delta,event) {
    if(disabled || !ready || limited() || delta===0)return;
    lastInput=performance.now();
    if(delta<0) {releaseCatch();return;}
    if(catching) {
      const elapsed=performance.now()-caughtAt;
      if(elapsed>120)continued+=delta;
      if(elapsed>=650 && continued>=260) {releaseCatch();return;}
      event.preventDefault();return;
    }
    if(!caught && scrollY<end+80 && scrollY+delta>=end) {
      event.preventDefault();catchFilm();
    }
  }
  const interactive=target=>target instanceof Element && target.closest('input,textarea,select,button,[contenteditable="true"],.cio-header,.parts-track');
  const scrollableControl=target=>target instanceof Element && target.closest('textarea,select,[contenteditable="true"],.cio-nav.is-open,.parts-track');
  addEventListener('wheel',event=>{
    if(event.ctrlKey || Math.abs(event.deltaX)>Math.abs(event.deltaY) || scrollableControl(event.target))return;
    scrollIntent(event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1),event);
  },{passive:false});
  addEventListener('touchstart',event=>{touchY=event.touches.length===1?event.touches[0].clientY:null;},{passive:true});
  addEventListener('touchmove',event=>{
    if(touchY===null || event.touches.length!==1 || scrollableControl(event.target))return;
    const next=event.touches[0].clientY,delta=touchY-next;touchY=next;scrollIntent(delta,event);
  },{passive:false});
  addEventListener('touchend',()=>{touchY=null;},{passive:true});
  addEventListener('keydown',event=>{
    if(event.key==='Escape') {if(catching){releaseCatch();caught=true;}return;}
    if(event.key==='End' || event.key==='Home') {releaseCatch();caught=true;return;}
    if(event.altKey || event.ctrlKey || event.metaKey || interactive(event.target))return;
    if(event.key==='ArrowDown')scrollIntent(80,event);
    if(event.key==='PageDown' || (event.key===' '&&!event.shiftKey))scrollIntent(innerHeight*.85,event);
    if(event.key==='ArrowUp' || event.key==='PageUp' || (event.key===' '&&event.shiftKey))releaseCatch();
  });
  function disable(keepLayout=false) {
    if(disabled)return;
    releaseCatch();
    disabled=true; returnHero(); overlay.remove();
    document.body.classList.remove('handoff-enabled');
    section.classList.remove('handoff-film-visible');
    if(keepLayout===true)flow.classList.add('handoff-bypassed');
    else { heroSection.insertBefore(hero,heroNext);flow.after(section);flow.remove(); }
    command(false);
  }
  function update() {
    raf=0;
    if(disabled || !ready) return;
    if(limited()) { disable(); return; }
    const p=clamp((scrollY-start)/(end-start));
    section.dataset.handoffProgress=p.toFixed(4);
    if(p<=0) {
      caught=false;releaseCatch();
      if(active || captured || completed) { returnHero(); lastTime=-1; command(true,2); }
      return;
    }
    if(p>=.998) {
      overlay.hidden=true; active=false; completed=true;
      document.body.classList.remove('handoff-active');
      hero.dataset.handoff='active'; part.pause();
      section.classList.add('handoff-film-visible');
      if(section.dataset.handoffHold==='true') {
        // Release only after the last requested frame has reached the decoder.
        if(film.readyState>=2 && !film.seeking && Math.abs(film.currentTime-2.8)<.08) command(false);
        else if(!film.seeking) command(true,2.8);
      }
      return;
    }
    if(!captured && !capture()) return;
    if(completed) { completed=false; lastTime=-1; }
    active=true; hero.dataset.handoff='active'; part.pause();
    document.body.classList.add('handoff-active');
    section.dataset.handoffHold='true';
    const variant=mobile.matches?'mobile':'desktop';
    const rect=shell.getBoundingClientRect(), [fw,fh]=data[variant].dimensions;
    const scale=Math.min(rect.width/fw,rect.height/fh);
    const box={x:rect.left+(rect.width-fw*scale)/2,y:rect.top+(rect.height-fh*scale)/2,w:fw*scale,h:fh*scale};
    const destination=data[variant].target.map(([x,y])=>[box.x+x*box.w,box.y+y*box.h]);
    const travel=ease(p/.64);
    const quad=startQuad.map(([x,y],i)=>[lerp(x,destination[i][0],travel),lerp(y,destination[i][1],travel)]);
    texture.style.transform=transform(sourceQuad,quad);
    echo.style.transform=texture.style.transform;
    echo.style.opacity=String(1-ease(p/.16));
    texture.style.opacity=String(1-ease((p-.08)/.42));
    const projection=new DOMMatrix(transform([[0,0],[600,0],[600,360],[0,360]],quad));
    const ink=wire.getContext('2d');ink.clearRect(0,0,innerWidth,innerHeight);ink.beginPath();
    data.profiles.forEach(points=>{
      points.forEach(([px,py],i)=>{
        const x=px*600,y=py*360,w=projection.m14*x+projection.m24*y+projection.m44;
        const sx=(projection.m11*x+projection.m21*y+projection.m41)/w,sy=(projection.m12*x+projection.m22*y+projection.m42)/w;
        if(i)ink.lineTo(sx,sy);else ink.moveTo(sx,sy);
      });ink.closePath();
    });
    ink.strokeStyle='#91cbda';ink.lineJoin='round';ink.lineWidth=Math.max(.85,Math.hypot(quad[1][0]-quad[0][0],quad[1][1]-quad[0][1])*.0023);ink.stroke();
    wire.style.opacity=String(ease((p-.1)/.25));
    if(plate.src!==plates[variant].src)plate.src=plates[variant].src;
    Object.assign(plate.style,{left:`${box.x}px`,top:`${box.y}px`,width:`${box.w}px`,height:`${box.h}px`,opacity:String(ease((p-.25)/.37))});
    overlay.hidden=false; overlay.style.opacity=String(1-ease((p-.64)/.09));
    section.classList.toggle('handoff-film-visible',p>=.64);
    hero.style.setProperty('--handoff-controls',String(1-ease(p/.15)));
    const time=2+ease((p-.73)/.27)*.8;
    if(Math.abs(time-lastTime)>.015 || section.dataset.handoffHold!=='true') { lastTime=time; command(true,time); }
    else if(!film.paused) command(true);
  }
  function schedule() { if(!raf && !disabled) raf=requestAnimationFrame(update); }
  addEventListener('scroll',()=>{
    // Catch touch inertia or a browser's smoothed wheel event at the boundary too.
    if(!caught && ready && !disabled && performance.now()-lastInput<1000 && previousY<end && scrollY>=end)catchFilm();
    previousY=scrollY;schedule();
  },{passive:true});
  addEventListener('resize',()=>{
    // A resized plane cannot reuse a snapshot measured at the old viewport width.
    if(width!==innerWidth) { width=innerWidth; captured=false; }
    measure(); schedule();
  },{passive:true});
  film.addEventListener('seeked',schedule);
  film.addEventListener('loadeddata',()=>{lastTime=-1;schedule();});
  part.addEventListener('loadeddata',schedule);
  part.addEventListener('seeked',schedule);
  part.addEventListener('error',disable,{once:true});
  film.addEventListener('error',disable,{once:true});
  section.addEventListener('cio:handoff-skip',event=>disable(event.detail?.keepLayout),{once:true});
  section.querySelector('.cinematic-skip').addEventListener('click',()=>{caught=true;releaseCatch();});
  document.querySelectorAll('a[href="#manufacturingJourney"]').forEach(link=>link.addEventListener('click',event=>{
    if(disabled || !ready)return;
    caught=true;releaseCatch();
    event.preventDefault();scrollTo({top:Math.ceil(end),behavior:'smooth'});
    history.replaceState(null,'','#manufacturingJourney');
  }));
  reduced.addEventListener('change',()=>{if(limited())disable();});
  connection?.addEventListener?.('change',()=>{if(limited())disable();});
  addEventListener('pageshow',()=>{measure();schedule();});
  const loadPlate=variant=>new Promise((resolve,reject)=>{
    const image=new Image(); image.onload=()=>{plates[variant]=image;resolve();}; image.onerror=reject;
    image.src=`/static/home/handoff/cad-empty-${variant}.webp`;
  });
  const bootTimeout=setTimeout(()=>disable(),10000);
  Promise.all([
    fetch('/static/home/handoff/geometry.json',typeof AbortSignal.timeout==='function'?{signal:AbortSignal.timeout(10000)}:{}).then(r=>{if(!r.ok)throw Error('Geometry unavailable');return r.json();}).then(value=>{data=value;}),
    loadPlate('desktop'),loadPlate('mobile'),document.fonts.ready
  ]).then(()=>{
    clearTimeout(bootTimeout);
    if(disabled)return;
    ready=true; measure(); schedule();
  }).catch(()=>{clearTimeout(bootTimeout);disable();});
})();
