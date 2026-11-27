// node balance/debuff-coverage.cjs --mechanics
exports.entry = [
  "import {SKILLS as qaSkills} from './data/skills';",
  "import {makeSkillInstance as qaInstance} from './engine/skills';",
  "import {mod as qaMod} from './engine/stats';",
  "import {makeSimWorld as qaWorld} from './sim/arena';",
  "import {MECHANIC_BURSTS as bursts,MECHANIC_LINKS as links,MECHANIC_FIELDS as fields} from './data/mechanicVisuals';",
  "import {effectVoiceOf as voice} from './render/vis/effectVoice';",
  "import {drawMechanicField as field,drawMechanicLink as link,drawMechanicMarks as marks} from './render/vis/mechanicVisuals';",
  "import {MECHANIC_MARKS as markDefs} from './engine/mechanicMarks';",
  "window.mechanicInspection = {skills:qaSkills,instance:qaInstance,mod:qaMod,world:qaWorld,bursts,links,fields,voice,field,link,marks,markDefs};",
].join('\n');

exports.inspect = function inspectMechanics() {
  window.requestAnimationFrame=()=>0;
  __game.account().ledger.prologue_lived=1;
  __game.devStartRun('warrior'); __game.ui.hideAll(); __game.step(180); __game.hold(true);
  Object.defineProperty(performance,'now',{value:()=>4200,configurable:true});
  const r=__game.renderer, q=window.mechanicInspection;
  const game=document.getElementById('game'), failures=[];
  let w,p,foes,grant;
  const receipts=[];
  function begin(node) {
    grant=node;
    w=q.world('warrior',671); p=w.player;
    for(let i=0;i<80;i++) w.update(.1);
    for(let i=0;i<8;i++) r.render(w);
    w.actors=[p]; p.skills=[]; w.meta.baseAttrs.intelligence=120; w.meta.baseAttrs.strength=120;
    w.meta.allocated.add(node); w.recalcSeat(w.localSeat);
    p.sheet.setSource('inspection',[q.mod('accuracy','flat',1e6),q.mod('critChance','override',0)]);
    foes=[[75,10],[-74,24],[15,-83]].map(([dx,dy])=>{
      const foe=w.createMonster('zombie',1,'enemy');
      foe.pos={x:p.pos.x+dx,y:p.pos.y+dy}; foe.tier=p.tier; foe.brain=undefined; foe.spawnedAt=-30;
      foe.sheet.setSource('inspection',[q.mod('life','override',50000),q.mod('evasion','override',0)]);
      foe.fillResources(); w.actors.push(foe); return foe;
    });
  }
  const sheet=document.createElement('canvas'); sheet.width=720; sheet.height=810;
  const g=sheet.getContext('2d'); let count=0;
  const tile=document.createElement('canvas'); tile.width=360; tile.height=240;
  const c=tile.getContext('2d',{willReadFrequently:true});
  function capture(at,span) {
    r.render(w);
    const center=r.toScreen(at), width=span*r.zoom, height=width*tile.height/tile.width;
    c.drawImage(game,center.x-width/2,center.y-height/2,width,height,0,0,tile.width,tile.height);
    return c.getImageData(0,0,tile.width,tile.height).data;
  }
  function frame(at,span,label,enabled,verifySpans) {
    receipts.push({group:'Passive',id:grant,detail:label});
    const saved=w.flashes;
    w.flashes=saved.filter(f=>!enabled(f));
    if(w.flashes.length===saved.length) failures.push(label+' missing combat event');
    for (const f of saved.filter(enabled)) {
      const link=f.mechanicLink?.kind;
      const group=link?'Mechanic link':'Effect voice', id=link??f.fx;
      if (id && !receipts.some(row=>row.group===group && row.id===id))
        receipts.push({group,id,state:'Rendered',detail:label+' in a composed encounter frame'});
    }
    const before=capture(at,span);
    w.flashes=saved;
    const after=capture(at,span);
    function changes(cx,cy,radius) {
      let changed=0;
      for(let y=Math.max(0,Math.floor(cy-radius));y<Math.min(tile.height,cy+radius);y++)
        for(let x=Math.max(0,Math.floor(cx-radius));x<Math.min(tile.width,cx+radius);x++) {
          const i=4*(y*tile.width+x);
          if(Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2])>58) changed++;
        }
      return changed;
    }
    if(changes(180,120,118)<40) failures.push(label+' did not change the combat frame');
    for(const mid of verifySpans ?? []) {
      const x=180+(mid.x-at.x)*360/span, y=120+(mid.y-at.y)*360/span;
      if(changes(x,y,7)<3) failures.push(label+' missing pixels on a connected span');
    }
    const x=count%2*360,y=Math.floor(count/2)*270;
    g.drawImage(tile,x,y); g.fillStyle='#151c22';g.fillRect(x,y+240,360,30);
    g.font='14px Verdana';g.fillStyle='#f4e8d2';g.fillText(label,x+10,y+260);count++;
  }
  for(const [skillId,output,label] of [
    ['pyre_nova','cold','Triune Tempest · fire releases frost'],
    ['frost_nova','lightning','Triune Tempest · cold releases lightning'],
    ['thunderclap','fire','Triune Tempest · lightning kindles flame'],
  ]) {
    begin('exp_p14_int_omnitempest'); w.flashes=[];
    const cast=q.instance(q.skills[skillId]); p.skills=[cast]; p.mana=p.availableMaxMana();
    p.useLock=0; p.cooldowns.clear();
    if(!w.useSkill(p,cast,foes[0].pos,true)) throw Error('Skill press failed: '+skillId);
    const key='mechanic:triune_'+output;
    for(let i=0;i<90 && !w.flashes.some(f=>f.fx===key);i++) w.update(1/60);
    const effect=w.flashes.find(f=>f.fx===key); if(!effect) throw Error(skillId+' did not trigger '+key+'; caster at '+JSON.stringify(p.pos)+', targets '+JSON.stringify(foes.map(f=>[f.pos,f.life]))+', cooldown '+p.omniCascadeReadyAt+' at '+w.time);
    // Isolate the passive in the gallery after the native cast has actually landed.
    w.flashes=[effect]; effect.life=effect.maxLife*.83;
    frame(effect.pos,458,label,f=>f.fx===key);
  }
  begin('exp_p18_int_tractor_beams'); w.flashes=[];
  for(let i=0;i<7;i++) w.update(.1);
  const tether=f=>f.mechanicLink?.kind==='tractorTetherPower';
  const links=w.flashes.filter(tether);
  if(links.length!==3) failures.push('expected three latched targets, saw '+links.length);
  const midpoints=links.map(f=>{
    const target=w.actorById(f.mechanicLink.to);
    return {x:(p.pos.x+target.pos.x)/2,y:(p.pos.y+target.pos.y)/2};
  });
  frame(p.pos,285,'Tractor Tethers · three active connections',tether,midpoints);
  // Compare the two releases and their children against the identical crowd,
  // keeping the other skill and every enemy visible during each comparison.
  for (let i=0;i<8;i++) {
    const foe=w.createMonster('zombie',1,'enemy'), angle=2*Math.PI*i/8;
    foe.pos={x:p.pos.x+102*Math.cos(angle),y:p.pos.y+82*Math.sin(angle)};
    foe.tier=p.tier;foe.brain=undefined;foe.spawnedAt=-30;w.actors.push(foe);
  }
  function cast(id,at) {
    const inst=q.instance(q.skills[id]);
    if (!w.executeSkill(p,inst,at)) throw Error('Crowded cast failed for '+id);
  }
  const projectile=id=>s=>s.inst?.def.id===id;
  const discharge=f=>!!f.lightning?.discharge;
  function crowdFrame(label,checks) {
    const after=capture(p.pos,310);
    for (const [property,match] of checks) {
      const all=w[property];w[property]=all.filter(obj=>!match(obj));
      try {
        const before=capture(p.pos,310);let pixels=0;
        for (let i=0;i<after.length;i+=4)
          if (Math.abs(after[i]-before[i])+Math.abs(after[i+1]-before[i+1])+Math.abs(after[i+2]-before[i+2])>45) pixels++;
        if (all.length===w[property].length || pixels<8) failures.push(label+' lost a '+property+' layer in the crowd');
      } finally { w[property]=all; }
    }
    capture(p.pos,310);
    const x=count%2*360,y=Math.floor(count/2)*270;
    g.drawImage(tile,x,y);g.fillStyle='#151c22';g.fillRect(x,y+240,360,30);
    g.font='14px Verdana';g.fillStyle='#f4e8d2';g.fillText(label,x+10,y+260);count++;
  }
  cast('ball_lightning',foes[1].pos);
  for(let i=0;i<12;i++) w.update(1/60);
  cast('ice_spear',foes[0].pos);w.update(1/60);
  crowdFrame('Eleven enemies · Ice Spear and Ball Lightning',[
    ['projectiles',projectile('ice_spear')],['projectiles',projectile('ball_lightning')] ]);
  for(let i=0;i<50 && !(w.projectiles.some(projectile('glacial_shard')) && w.flashes.some(discharge));i++) w.update(1/60);
  crowdFrame('Same fight · shatter and electrical discharge',[
    ['projectiles',projectile('glacial_shard')],['flashes',discharge] ]);
  // Also exercise every native mechanic material in the browser canvas. The
  // full combat frames above independently test actor admission and dispatch.
  const swatch=document.createElement('canvas'); swatch.width=swatch.height=96;
  const ink=swatch.getContext('2d',{willReadFrequently:true}), at={x:48,y:48};
  function visible(id,paint) {
    ink.clearRect(0,0,96,96); ink.save(); paint(); ink.restore();
    const pixels=ink.getImageData(0,0,96,96).data; let painted=0;
    for(let i=3;i<pixels.length;i+=4) if(pixels[i]>32) painted++;
    if(painted<8) failures.push(id+' produced no readable material');
    count++;
  }
  for(const key of Object.keys(q.bursts)) visible(key,()=>q.voice('mechanic:'+key)(ink,
    {pos:at,radius:39,color:'#e09f71',life:.75,maxLife:1},.75));
  for(const [kind,def] of Object.entries(q.links)) visible(kind,()=>q.link(ink,kind,{x:6,y:28},{x:89,y:68},def.color,.7));
  for(const kind of Object.keys(q.fields)) visible(kind,()=>q.field(ink,{kind,pos:at,tier:0,remain:2,radius:35},2));
  for(const id of Object.keys(q.markDefs)) visible(id,()=>{
    ink.translate(48,48);q.marks(ink,[{id,stacks:2}],15,2);
  });
  return {samples:sheet.toDataURL(),count,failures,receipts,fatal:__game.crash().fatal};
};
