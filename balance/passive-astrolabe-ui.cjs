// Run against a production build. Sample actual SVG world coordinates on
// Chromium's animation timeline, independent of host frame rate.
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const path = require('node:path');
const { startGameServer } = require('../launcher/server.cjs');
const { makeTempDir } = require('../scripts/temp-dir.cjs');

const scratch = makeTempDir('hollow-astrolabe-');
app.setPath('userData', path.join(scratch, 'profile'));
app.disableHardwareAcceleration();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  let stage = 'loading';
  const timer = setTimeout(() => { console.error('Astrolabe timed out while '+stage); app.exit(1); }, 120000);
  const server = await startGameServer({root: path.resolve(process.argv[2] || path.join(__dirname, '../dist')), savesDir: path.join(scratch, 'saves')});
  const win = new BrowserWindow({show: false, width: 1400, height: 1000, webPreferences: {offscreen: true, backgroundThrottling: false}});
  const js = expr => win.webContents.executeJavaScript(expr);
  const phase = name => { stage = name; console.log('Astrolabe:', name); };
  const untilSettled = async () => {
    for (let i = 0; i < 100 && await js("S.matches('.turning-middle,.turning-outer')"); i++) await wait(40);
    assert.equal(await js("S.matches('.turning-middle,.turning-outer')"), false);
  };
  try {
    await win.loadURL(server.url);
    await js('__game.hydrated()');
    phase('opening the tree');
    await js(`(() => {
      __game.account().ledger.prologue_lived = 1;
      __game.devStartRun('warrior'); __game.ui.hideAll();
      const w = window.W = __game.world(), ui = window.U = __game.ui;
      w.loadZone('lastlight');
      Object.assign(w.player.pos, w.fonts[0].pos); w.player.tier = w.fonts[0].tier ?? 0;
      w.meta.passivePoints = 12;
      ui.toggleTree();
      window.locked = !document.querySelector('[data-astrolabe]');
      w.meta.ringRotationUnlocked = true; ui.refreshTree();
      window.S = document.querySelector('#tree-svg');
      window.btn = (band,delta) => document.querySelector('[data-ring-band="'+band+'"][data-ring-delta="'+delta+'"]');
      const originalNodes = new Map([...S.querySelectorAll('.tree-node')].map(n => [n.dataset.node, n]));
      const frames = new Map([...S.querySelectorAll('[data-star-ink]')].map(ink => [ink, ink.parentElement]));
      window.node = id => S.querySelector('[data-node="'+id+'"]') ?? originalNodes.get(id);
      window.outerId = S.querySelector('[data-star-band=outer] .tree-node').dataset.node;
      window.pos = id => {
        const el=node(id), p=new DOMPoint(el.cx.baseVal.value,el.cy.baseVal.value);
        const ink=el.closest('[data-star-ink]');
        const painted=el.isConnected ? el : frames.get(ink);
        const m=S.getScreenCTM().inverse().multiply(painted.getScreenCTM());
        const at=p.matrixTransform(m);
        return [at.x, at.y];
      };
      const middleSeams = [...S.querySelectorAll('[data-star-seam="middle"] .passive-tree-route')];
      window.seam = () => middleSeams.find(g => [g.dataset.a,g.dataset.b].includes('node_114'));
      window.peer = () => [seam().dataset.a,seam().dataset.b].find(id => id !== 'node_114');
      window.sampleTurn = (band,t) => {
        for (const layer of S.querySelectorAll('[data-star-band="'+band+'"]')) {
          const anim=layer.getAnimations().find(a => a.effect.getKeyframes().some(k => k.transform));
          if (!anim) throw Error('Missing native turn on '+band);
          anim.pause(); anim.currentTime=anim.effect.getTiming().duration*t;
        }
      };
      return true;
    })()`);
    assert.equal(await js('locked'), true);
    phase('sampling a wrapped turn');
    const original = await js("({mid:pos('node_115'),core:pos('node_114'),outer:pos(outerId),peer:peer(),zoom:U.treeZoom})");
    assert.equal(original.peer, 'node_115');
    assert.ok(original.zoom > 1);
    const first = await js(`(() => {
      const b=btn('middle',-1); b.focus(); b.click();
      const stable=S===document.querySelector('#tree-svg') && b===document.activeElement;
      sampleTurn('middle',.5);
      const p=new DOMPoint(...pos('node_110')).matrixTransform(S.getScreenCTM());
      S.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:p.x,clientY:p.y}));
      const n=node('node_115'), f=S.querySelectorAll('[data-star-band=middle] > foreignObject');
      const painted=window.middleNodeSheet=f[f.length-1], canvas=painted.querySelector('canvas');
      const pixel=new DOMPoint(n.cx.baseVal.value,n.cy.baseVal.value).matrixTransform(painted.transform.baseVal.consolidate().matrix.inverse());
      const px=pixel.x, py=pixel.y;
      const ink=canvas.getContext('2d').getImageData(Math.floor(px),Math.floor(py),1,1).data[3];
      return {ink,mid:pos('node_115'),core:pos('node_114'),outer:pos(outerId),
        peer:peer(),stable,angle:document.querySelector('[data-ring-angle=middle]').value,zoom:U.treeZoom,
        blocked:!W.meta.allocated.has('node_110'),state:W.meta.ringRotations.middle};
    })()`);
    const about = (a,b,tol=.1) => assert.ok(Math.abs(a-b)<tol, `${a} vs ${b}`);
    const radius = p => Math.hypot(p[0]-3000,p[1]-3000);
    const angle = p => Math.atan2(p[1]-3000,p[0]-3000)*180/Math.PI;
    const turn = (a,b) => ((angle(b)-angle(a)+540)%360)-180;
    assert.ok(first.stable && first.blocked && first.ink > 0);
    assert.equal(first.state,8); assert.equal(first.angle,'320°'); assert.equal(first.zoom,1);
    about(radius(original.mid),radius(first.mid)); assert.ok(turn(original.mid,first.mid)<-5 && turn(original.mid,first.mid)>-39);
    about(turn(original.core,first.core),0); about(turn(original.outer,first.outer),0);
    assert.notEqual(first.peer,original.peer);

    // Keep the native ring paused at halfway and let the camera reveal finish.
    // Compare the actual presented pixels beneath this moving node.
    await js("Promise.all([...S.querySelectorAll('[data-star-reveal]')].map(a=>new Promise(r=>a.addEventListener('endEvent',r,{once:true})))).then(()=>true)");
    const region = await js(`(() => {
      const p=new DOMPoint(...pos('node_115')).matrixTransform(S.getScreenCTM());
      return {x:Math.round(p.x)-4,y:Math.round(p.y)-4,width:9,height:9};
    })()`);
    const pixels = async visible => {
      await js(`middleNodeSheet.style.visibility='${visible ? 'visible' : 'hidden'}'; new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(true))))`);
      return (await win.webContents.capturePage(region)).toBitmap();
    };
    const shown = await pixels(true), hidden = await pixels(false), restored = await pixels(true);
    assert.ok(shown.some((v,i) => i%4!==3 && Math.abs(v-hidden[i])>12 && Math.abs(v-restored[i])<8),
      'the painted ring node must appear at its intermediate screen position');
    assert.ok(await js(`(() => {
      const q=document.querySelector('#tree-search'); q.value='Ember Practice'; q.dispatchEvent(new Event('input'));
      const hit=[...U.passiveTreeDomCache.nodes.values()].some(n=>!n.circle.isConnected && n.circle.classList.contains('search-hit'));
      q.value=''; q.dispatchEvent(new Event('input')); return hit;
    })()`), 'search still resolves the retained nodes during a turn');
    // Retarget on the same frame, then let both native bands finish in real time.
    phase('reversing in motion');
    const reversed = await js(`(() => {
      btn('middle',1).click(); sampleTurn('middle',0);
      const p=pos('node_115');
      for (const layer of S.querySelectorAll('[data-star-band=middle]')) for (const a of layer.getAnimations()) a.play();
      btn('outer',1).click(); U.refreshTree(); return p;
    })()`);
    about(turn(first.mid,reversed),0,.2);
    await untilSettled();
    const final = await js("({mid:pos('node_115'),outer:pos(outerId),peer:peer()})");
    about(turn(original.mid,final.mid),0); about(turn(original.outer,final.outer),40); assert.equal(final.peer,original.peer);

    phase('measuring live overview motion');
    const travel = await js(`(async () => {
      const originalNode = node(outerId);
      const bearing = () => { const [x,y]=pos(outerId); return Math.atan2(y-3000,x-3000)*180/Math.PI; };
      const startAngle = bearing();
      const started = performance.now();
      btn('outer',-1).click();
      const issued = performance.now();
      const samples = new Set(), thirds = new Set(), times = [];
      while (S.classList.contains('turning-outer')) {
        await new Promise(requestAnimationFrame);
        const degrees = ((startAngle-bearing()+540)%360)-180;
        if (degrees>.2 && degrees<39.8) {
          samples.add(Math.round(degrees*10));
          thirds.add(Math.floor(degrees/(40/3)));
        }
        times.push(Math.round(performance.now() - issued));
      }
      return { intermediatePositions:samples.size, thirds:thirds.size, sameNode:originalNode===S.querySelector('[data-node="'+outerId+'"]'),
        issueMs:Math.round(issued-started), times };
    })()`);
    console.log('Live outer turn:',travel);
    assert.ok(travel.sameNode, 'the same interactive node must return when the ring settles');
    assert.equal(travel.thirds, 3, 'a live turn must show intermediate positions in every third of its arc');
    phase('checking the resocketed branch');
    win.webContents.debugger.attach('1.3');
    await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    const allocation = await js(`(() => {
      btn('middle',1).click();
      const reduced=!S.classList.contains('turning-middle') && !S.querySelector('[data-star-band=middle]').getAnimations().length;
      const rotated=peer(); const spend=id=>W.allocateNode(id,undefined,'strength');
      const walked=['node_110','node_81','node_114'].every(spend); U.refreshTree();
      const n=node(rotated), r=n.getBoundingClientRect(), x=r.x+r.width/2, y=r.y+r.height/2;
      const nearest=U.reachNode(S,'.tree-node',{target:S,clientX:x,clientY:y});
      const available=n.classList.contains('available');
      const allocated=spend(rotated); U.refreshTree();
      const b=btn('middle',1);
      const blocked=b.disabled && b.dataset.uiHint.includes('strand');
      const lit=seam().querySelector('.passive-route-face').getAttribute('stroke');
      const refunded=W.refundPassiveNode(rotated); U.refreshTree();
      return {reduced,rotated,walked,nearest:nearest?.dataset.node,available,allocated,blocked,lit,refunded,freed:!b.disabled};
    })()`);
    assert.ok(allocation.reduced && allocation.walked && allocation.available && allocation.allocated && allocation.blocked && allocation.refunded && allocation.freed);
    assert.equal(allocation.nearest,allocation.rotated); assert.equal(allocation.lit,'#d1b66b');
    phase('checking Font range');
    await js("W.player.pos.x+=1200; U.refreshInventory(true); void 0");
    assert.ok(await js("btn('outer',1).disabled && btn('outer',1).dataset.uiHint.includes('Font')"));
    await js("Object.assign(W.player.pos,W.fonts[0].pos); U.refreshInventory(true); void 0");
    assert.ok(await js("!btn('outer',1).disabled"));
    phase('reopening an aligned tree');
    await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[]});
    const reopened = await js(`(() => {
      W.meta.vocations.push('hierophant'); U.refreshTree();
      const mounted = document.querySelector('#tree-svg');
      btn('outer',1).click();
      const turnsWithVocation = mounted === document.querySelector('#tree-svg') && mounted.classList.contains('turning-outer');
      U.closeTree();
      W.meta.ringRotations = {middle:4,outer:5};
      U.toggleTree(); window.S = document.querySelector('#tree-svg');
      const q=document.querySelector('#tree-search'); q.value='Ember Practice'; q.dispatchEvent(new Event('input'));
      return {turnsWithVocation, moving:S.matches('.turning-outer,.turning-middle'), angle:document.querySelector('[data-ring-angle=outer]').value,
        search:S.classList.contains('tree-searching') && !!S.querySelector('.search-hit'), mid:pos('node_115')};
    })()`);
    assert.ok(reopened.turnsWithVocation && !reopened.moving && reopened.search);
    assert.equal(reopened.angle,'200°'); about(turn(original.mid,reopened.mid),160);
    console.log('PASS Astrolabe: actual arc, fixed bands, wrap and reversal, concurrent turns, focused control, reduced motion, seam targeting, refund and Font readiness.');
  } finally {
    clearTimeout(timer); win.destroy(); server.server.close();
  }
}).then(() => app.exit(0)).catch(error => { console.error(error); app.exit(1); });
