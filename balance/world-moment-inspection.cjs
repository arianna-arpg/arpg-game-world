// node balance/debuff-coverage.cjs --world
exports.entry = require('./mechanic-visual-inspection.cjs').entry + [
  "", "import { WORLD_MOMENTS } from './data/worldMoments';",
  "import { runAIActions } from './engine/aiActions';",
  "import { PUZZLE_KINDS } from './engine/puzzles';",
  "import { HARVEST_NODES } from './data/harvest';",
  "import { serializeSnapshot as worldQAEncode, applySnapshot as worldQADecode } from './net/snapshot';",
  "Object.assign(window.mechanicInspection,{WORLD_MOMENTS,runAIActions,PUZZLE_KINDS,HARVEST_NODES,serializeSnapshot:worldQAEncode,applySnapshot:worldQADecode});",
].join('\n');

exports.inspect = function inspectWorldMoments() {
  window.requestAnimationFrame = () => 0;
  __game.account().ledger.prologue_lived = 1;
  __game.devStartRun('warrior'); __game.ui.hideAll(); __game.step(120); __game.hold(true);
  const q = window.mechanicInspection, r = __game.renderer, original = r.ctx;
  const canvas = document.createElement('canvas'); canvas.width = 840; canvas.height = 384;
  const tile = document.createElement('canvas'); tile.width = 210; tile.height = 152;
  const c = tile.getContext('2d',{willReadFrequently:true}), sheet = canvas.getContext('2d');
  const failures = []; let samples = 0, panels = 0;
  function check(ok, message) { if (!ok) failures.push(message); }
  function frame(label, f, scale, body) {
    if (!f || !q.voice(f.fx)) throw Error(label + ' has no registered effect');
    c.resetTransform(); c.fillStyle='#263038'; c.fillRect(0,0,210,152);
    c.save(); c.translate(105,76); c.scale(scale,scale); c.translate(-f.pos.x,-f.pos.y);
    if (body) r.drawActor(body,w);
    r.drawFlash({...f,life:f.maxLife*.72}); c.restore();
    const x=panels%4*210,y=Math.floor(panels/4)*192;
    sheet.drawImage(tile,x,y); sheet.fillStyle='#111a21'; sheet.fillRect(x,y+152,210,40);
    sheet.font='14px Verdana'; sheet.fillStyle='#f2e9d9'; sheet.fillText(label,x+10,y+177);
    panels++;
  }
  const w = q.world('warrior', 5819), p = w.player, mirror = q.world('warrior', 5819);
  try {
    r.ctx = c;
    for (const [id, art] of Object.entries(q.WORLD_MOMENTS)) {
      const key='world:'+id;
      if (!q.voice(key)) throw Error('Missing painter '+key);
      for (const t of [1,.2]) {
        c.resetTransform(); c.clearRect(0,0,210,152);
        r.drawFlash({pos:{x:105,y:76},radius:54,color:'#dbbc8f',life:t,maxLife:1,fx:key,edgeFrac:art.kind==='rim' ? .94 : undefined});
        const d=c.getImageData(0,0,210,152).data; let ink=0, inside=0, rim=0;
        for(let i=3;i<d.length;i+=4) if(d[i]>32) {
          ink++; const n=(i-3)/4, distance=Math.hypot(n%210-105,Math.floor(n/210)-76);
          if(distance<47) inside++; if(distance>=51 && distance<=55) rim++;
        }
        check(ink>8,key+' missing ink at '+t);
        if(art.kind==='rim') check(rim>150 && inside===0,key+' lost its edge or obscured its safe centre');
        if(art.kind==='sign'||art.kind==='fleck') check(rim===0,key+' incorrectly painted a damage boundary');
      }
      samples++;
    }
    const a=w.createMonster('zombie',1,'enemy'); a.pos={x:p.pos.x+72,y:p.pos.y};
    a.spawnedAt=-30; a.tier=p.tier; a.brain=undefined; a.skills=[]; w.actors=[p,a]; w.flashes=[];
    const take=fx=>{ const f=w.flashes.find(f=>f.fx===fx); if(!f) throw Error('Missing native '+fx); return f; };
    a.burrow={phase:'emerge',t:.55,to:{...a.pos},speed:150,damageFrac:.01,emergeRadius:64,dustAcc:.1,color:'#d7b979'};
    w.stepBurrow(a,.01);
    const warning=take('world:burrowWarning'); check(warning.radius===64,'burrow hid part of its danger zone');
    frame('Burrow warning',warning,1);
    q.applySnapshot(mirror,q.serializeSnapshot(w,2));
    const remote=mirror.flashes.find(f=>f.fx===warning.fx);
    check(remote && remote.radius===64 && remote.recoveryCueTier===a.tier,'co-op lost the burrow footprint');
    w.flashes=[]; w.stepBurrow(a,.56);
    const blast=take('mechanic:burrowEruption');
    check(w.flashes.length===1 && blast.radius===64,'burrow produced a second or oversized blast');
    frame('Burrow eruption',blast,1);
    w.flashes=[]; w.executeSkill(p,q.instance(q.skills.hellshot_volley),a.pos);
    const scatter=take('world:storm_fire'); check(scatter.edgeFrac===.94,'scatter warning lost its clear centre');
    frame('Hellshot scatter boundary',scatter,64/scatter.radius);
    w.flashes=[]; a.fillResources(); q.runAIActions(w,a,[{do:'heal',frac:.2}]);
    check(!w.flashes.length,'a full-life heal showed a payout'); a.life*=.5;
    q.runAIActions(w,a,[{do:'heal',frac:.2}]); frame('Healing received',take('world:healed'),2,a);
    a.puzzleNode={idx:0}; const run={state:{phase:'answer',seq:[0,1],progress:0},nodes:[a]};
    w.flashes=[]; q.PUZZLE_KINDS.refrain.struck(run,a,w.puzzleHost());
    frame('Refrain answered',take('world:puzzleAnswer'),2);
    w.flashes=[]; q.PUZZLE_KINDS.refrain.struck(run,a,w.puzzleHost());
    frame('Refrain faltered',take('world:puzzleFalter'),2);
    for(const [id,label] of [['gloomcap','Gloomcap harvest'],['marrowheap','Marrowheap harvest']]){
      const def=q.HARVEST_NODES.find(n=>n.id===id), d={kind:def.kind,pos:{...a.pos},radius:20,tier:a.tier};
      w.harvestNodes=[{pos:d.pos,def,doodad:d,spent:true}]; w.doodads.push(d);
      const session={ix:0,held:false,seatId:w.localSeat.id,seq:[0],done:0,misses:1};
      w.harvestSessions=[session]; w.flashes=[]; w.harvestSettle(session,'expiry');
      const receipt=take(def.breakFx);
      check(w.flashes.filter(f=>f.fx===def.chipFx).length===3,id+' lost its harvest material');
      frame(label,receipt,2);
    }
    w.flashes=[]; w.collapseFloor([{x:a.pos.x,y:a.pos.y,r:37}],.5,undefined,true,1);
    const floor=take('world:floorWarning');
    check(floor.radius===37 && floor.recoveryCueTier===1,'collapsing floor warning disagreed with the hole');
    // A brand paints the bodies it actually injured, even with an overlapping upper floor.
    const field=q.world('warrior',914), source=field.createMonster('zombie',1,'enemy');
    const ally=field.createMonster('zombie',1,'enemy'), upper=field.createMonster('zombie',1,'enemy');
    for(const [idx,body] of [source,ally,upper].entries()) {
      body.pos={x:field.player.pos.x+64+idx*8,y:field.player.pos.y}; body.spawnedAt=-30;
      body.tier=field.player.tier+(body===upper?1:0); body.brain=undefined; body.skills=[]; body.anchored=true;
      body.sheet.setSource('inspection',[q.mod('life','override',10000)]); body.fillResources();
    }
    field.actors=[field.player,source,ally,upper]; source.applyStatus('fulgur_brand',0,1,'inspection');
    source.statuses.find(s=>s.id==='fulgur_brand').zapAt=field.time;
    const hp=upper.life; field.update(.01);
    const arcs=field.flashes.filter(f=>f.mechanicLink?.kind==='fulgurArc');
    check(arcs.length===1 && arcs[0].mechanicLink.to===ally.id && ally.life<ally.maxLife() && upper.life===hp,
      'Fulgurweb disagreed with its victims or floor');
    return {count:samples+panels,samples:canvas.toDataURL(),failures,fatal:__game.crash().fatal};
  } finally { r.ctx=original; }
};
