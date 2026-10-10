/*
  Freetown Life: animation module.
  Self-contained. It injects its own CSS for interface motion and exposes window.FreetownFX,
  which app.js calls for world effects (dust, smoke, rain, fireflies, confetti, floating money).
  The game still runs if this file is missing. Everything respects prefers-reduced-motion.
*/
(function(){
'use strict';

var reduce=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ---------- interface motion (CSS) ---------- */
var CSS=[
'@keyframes fxFade{from{opacity:0}to{opacity:1}}',
'@keyframes fxPop{0%{opacity:0;transform:translateY(16px) scale(.92)}100%{opacity:1;transform:none}}',
'@keyframes fxRise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}',
'@keyframes fxSlide{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}',
'@keyframes fxUp{0%{color:#1eb53a;transform:scale(1.14)}100%{transform:none}}',
'@keyframes fxDown{0%{color:#d6403a;transform:scale(1.08)}100%{transform:none}}',
'@keyframes fxBarUp{0%{box-shadow:0 0 0 2px rgba(30,181,58,.95)}100%{box-shadow:0 0 0 0 rgba(30,181,58,0)}}',
'@keyframes fxBarDown{0%{box-shadow:0 0 0 2px rgba(214,64,58,.95)}100%{box-shadow:0 0 0 0 rgba(214,64,58,0)}}',
'@keyframes fxPulse{0%,100%{opacity:1}50%{opacity:.5}}',
'@keyframes fxBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}',
'@keyframes fxTwinkle{0%,100%{opacity:1}50%{opacity:.5}}',
'@keyframes fxCloud{from{transform:translateX(-140px)}to{transform:translateX(110vw)}}',
'@keyframes fxSun{0%,100%{box-shadow:0 0 14px 4px rgba(255,243,176,.5)}50%{box-shadow:0 0 26px 10px rgba(255,243,176,.85)}}',

'.bar i{transition:width .45s ease,background-color .3s}',
'.card,.btn,.person,.fr{transition:transform .12s ease,border-color .12s,background .12s}',
'.card:hover:not(:disabled),.person:hover,.fr:hover{transform:translateY(-1px)}',
'.card:active:not(:disabled),.btn:active:not(:disabled),.person:active,.fr:active{transform:scale(.985)}',
'.tab{transition:background .15s,color .15s}',

'.sky::before{content:"";position:absolute;inset:0;opacity:0;transition:opacity .8s;pointer-events:none;',
'background-image:radial-gradient(1.5px 1.5px at 8% 22%,#fff,transparent),radial-gradient(1.5px 1.5px at 19% 48%,#fff,transparent),radial-gradient(1px 1px at 31% 16%,#fff,transparent),radial-gradient(1.5px 1.5px at 44% 36%,#fff,transparent),radial-gradient(1px 1px at 57% 12%,#fff,transparent),radial-gradient(1.5px 1.5px at 66% 40%,#fff,transparent),radial-gradient(1px 1px at 78% 20%,#fff,transparent),radial-gradient(1.5px 1.5px at 90% 44%,#fff,transparent),radial-gradient(1px 1px at 95% 14%,#fff,transparent)}',
'.sky[data-p="night"]::before{opacity:1}',
'.sky svg{z-index:1}',
'.sky .place{z-index:2}',
'.fx-cloud{position:absolute;left:0;width:84px;height:24px;border-radius:24px;background:#fff;opacity:.85;pointer-events:none;transition:opacity .8s}',
'.fx-cloud::before,.fx-cloud::after{content:"";position:absolute;background:#fff;border-radius:50%}',
'.fx-cloud::before{width:38px;height:38px;left:12px;top:-16px}',
'.fx-cloud::after{width:28px;height:28px;left:44px;top:-10px}',
'.sky[data-p="dusk"] .fx-cloud{opacity:.45}',
'.sky[data-p="night"] .fx-cloud{opacity:.12}',

'@media (prefers-reduced-motion:no-preference){',
'.ov{animation:fxFade .18s ease-out}',
'.modal{animation:fxPop .3s cubic-bezier(.2,1.2,.4,1)}',
'.modal .center svg{animation:fxBob 2.2s ease-in-out infinite}',
'.panel.fx-enter>*{animation:fxRise .32s both}',
'.panel.fx-enter>*:nth-child(2){animation-delay:.04s}',
'.panel.fx-enter>*:nth-child(3){animation-delay:.08s}',
'.panel.fx-enter>*:nth-child(4){animation-delay:.12s}',
'.log li:first-child{animation:fxSlide .35s ease-out}',
'.cash.fx-up{animation:fxUp .7s ease-out}',
'.cash.fx-down{animation:fxDown .7s ease-out}',
'.nb.fx-up .bar{animation:fxBarUp .8s ease-out}',
'.nb.fx-down .bar{animation:fxBarDown .8s ease-out}',
'.pill.bad{animation:fxPulse 1.4s ease-in-out infinite}',
'.sun{animation:fxSun 3s ease-in-out infinite}',
'.sky[data-p="night"]::before{animation:fxTwinkle 3s ease-in-out infinite}',
'.fx-cloud{animation:fxCloud 80s linear infinite}',
'}'
].join('\n');

function injectCss(){
  var s=document.createElement('style');s.id='fx-style';s.textContent=CSS;document.head.appendChild(s);
}
function addClouds(){
  var sky=document.getElementById('sky');if(!sky)return;
  var anchor=sky.querySelector('svg'),cfg=[[14,0],[34,-30],[8,-58]];
  cfg.forEach(function(c,i){
    var d=document.createElement('div');d.className='fx-cloud';
    d.style.top=c[0]+'px';d.style.animationDuration=(70+i*28)+'s';d.style.animationDelay=c[1]+'s';
    d.style.transform='scale('+(.8+i*.25)+')';
    sky.insertBefore(d,anchor);
  });
}

/* ---------- world effects (canvas) ---------- */
var FLAG=['#1eb53a','#ffffff','#0072c6','#f2b630','#d6403a'];
var EMIT=[{x:238,y:214},{x:800,y:208},{x:470,y:514},{x:540,y:878}];
var parts=[],floats=[],rings=[],flies=[],drops=[],bird=null;
var dustT=0,smokeT=0,birdT=6,rain=0,flick=0,lastDt=.016;

function rnd(a,b){return a+Math.random()*(b-a)}
function pick(a){return a[Math.floor(Math.random()*a.length)]}

function pop(text,x,y,col){floats.push({t:text,x:x,y:y,vy:-30,life:1.4,max:1.4,col:col||'#fff'})}
function ring(x,y,col){if(reduce)return;rings.push({x:x,y:y,r:4,max:36,life:.55,maxLife:.55,col:col||'#1eb53a'})}
function burst(x,y,kind,n){
  if(reduce)return;
  n=n||12;
  for(var i=0;i<n;i++){
    var p={k:kind,x:x,y:y,vx:0,vy:0,g:0,life:1,max:1,r:3,rot:Math.random()*6,vr:0,col:'#fff',sw:Math.random()*6};
    if(kind==='confetti'){p.vx=rnd(-110,110);p.vy=rnd(-210,-70);p.g=300;p.life=p.max=rnd(1.3,2);p.r=rnd(2.5,5);p.vr=rnd(-9,9);p.col=pick(FLAG)}
    else if(kind==='coins'){p.vx=rnd(-80,80);p.vy=rnd(-210,-110);p.g=340;p.life=p.max=rnd(1,1.3);p.r=4;p.vr=rnd(6,12);p.col='#f2b630'}
    else if(kind==='stars'){var a=Math.random()*6.283,s=rnd(50,110);p.vx=Math.cos(a)*s;p.vy=Math.sin(a)*s;p.life=p.max=.55;p.r=rnd(3,5);p.vr=rnd(-6,6);p.col='#ffe27a'}
    else if(kind==='hearts'){p.vx=rnd(-18,18);p.vy=rnd(-52,-30);p.life=p.max=rnd(1,1.5);p.r=rnd(4,6);p.col='#e5484d'}
    parts.push(p);
  }
}
function rainFor(sec){if(!reduce)rain=Math.max(rain,sec)}
function flicker(){if(!reduce)flick=1.2}

function spawnDust(x,y,riding,ang,run){
  if(riding){
    parts.push({k:'smoke',x:x-Math.cos(ang)*28,y:y-Math.sin(ang)*28-2,vx:rnd(-8,8),vy:rnd(-12,-4),g:0,life:.7,max:.7,r:3,grow:9,rot:0,vr:0,col:'120,120,120',sw:0});
  }else{
    parts.push({k:'dust',x:x+rnd(-4,4),y:y-1,vx:rnd(-14,14)*(run?1.6:1),vy:rnd(-16,-5),g:0,life:run?.55:.4,max:run?.55:.4,r:rnd(2,4),rot:0,vr:0,col:'214,200,170',sw:0});
  }
}

function update(dt,info){
  lastDt=dt;
  var i;
  for(i=floats.length-1;i>=0;i--){var f=floats[i];f.life-=dt;f.y+=f.vy*dt;f.vy*=.96;if(f.life<=0)floats.splice(i,1)}
  if(reduce)return;
  for(i=rings.length-1;i>=0;i--){var rg=rings[i];rg.life-=dt;rg.r=4+(rg.max-4)*(1-rg.life/rg.maxLife);if(rg.life<=0)rings.splice(i,1)}
  for(i=parts.length-1;i>=0;i--){
    var p=parts[i];p.life-=dt;
    if(p.life<=0){parts.splice(i,1);continue}
    p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;
    if(p.k==='hearts')p.x+=Math.sin((p.max-p.life)*6+p.sw)*10*dt;
    if(p.grow)p.r+=p.grow*dt;
  }
  if(!info)return;
  /* footsteps and exhaust */
  if(info.moving||info.riding){
    dustT-=dt;
    if(dustT<=0){spawnDust(info.px,info.py,info.riding,info.ang||0,info.run);dustT=info.riding?.06:(info.run?.05:.12)}
  }
  /* chimney, stove and cookshop smoke */
  smokeT-=dt;
  if(smokeT<=0){
    smokeT=.45;
    var cam=info.cam;
    EMIT.forEach(function(e){
      if(e.x>cam.x-60&&e.x<cam.x+540&&e.y>cam.y-60&&e.y<cam.y+380)
        parts.push({k:'smoke',x:e.x+rnd(-2,2),y:e.y,vx:rnd(4,14),vy:rnd(-20,-11),g:0,life:2.2,max:2.2,r:3,grow:5,rot:0,vr:0,col:'235,235,235',sw:0});
    });
  }
  /* fireflies at night */
  if(info.night>.2){
    while(flies.length<16){flies.push({x:info.cam.x+rnd(0,480),y:info.cam.y+rnd(0,320),ph:rnd(0,6),sp:rnd(.6,1.4),life:rnd(4,8),max:8})}
  }
  for(i=flies.length-1;i>=0;i--){
    var fl=flies[i];fl.life-=dt;fl.ph+=dt*fl.sp;fl.x+=Math.cos(fl.ph*1.3)*14*dt;fl.y+=Math.sin(fl.ph)*10*dt;
    if(fl.life<=0||info.night<=.2||fl.x<info.cam.x-40||fl.x>info.cam.x+520||fl.y<info.cam.y-40||fl.y>info.cam.y+360)flies.splice(i,1);
  }
  /* birds by day */
  if(info.night<.1&&!bird){
    birdT-=dt;
    if(birdT<=0){birdT=rnd(10,20);bird={x:info.cam.x-30,y:info.cam.y+rnd(20,90),vx:rnd(55,80),ph:0,n:3}}
  }
  if(bird){bird.x+=bird.vx*dt;bird.ph+=dt*9;if(bird.x>info.cam.x+540)bird=null}
  /* weather timers */
  if(rain>0)rain-=dt;
  if(flick>0)flick-=dt;
}

function star(ctx,x,y,r,rot){
  ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.beginPath();
  for(var i=0;i<8;i++){var a=i*Math.PI/4,rr=i%2?r*.45:r;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}
  ctx.closePath();ctx.fill();ctx.restore();
}
function heart(ctx,x,y,r){
  ctx.beginPath();ctx.moveTo(x,y+r*.9);
  ctx.bezierCurveTo(x-r*1.6,y-r*.2,x-r*.7,y-r*1.4,x,y-r*.5);
  ctx.bezierCurveTo(x+r*.7,y-r*1.4,x+r*1.6,y-r*.2,x,y+r*.9);ctx.fill();
}

/* called inside the world-translated context, after entities and before the night overlay */
function drawWorld(ctx,cam,vw,vh){
  var i,x0=cam.x-40,x1=cam.x+vw+40,y0=cam.y-60,y1=cam.y+vh+40;
  rings.forEach(function(r){ctx.strokeStyle=r.col;ctx.globalAlpha=Math.max(0,r.life/r.maxLife);ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(r.x,r.y,r.r,r.r*.45,0,0,7);ctx.stroke()});
  ctx.globalAlpha=1;
  if(bird){
    ctx.strokeStyle='rgba(20,34,26,.75)';ctx.lineWidth=1.6;
    for(i=0;i<bird.n;i++){
      var bx=bird.x-i*22,by=bird.y+Math.sin(bird.ph*.3+i)*5+i*7,w=Math.sin(bird.ph+i)*4;
      ctx.beginPath();ctx.moveTo(bx-7,by+w);ctx.quadraticCurveTo(bx-3,by-3,bx,by);ctx.quadraticCurveTo(bx+3,by-3,bx+7,by+w);ctx.stroke();
    }
  }
  for(i=0;i<parts.length;i++){
    var p=parts[i];
    if(p.x<x0||p.x>x1||p.y<y0||p.y>y1)continue;
    var a=Math.max(0,p.life/p.max);
    if(p.k==='dust'||p.k==='smoke'){
      ctx.fillStyle='rgba('+p.col+','+(a*(p.k==='smoke'?.55:.6))+')';
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill();
    }else if(p.k==='confetti'){
      ctx.globalAlpha=Math.min(1,a*1.6);ctx.fillStyle=p.col;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillRect(-p.r,-p.r*.5,p.r*2,p.r);ctx.restore();ctx.globalAlpha=1;
    }else if(p.k==='coins'){
      ctx.fillStyle=p.col;ctx.strokeStyle='#a8741a';ctx.lineWidth=1;
      var sx=Math.abs(Math.cos(p.rot));ctx.beginPath();ctx.ellipse(p.x,p.y,p.r*Math.max(.25,sx),p.r,0,0,7);ctx.fill();ctx.stroke();
    }else if(p.k==='stars'){
      ctx.globalAlpha=a;ctx.fillStyle=p.col;star(ctx,p.x,p.y,p.r*1.6,p.rot);ctx.globalAlpha=1;
    }else if(p.k==='hearts'){
      ctx.globalAlpha=Math.min(1,a*1.8);ctx.fillStyle=p.col;heart(ctx,p.x,p.y,p.r);ctx.globalAlpha=1;
    }
  }
  /* floating text */
  ctx.font='700 12px Archivo, system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
  floats.forEach(function(f){
    var a=Math.min(1,f.life/(f.max*.4));
    ctx.globalAlpha=a;ctx.lineWidth=3.5;ctx.strokeStyle='rgba(10,15,12,.8)';ctx.strokeText(f.t,f.x,f.y);ctx.fillStyle=f.col;ctx.fillText(f.t,f.x,f.y);
  });
  ctx.globalAlpha=1;
  /* fireflies glow */
  flies.forEach(function(f){
    var a=Math.min(1,f.life,(f.max-f.life+.5))*(.5+.5*Math.sin(f.ph*3));
    if(a<=0)return;
    var g=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,8);
    g.addColorStop(0,'rgba(255,240,140,'+Math.min(1,a)+')');g.addColorStop(1,'rgba(255,240,140,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(f.x,f.y,8,0,7);ctx.fill();
  });
}

/* called in screen space, after the night overlay and before the HUD */
function drawScreen(ctx,vw,vh){
  if(rain>0){
    var k=Math.min(1,rain/2);
    if(!drops.length){for(var i=0;i<110;i++)drops.push({x:rnd(0,vw+40),y:rnd(0,vh),v:rnd(260,380)})}
    ctx.fillStyle='rgba(30,45,75,'+(.22*k)+')';ctx.fillRect(0,0,vw,vh);
    ctx.strokeStyle='rgba(200,220,255,'+(.6*k)+')';ctx.lineWidth=1;ctx.beginPath();
    drops.forEach(function(d){
      d.y+=d.v*lastDt;d.x-=60*lastDt;
      if(d.y>vh){d.y=-10;d.x=rnd(0,vw+40)}
      if(d.x<-10)d.x=vw+10;
      ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-3,d.y+9);
    });
    ctx.stroke();
  }
  if(flick>0){
    ctx.fillStyle='rgba(0,0,0,'+((Math.random()<.5?.6:.12)*Math.min(1,flick))+')';ctx.fillRect(0,0,vw,vh);
  }
}

/* ---------- interface helpers called by app.js ---------- */
var prev=null;
function fmtCash(n){return 'Le '+Math.round(n).toLocaleString('en-US')}
function tweenCash(el,a,b){
  var t0=performance.now(),dur=520;
  function step(t){
    if(!el.isConnected)return;
    var k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);
    el.textContent=fmtCash(a+(b-a)*e);
    if(k<1)requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
/* v = {cash, vals:[health, food, energy, fun, social, hygiene]} (rounded) */
function afterMe(el,v){
  if(!el)return;
  if(!prev){prev=v;return}
  var cashEl=el.querySelector('.cash');
  if(cashEl&&v.cash!==prev.cash){
    cashEl.classList.add(v.cash>prev.cash?'fx-up':'fx-down');
    if(!reduce)tweenCash(cashEl,prev.cash,v.cash);
  }
  var rows=el.querySelectorAll('.nb');
  for(var i=0;i<v.vals.length;i++){
    if(rows[i]&&v.vals[i]!==prev.vals[i]){
      rows[i].classList.add(v.vals[i]>prev.vals[i]?'fx-up':'fx-down');
      var bi=rows[i].querySelector('.bar i');
      if(bi&&!reduce){var to=bi.style.width;bi.style.width=prev.vals[i]+'%';void bi.offsetWidth;bi.style.width=to}
    }
  }
  prev=v;
}
function resetStats(){prev=null}
function panelEnter(el){
  if(!el||reduce)return;
  el.classList.add('fx-enter');
  setTimeout(function(){el.classList.remove('fx-enter')},450);
}

injectCss();
if(!reduce)addClouds();

window.FreetownFX={
  reduced:reduce,
  update:update,drawWorld:drawWorld,drawScreen:drawScreen,
  pop:pop,burst:burst,ring:ring,rainFor:rainFor,flicker:flicker,
  afterMe:afterMe,resetStats:resetStats,panelEnter:panelEnter
};
})();
