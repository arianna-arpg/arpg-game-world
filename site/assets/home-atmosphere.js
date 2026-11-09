/* Preserved homepage Observer, eye, stars and click ripples. */
(function(){
  "use strict";
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* (top-nav scroll state is handled by the shared nav widget, assets/nav.js) */

  /* reveal on view */
  var revs = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  function revealAll(){ revs.forEach(function(el){ el.classList.add('in'); }); }
  if('IntersectionObserver' in window && !reduce){
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} });
    }, {threshold:.12, rootMargin:'0px 0px -8% 0px'});
    revs.forEach(function(el){ io.observe(el); });
    /* safety net: never leave content stuck hidden if the observer misfires */
    setTimeout(function(){ revs.forEach(function(el){ var r=el.getBoundingClientRect(); if(r.top < window.innerHeight*1.2) el.classList.add('in'); }); }, 2600);
  } else { revealAll(); }

  /* THE OBSERVER: scroll, and the insignia detaches from the title to creep
     toward the centre of the backdrop, where it stays for the whole page:
     the thing that made the world, watching you read about it. Scroll-driven
     only (it moves exactly as much as you do), fixed BEHIND all content
     (z:-1 in the content plane), and skipped entirely under reduced-motion;
     there the mark simply stays anchored in the hero. */
  var mwrap = document.querySelector('.hero-mark-wrap'), mlock = document.querySelector('.hero-lockup');
  if(mwrap && mlock && !reduce){
    var mAX = 0, mADocY = 0, mLastP = 0;
    /* jitter offsets, written by the twitch engine below, composed into
       every placement write so scroll and jitter never fight */
    var jx = 0, jy = 0, jr = 0, jTimer = null;
    /* eye state: boost pulls the wrap's opacity toward full while the lid is
       open; the mark is faint by design and the eye is not */
    var eyeBoost = 0, lastEye = 0;
    var eyeG = mwrap.querySelector('.hw-eyeg'), eyePupil = mwrap.querySelector('.hw-pupil');
    var mPlace = function(){
      var vw = window.innerWidth, vh = window.innerHeight, s = window.scrollY || window.pageYOffset || 0;
      var t = Math.min(1, s/(vh*2.0)), p = t*t*(3-2*t);   /* smoothstep over ~2 viewports; the creep is patient */
      var heroW = Math.min(Math.max(300, vw*.44), 560);
      var obsW  = Math.min(vh*.72, vw*.8, 700);
      var ay = mADocY - s;
      var x = mAX + (vw/2 - mAX)*p, y = ay + (vh*.5 - ay)*p;
      mwrap.style.width = (heroW + (obsW - heroW)*p) + 'px';
      /* -52%→-50% self-offset blends in so p=0 matches the CSS anchor exactly */
      mwrap.style.transform = 'translate(' + (x + jx) + 'px,' + (y + jy) + 'px) translate(-50%,' + (-52 + 2*p) + '%)' + (jr ? ' rotate(' + jr + 'deg)' : '');
      var base = .55*p; // The shared lockup owns the anchored mark; its Observer emerges on scroll.
      mwrap.style.opacity = String(base + (.97 - base)*eyeBoost);
      mLastP = p;
    };
    var mMeasure = function(){
      var r = mlock.getBoundingClientRect();
      mAX = r.left + r.width/2;
      mADocY = r.top + (window.scrollY || window.pageYOffset || 0) + r.height/2;
      mPlace();
    };

    /* THE TWITCH: once the Observer has detached and re-anchored (parked),
       it occasionally moves when you aren't quite looking: every 6–14s one
       of two tells, gated on being parked and the tab being visible.
       'twitch' = a small decaying wobble in a random direction (~half a
       second, a few px). 'lean' = the rarer one: a slow 2–4px drift with a
       hair of rotation, a held beat, then a quick snap back to true. The
       "did it move? ...no. ...right?" of it. Never while it's still riding
       the title, never under reduced-motion (this whole block is gated). */
    var jGap = function(){ return 6000 + Math.random()*8000; };
    var jSchedule = function(ms){ clearTimeout(jTimer); jTimer = setTimeout(jEvent, ms); };
    var smoothT = function(e){ return e*e*(3-2*e); };
    var setEye = function(k, px, py){
      if(!eyeG) return;
      eyeG.setAttribute('opacity', k < .02 ? '0' : '1');
      eyeG.setAttribute('transform', 'translate(16 16) scale(1 ' + k.toFixed(3) + ') translate(-16 -16)');
      if(eyePupil){ eyePupil.setAttribute('cx', (16 + px).toFixed(2)); eyePupil.setAttribute('cy', (16 + py).toFixed(2)); }
    };
    /* THE EYE: the lid in the hollow opens for a breathless moment. Rise,
       a beat, one saccade (the pupil finds your cursor; nobody at the
       glass and it picks its own spot to study), then shut. */
    var eyeEvent = function(){
      lastEye = performance.now();
      var t0 = lastEye;
      var r = mwrap.getBoundingClientRect(), ecx = r.left + r.width/2, ecy = r.top + r.height/2;
      var lx, ly, canPtr = (typeof ptr === 'object' && ptr && ptr.x > -9000);
      if(canPtr){ var dx = ptr.x - ecx, dy = ptr.y - ecy, dd = Math.sqrt(dx*dx + dy*dy) || 1; lx = dx/dd; ly = dy/dd; }
      else { var a2 = Math.random()*6.283; lx = Math.cos(a2); ly = Math.sin(a2); }
      var OPEN = 260, HOLD = 650 + Math.random()*450, CLOSE = 190, SACC = 180 + Math.random()*160;
      (function step(){
        var t = performance.now() - t0, k, px = 0, py = 0;
        if(t < OPEN){ k = smoothT(t/OPEN); }
        else if(t < OPEN + HOLD){ k = 1; if(t - OPEN > SACC){ px = lx*.85; py = ly*.85; } }
        else if(t < OPEN + HOLD + CLOSE){ k = 1 - smoothT((t - OPEN - HOLD)/CLOSE); px = lx*.85; py = ly*.85; }
        else { eyeBoost = 0; setEye(0, 0, 0); mPlace(); jSchedule(jGap()); return; }
        eyeBoost = k; setEye(k, px, py); mPlace();
        requestAnimationFrame(step);
      })();
    };
    var jEvent = function(){
      if(document.hidden || mLastP < .92){ jSchedule(2500 + Math.random()*2500); return; }
      /* the eye is rarer than rare: never in the first 75s, at most once per
         75s after that, and only a 7% roll even then; most visitors will
         never see it, which is the point */
      var nowE = performance.now();
      if(nowE > 75e3 && nowE - lastEye > 75e3 && Math.random() < .07){ eyeEvent(); return; }
      var t0 = performance.now();
      var ang = Math.random()*6.283, ux = Math.cos(ang), uy = Math.sin(ang);
      if(Math.random() < .78){ /* twitch */
        var dur = 350 + Math.random()*280, amp = 3 + Math.random()*4;
        (function step(){
          var e = (performance.now() - t0)/dur;
          if(e >= 1){ jx = jy = 0; mPlace();
            /* the double-take: sometimes it twitches again, right after */
            jSchedule(Math.random() < .3 ? 220 + Math.random()*260 : jGap()); return; }
          var k = Math.sin(e*Math.PI*2.6)*(1-e)*(1-e)*amp;
          jx = ux*k; jy = uy*k; mPlace();
          requestAnimationFrame(step);
        })();
      } else { /* lean */
        var out = 900 + Math.random()*500, hold = 500 + Math.random()*700, back = 140;
        var amp2 = 2 + Math.random()*2, rot = Math.random()*2.4 - 1.2;
        (function step(){
          var tm = performance.now() - t0;
          if(tm < out){ var e1 = tm/out, s1 = e1*e1*(3-2*e1); jx = ux*amp2*s1; jy = uy*amp2*s1; jr = rot*s1; }
          else if(tm < out + hold){ jx = ux*amp2; jy = uy*amp2; jr = rot; }
          else if(tm < out + hold + back){ var e2 = (tm - out - hold)/back; jx = ux*amp2*(1-e2); jy = uy*amp2*(1-e2); jr = rot*(1-e2); }
          else { jx = jy = jr = 0; mPlace(); jSchedule(jGap()); return; }
          mPlace();
          requestAnimationFrame(step);
        })();
      }
    };

    mwrap.classList.add('observing');
    window.addEventListener('scroll', mPlace, {passive:true});
    window.addEventListener('resize', mMeasure);
    /* re-anchor once the display font lands (Cinzel shifts the lockup box) */
    window.addEventListener('load', mMeasure);
    if(document.fonts && document.fonts.ready && document.fonts.ready.then) document.fonts.ready.then(mMeasure);
    mMeasure();
    jSchedule(jGap());
    /* QA handle: state + a manual trigger; drives nothing on its own */
    window.__hwobs = { get state(){ return { p: mLastP, jx: jx, jy: jy, jr: jr, eye: eyeBoost }; }, jolt: jEvent, blink: eyeEvent,
      test: function(x, y, r){ jx = x||0; jy = y||0; jr = r||0; mPlace(); },
      eyeTest: function(k, px, py){ eyeBoost = k||0; setEye(k||0, px||0, py||0); mPlace(); } };
  }

  /* (section scroll-spy is handled by the shared dot-rail widget, assets/sectionnav.js) */

  /* THE STAR CHART backdrop: the open plain of opportunity behind the name
     and the mark. A tilted field, the Hollow Wake Ledger's own pane: far at
     the top of the banner (small, dim, dense, slow), near at the bottom
     (large, bright, sparse, quick), mostly DISCONNECTED stars with rare
     constellation lines only in the near band, ether-inked with the mark's
     three points as scattered flickers. */
  var canvas = document.getElementById('bg-canvas');
  if(!canvas) return;
  var ctx = canvas.getContext('2d');
  var W=0,H=0,dpr=Math.min(window.devicePixelRatio||1, 1.75);
  var nodes=[], embers=[], LINK=132, tick=0;
  /* the chart's flickers ARE the insignia's three points: teal / violet /
     ember, same hexes as the mark in the nav, the hero and the footer:
     the splash over the ether field, never the field itself. */
  var COLORS=['#4fd6c4','#a98bff','#ff8a4c'];
  var ETHER='#9ab8dc';
  /* the tilt: nearness rises DOWN the banner: far and small at the top,
     close and bright at the bottom; quadratic so the foreshortening reads
     as a receding plane. */
  function scaleOf(y){
    var near=Math.min(1,Math.max(0,y/Math.max(1,H)));
    return .42+near*near*.88;
  }

  /* THE FIDGET LAYER: the backdrop is quietly interactive. The pointer
     (mouse, pen, or a dragging finger) carries a soft repulsion field the
     motes bounce off (parked it barely bends the drift, swept through them
     it scatters), and every click/tap drops a stone into the pool: an
     expanding ripple that shoves the motes as its wavefront passes. Ambient
     by design: passive listeners, nothing ever blocks the page, and
     prefers-reduced-motion keeps the whole layer still. */
  var ptr={x:-1e4,y:-1e4,px:-1e4,py:-1e4,speed:0};
  var ripples=[];
  var PTR_R=100, PTR_R2=PTR_R*PTR_R, PTR_PUSH=.5, PTR_EMBER=70, PTR_EMBER2=PTR_EMBER*PTR_EMBER;
  var RIP_LIFE=100, RIP_MAX=150, RIP_BAND=26, RIP_PUSH=.9;
  function parkPtr(){ ptr.x=ptr.px=-1e4; ptr.y=ptr.py=-1e4; ptr.speed=0; }
  function resize(){
    W=canvas.clientWidth; H=canvas.clientHeight;
    canvas.width=Math.floor(W*dpr); canvas.height=Math.floor(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    var count = Math.round(Math.min(90, Math.max(38, (W*H)/22000)));
    nodes=[];
    for(var i=0;i<count;i++){
      nodes.push({
        /* uniform seeding (her word: the full field back); the TILT still
           reads through per-depth size and pace, never through absence */
        x:Math.random()*W, y:Math.random()*H,
        vx:(Math.random()-.5)*.14, vy:(Math.random()-.5)*.14,
        /* dv* = disturbance from the fidget layer; decays back to pure drift */
        dvx:0, dvy:0,
        r:Math.random()*2.0+1.3,
        tw:Math.random()*6.28,
        /* the chart wears the insignia's three points outright (her word:
           the trio IS the sprite scheme; the ether lives in the glow) */
        c:COLORS[i%3]
      });
    }
    embers=[];
    var ec=Math.round(Math.min(26, W/60));
    for(var j=0;j<ec;j++){ embers.push(newEmber(true)); }
  }
  function newEmber(init){
    return { x:Math.random()*W, y: init?Math.random()*H:H+10, r:Math.random()*1.5+.5,
             vy:-(Math.random()*.35+.15), a:Math.random()*.55+.25, tw:Math.random()*6.28 };
  }
  function frame(){
    ctx.clearRect(0,0,W,H);
    /* ripples: the stone drops, the pool answers (drawn beneath the web) */
    for(var rq=ripples.length-1;rq>=0;rq--){
      var w=ripples[rq]; w.t++;
      var p=w.t/RIP_LIFE;
      if(p>=1){ ripples.splice(rq,1); continue; }
      w.r=RIP_MAX*(1-Math.pow(1-p,3));
      var al=.26*Math.pow(1-p,1.8);
      ctx.strokeStyle='rgba(150,185,220,'+al+')';
      ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.arc(w.x,w.y,w.r,0,6.2832); ctx.stroke();
      if(w.r>34){ /* the trailing second wave of the drop */
        ctx.strokeStyle='rgba(150,185,220,'+(al*.5)+')';
        ctx.beginPath(); ctx.arc(w.x,w.y,w.r*.62,0,6.2832); ctx.stroke();
      }
    }
    /* pointer field gain: parked ≈ a whisper, swept ≈ a proper shove */
    var pmx=ptr.x-ptr.px, pmy=ptr.y-ptr.py;
    ptr.speed=ptr.speed*.8+Math.min(40,Math.sqrt(pmx*pmx+pmy*pmy))*.2;
    ptr.px=ptr.x; ptr.py=ptr.y;
    var ptrGain=.3+Math.min(1,ptr.speed/16)*.7;
    /* links */
    for(var i=0;i<nodes.length;i++){
      var a=nodes[i];
      var rx=a.x-ptr.x, ry=a.y-ptr.y, rd2=rx*rx+ry*ry;
      if(rd2<PTR_R2 && rd2>1){
        var rd=Math.sqrt(rd2), fall=1-rd/PTR_R;
        var push=fall*fall*PTR_PUSH*ptrGain;
        a.dvx+=(rx/rd)*push; a.dvy+=(ry/rd)*push;
      }
      for(var q=0;q<ripples.length;q++){
        var rp=ripples[q], ddx=a.x-rp.x, ddy=a.y-rp.y;
        var dd=Math.sqrt(ddx*ddx+ddy*ddy)||1, band=Math.abs(dd-rp.r);
        if(band<RIP_BAND){
          var amp=1-rp.t/RIP_LIFE;
          var bf=(1-band/RIP_BAND)*amp*amp*RIP_PUSH;
          a.dvx+=(ddx/dd)*bf; a.dvy+=(ddy/dd)*bf;
        }
      }
      /* THE TILT: a star's pace scales by its nearness: far ones crawl,
         near ones stride, with no restoring spring (her word: a shoved
         node drifts on; it never bounces back and forth). */
      var asc=scaleOf(a.y);
      a.x+=(a.vx+a.dvx)*asc; a.y+=(a.vy+a.dvy)*asc;
      a.dvx*=.9; a.dvy*=.9;
      if(a.x<0||a.x>W){ a.vx*=-1; a.dvx=0; a.x=a.x<0?0:W; }
      if(a.y<0||a.y>H){ a.vy*=-1; a.dvy=0; a.y=a.y<0?0:H; }
      /* THE WEB (her word: the network-like, attached spritework): links
         everywhere, the original reach and ink. */
      for(var k=i+1;k<nodes.length;k++){
        var b=nodes[k], dx=a.x-b.x, dy=a.y-b.y, d=Math.sqrt(dx*dx+dy*dy);
        if(d<LINK){
          var al=(1-d/LINK)*.22;
          ctx.strokeStyle='rgba(120,150,200,'+al+')';
          ctx.lineWidth=.6;
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }
      }
    }
    /* nodes: SIZE wears the tilt (far small, near large); ink stays close
       to the original presence, gently graded, with a soft twinkle */
    tick+=.016;
    for(var n=0;n<nodes.length;n++){
      var p=nodes[n], sc=scaleOf(p.y);
      var twk=.88+.12*Math.sin(tick*(.5+(n%7)*.13)+p.tw);
      ctx.beginPath();
      ctx.fillStyle=p.c;
      ctx.globalAlpha=(.5+.3*sc)*twk;
      ctx.arc(p.x,p.y,p.r*sc,0,6.2832); ctx.fill();
      ctx.globalAlpha=.2*(.6+.4*sc)*twk;
      ctx.arc(p.x,p.y,p.r*sc*3.6,0,6.2832); ctx.fill();
      ctx.globalAlpha=1;
    }
    /* embers */
    for(var e=0;e<embers.length;e++){
      var m=embers[e];
      m.y+=m.vy; m.x+=Math.sin((m.tw+=0.01))*0.25;
      /* embers part around the pointer, a lighter touch than the motes */
      var ex=m.x-ptr.x, ey=m.y-ptr.y, ed2=ex*ex+ey*ey;
      if(ed2<PTR_EMBER2 && ed2>1){ var ed=Math.sqrt(ed2); m.x+=(ex/ed)*(1-ed/PTR_EMBER)*.9; }
      if(m.y< -12){ embers[e]=newEmber(false); }
      ctx.beginPath();
      ctx.fillStyle='rgba(255,138,76,'+m.a+')'; /* --ember, the mark's third point */
      ctx.arc(m.x,m.y,m.r,0,6.2832); ctx.fill();
    }
    raf=requestAnimationFrame(frame);
  }
  var raf=null;
  resize();
  window.addEventListener('resize', function(){ resize(); if(reduce){ staticFrame(); } });

  /* fidget-layer input: pointer events cover mouse, pen and touch alike.
     A lifted finger leaves no field behind; a parked mouse keeps its. */
  if(!reduce){
    window.addEventListener('pointermove', function(e){ ptr.x=e.clientX; ptr.y=e.clientY; }, {passive:true});
    window.addEventListener('pointerdown', function(e){
      ptr.x=e.clientX; ptr.y=e.clientY;
      if(ripples.length>=6) ripples.shift();
      ripples.push({x:e.clientX, y:e.clientY, t:0, r:0});
    }, {passive:true});
    window.addEventListener('pointerup', function(e){ if(e.pointerType!=='mouse') parkPtr(); }, {passive:true});
    window.addEventListener('pointercancel', parkPtr, {passive:true});
    document.documentElement.addEventListener('mouseleave', parkPtr);
  }
  /* QA handle (the site's __game): state only, drives nothing */
  window.__hwbg = { get nodes(){ return nodes; }, get ripples(){ return ripples; }, get ptr(){ return ptr; } };
  function staticFrame(){
    /* draw a single frame with no animation; the tilt still reads */
    ctx.clearRect(0,0,W,H);
    for(var n=0;n<nodes.length;n++){
      var p=nodes[n], sc=scaleOf(p.y);
      ctx.beginPath(); ctx.fillStyle=p.c;
      ctx.globalAlpha=.4+.25*sc;
      ctx.arc(p.x,p.y,p.r*sc,0,6.2832); ctx.fill(); ctx.globalAlpha=1;
    }
  }
  if(reduce){ staticFrame(); } else { frame(); }
})();
