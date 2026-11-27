// Browser-only QA. Evidence comes from world releases and the live compositor.
import { arena, prepareSkill } from './skillVisualFixture';
import { combinedEncounters } from './targetEncounterFollowups.mjs';
import { passiveLoadout, extendedLoadout } from './passiveEncounterLoadouts.mjs';
import { SKILLS } from '../src/data/skills';
import { PASSIVE_NODES } from '../src/data/passives';
import { CHOICE_GROUPS } from '../src/data/passiveChoices';
import { PROCS } from '../src/data/procs';
import { FACTIONS, MONSTERS } from '../src/data/monsters';
import { STATUS_DEFS } from '../src/engine/status';
import { statusVoiceOf } from '../src/engine/statusVoice';
import { resetStatusVoices } from '../src/render/vis/statusVoiceLayer';
import { effectVoiceOf, registerEffectVoice } from '../src/render/vis/effectVoice';
import { presenceProfile } from '../src/data/skillPresenceVisuals';
import { skillRiteVoice, skillRiteProfile, skillTargetProfile } from '../src/data/skillTargetVisuals';
import { WORLD_MOMENTS } from '../src/data/worldMoments';
import { deathBurstVoice, MECHANIC_BURSTS } from '../src/data/mechanicVisuals';
import { selfProfile } from '../src/data/skillSelfVisuals';
import { skillStrikeProfile } from '../src/data/skillStrikeVisuals';
import { movementProfile } from '../src/data/skillMovementVisuals';
import { fieldProfile } from '../src/data/skillAreaVisuals';
import { GridWalkField } from '../src/world/gridWalk';
import { doodadRuleKinds, doodadRuleOf } from '../src/engine/levelgen';
import { runAIActions } from '../src/engine/aiActions';
import { updateAI } from '../src/engine/ai';
import { makeSkillInstance, skillContextTags } from '../src/engine/skills';
import { SUPPORTS } from '../src/data/supports';
import { HARVEST_NODES } from '../src/data/harvest';
import { PUZZLE_KINDS } from '../src/engine/puzzles';
import { PUZZLES } from '../src/data/puzzles';
import { SHRINES, ALTARS } from '../src/data/shrines';
import { INCURSION_ARCHETYPES } from '../src/packages/overlays/incursion';
import { ODYSSEY_RISINGS } from '../src/data/odysseyRisings';
import { BURIAL_GROUND } from '../src/data/summonPacts';
import { eventsTab } from '../src/dev/tabs/events';
import { World } from '../src/engine/world';
import { classById } from '../src/sim/arena';
import { makeAccount } from '../src/meta/account';
import { PACKAGES } from '../src/packages/registry';
import { buildManifest } from '../src/packages/manifest';
import { mod, STAT_DEFS, StatSheet } from '../src/engine/stats';
import { seedGlobalRandom } from '../src/sim/rng';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { buffRows } from '../src/engine/buffPresentation';
import { procCueRows } from '../src/engine/procCues';
import { drawBuffTile } from '../src/render/vis/buffIcons';
import { drawProcHud } from '../src/render/vis/procCueLayer';

const rows=new Map(), voices=new Map(), choices=new Map(), ownSkills=new Map();
let renderer, references, tile;
const key=(group,id)=>group+'/'+id;
const allSkills=()=>Object.values(SKILLS);
const artSamples=new WeakSet();
const array=v=>v==null?[]:Array.isArray(v)?v:[v];
function result(group,id,state,detail,name) {
  const row=rows.get(key(group,id));
  if (row) Object.assign(row,{state,detail,name:name??row.name});
}
function pixels(a,b) {
  let count=0;
  for (let i=0;i<a.length;i+=4)
    if ((b?Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]):a[i+3])>28) count++;
  return count;
}
function hudArt(row,isProc=false) {
  tile.clearRect(0,0,160,100);
  if (isProc) drawProcHud(tile,[row],80,42); else drawBuffTile(tile,row,{x:55,y:20,w:42,h:42});
  return pixels(tile.getImageData(0,0,160,100).data)>=8;
}
// Read immediately before and after this exact object's terrain-clipped draw
// inside the game frame. A neighbour, caster animation or damage number
// cannot satisfy the comparison. Preserve the game's clock and random stream.
function witness(w,f) {
  if (!(f.radius>0) || artSamples.has(f)) return 0;
  const prior=renderer.drawTerrainFlash, focus=renderer.directorFocus, mode=renderer.worldOnly;
  const publish=w.publishViewFrame,confine=w.couchConfine;
  let changed=0;
  renderer.directorFocus=f.pos;renderer.worldOnly=true;
  renderer.drawTerrainFlash=function(obj,world) {
    if (obj!==f) return prior.call(this,obj,world);
    const c=this.ctx, pos=this.toScreen(f.pos), width=Math.min(280,c.canvas.width), height=Math.min(240,c.canvas.height);
    const x=Math.max(0,Math.min(c.canvas.width-width,Math.round(pos.x-width/2)));
    const y=Math.max(0,Math.min(c.canvas.height-height,Math.round(pos.y-height/2)));
    const before=c.getImageData(x,y,width,height).data;
    prior.call(this,obj,world);
    changed=pixels(c.getImageData(x,y,width,height).data,before);
  };
  const restore=seedGlobalRandom(180);
  // Link flashes draw directly between living actors and skip drawTerrainFlash.
  // Bracket the renderer's visit to the exact emitted link in the flash list.
  const flashes=w.flashes, iter=flashes[Symbol.iterator];
  if(f.mechanicLink||f.lightning){
    flashes[Symbol.iterator]=function*(){
      for(const item of iter.call(this)){
        if(item!==f){yield item;continue;}
        const c=renderer.ctx,at=renderer.toScreen(f.pos),sw=Math.min(280,c.canvas.width),sh=Math.min(240,c.canvas.height);
        const x=Math.max(0,Math.min(c.canvas.width-sw,Math.round(at.x-sw/2))),y=Math.max(0,Math.min(c.canvas.height-sh,Math.round(at.y-sh/2)));
        const before=c.getImageData(x,y,sw,sh).data;yield item;
        changed=Math.max(changed,pixels(c.getImageData(x,y,sw,sh).data,before));
      }
    };
  }
  // A QA camera may inspect a distant source. Its view must never grant a
  // camera-dependent combat bonus or move the usable viewport for one trial.
  w.publishViewFrame=()=>{};
  try {renderer.render(w);} finally {if(f.mechanicLink||f.lightning)delete flashes[Symbol.iterator];restore();w.publishViewFrame=publish;w.couchConfine=confine;renderer.worldOnly=mode;renderer.directorFocus=focus;renderer.drawTerrainFlash=prior;}
  if (changed>=8) artSamples.add(f);
  return changed;
}
function collect(w,label,configured=false) {
  for (const f of w.flashes) {
    const row=voices.get(f.fx);
    if (!row || ['Combat frame','Encounter replay'].includes(row.state) || (configured && ['Configured encounter','Shared combat phase'].includes(row.state))) continue;
    let n=witness(w,f),sampled=false;
    if(n<8 && (!row.state||row.state==='Owner unobserved') && f.maxLife>0 && f.life===f.maxLife){
      const life=f.life;
      try{f.life=life*.72;n=witness(w,f);sampled=n>=8;}finally{f.life=life;artSamples.delete(f);}
    }
    if (n>=8) {
      row.state=configured?'Configured encounter':sampled?'Emitted animation':'Combat frame';
      row.detail=label+' · '+n+' pixels changed when the game drew this effect.'+(sampled?' The real event was captured at emission and sampled 28% into its animation.':'');
    }
  }
}
function ticks(w,n,label,step=.1) {
  for(let i=0;i<n;i++){w.update(step);collect(w,label);}
}
function targetedSkill(id) {
  const def=SKILLS[id], list=ownSkills.get(id);
  if (!def) throw Error('Missing skill '+id);
  const {w,p,enemy,ally,inst,target}=prepareSkill(def);
  const label=def.name+' · native '+def.delivery.type;
  const before=new Set(w.actors);
  p.sheet.setSource('encounter-fixture',[mod('accuracy','flat',1e6)]);
  if (def.delivery.type==='carom') {w.doodads.push({kind:'rock',radius:26,pos:{x:790,y:700}});w.markDoodadsChanged();}
  if (def.targeting?.target==='minion') ally.owner=p;
  // A second enemy allows target splashes, kills, and chains to resolve.
  const other=w.createMonster('zombie',1,'enemy');other.brain=undefined;other.spawnedAt=-30;other.tier=enemy.tier;other.pos={x:enemy.pos.x+60,y:enemy.pos.y-20};w.actors.push(other);
  const cast=()=>w.executeSkill(p,inst,target.pos,{targetInfo:def.targeting?w.resolveTargeting(p,inst,target.pos)??undefined:undefined});
  if(def.delivery.onGround?.length){const grid=new GridWalkField(w.arena.w,w.arena.h,32);grid.fillRegion(0,0,w.arena.w,w.arena.h,def.delivery.onGround[0]);w.walk=grid;}
  if(def.delivery.splash) {p.sheet.setSource('additional-target',[mod('multiTarget','flat',1)]);for(const sid of array(def.targeting?.requiresStatus)) other.applyStatus(sid,1,2,'fixture');}
  const used=cast();collect(w,label+' release');
  if(def.delivery.type==='construct') {
    const d=def.delivery,body=w.actors.find(a=>a.presenceBadge?.skillId===id&&!a.dead);
    if(body && (d.castOnStruck || d.kind==='bell')){w.strikeSurfaces(p,body.pos,28);collect(w,label+' · owner strikes the bell');}
    if(body && (d.propel||d.kind==='gate'||d.kind==='pad')){
      if(!d.propel)w.executeSkill(p,inst,{x:body.pos.x+110,y:body.pos.y});
      p.pos={...body.pos};p.tier=body.tier;ticks(w,32,label+' · owner steps onto the placed device',.125);
    }
  }
  if(def.delivery.type==='carom')ticks(w,Math.ceil((def.delivery.duration+.4)/.1),label+' · ride reaches its full duration');
  if(def.delivery.type==='construct' && list.some(row=>row.id==='skillPresence:break:'+id && !row.state)) {
    const rig=prepareSkill(def);rig.enemy.pos.x+=320;
    rig.w.executeSkill(rig.p,rig.inst,rig.p.pos);
    const body=rig.w.actors.find(a=>!a.dead && a.presenceBadge?.skillId===id);
    if(body){rig.w.kill(body,false,rig.enemy);collect(rig.w,label+' · enemy destroys the construct before it activates');}
  }
  if(def.delivery.type==='summon' && def.delivery.persistent?.toggle && p.summonToggles.has(id)) {
    ticks(w,4,label+' · contract forms');
    if(w.useSkill(p,inst,target.pos,true)){collect(w,label+' · player dismisses the active summon contract');cast();}
  }
  if(def.delivery.type==='storm' && w.zones.length) {
    // Storm arrivals are drawn by drawZones and the end of a short strike is
    // carried by its impact painter. Early zone retirement can emit its own flash.
    const zone=w.zones[0], prior=renderer.drawZones;
    let visible=false,last;
    renderer.drawZones=function(world) {
      if(world!==w) return prior.call(this,world);
      const all=w.zones;w.zones=[zone];
      try {
        const c=this.ctx,at=this.toScreen(zone.pos),x=Math.max(0,Math.min(c.canvas.width-160,Math.floor(at.x-80))),y=Math.max(0,Math.min(c.canvas.height-160,Math.floor(at.y-80)));
        const a=c.getImageData(x,y,160,160).data;prior.call(this,world);
        const b=c.getImageData(x,y,160,160).data;visible=pixels(b,a)>=8;
        if(zone.onGround)last=Uint8ClampedArray.from(b,(value,i)=>i%4===3?255:Math.abs(value-a[i]));
      } finally {w.zones=all;}
    };
    const restore=seedGlobalRandom(830);
    let wetDifference=0;
    const wet=w.walk;
    try{
      renderer.render(w);
      if(zone.onGround && wet instanceof GridWalkField && last){
        const wetFrame=last;w.walk=new GridWalkField(w.arena.w,w.arena.h,32);
        renderer.render(w);wetDifference=pixels(wetFrame,last);
      }
    } finally{w.walk=wet;restore();renderer.drawZones=prior;}
    const arrive=voices.get('skillPresence:arrive:'+id);
    if(arrive && visible && !zone.onGround?.length) Object.assign(arrive,{state:'Shared combat phase',detail:label+' · the armed strike painted its arrival through the storm field, using the same arrival glyph as the registered alternative.'});
    if(arrive && wetDifference>=8)Object.assign(arrive,{state:'Ground warning',detail:label+' · changing the registered wet cells to dry ground changed '+wetDifference+' pixels in the native warning layer. The arrival glyph follows the wet-cell mask before impact.'});
    w.retireOwnedZone(zone);collect(w,label+' · still-armed strike retired');
    if(!w.zones.length)cast();
  }
  ticks(w,16,label+' in flight or on arrival');
  const bodies=w.actors.filter(a=>!before.has(a)&&a!==other&&!a.dead);
  for (const a of bodies) {
    for (const s of a.skills??[]) if (s && !a.dead) {w.executeSkill(a,s,enemy.pos);collect(w,label+' · summoned body uses '+s.def.name);}
  }
  if (bodies.length) {
    w.kill(bodies[0],false,enemy);collect(w,label+' · summoned body defeated');
    cast();collect(w,label+' · replacement');
    const keeper=w.actors.find(a=>a!==other&&!before.has(a)&&!a.dead);
    if (keeper?.lifespan>0) {keeper.lifespan=.05;ticks(w,2,label+' · timed body expired');}
  }
  if (def.delivery.type==='storm') {
    for (const z of [...w.zones]) {w.expireZone(z);collect(w,label+' · field retired');}
  }
  if (def.delivery.type==='detonate' || def.delivery.type==='detonateProjectile' || def.delivery.type==='blink' || def.delivery.type==='mark') {
    cast();collect(w,label+' · second release');ticks(w,8,label+' · follow-up');
  }
  if(def.tags.includes('movement') && list.some(row=>row.id==='skillMove:impact:'+id && row.state!=='Combat frame')) {
    const rig=prepareSkill(def);rig.inst.sockets[0]={def:SUPPORTS.dive_bomb,level:1};
    rig.w.executeSkill(rig.p,rig.inst,rig.target.pos,{targetInfo:def.targeting?rig.w.resolveTargeting(rig.p,rig.inst,rig.target.pos)??undefined:undefined});
    collect(rig.w,def.name+' · Dive Bomb adds a departure and arrival blast',true);
    for(let i=0;i<16;i++){rig.w.update(.1);collect(rig.w,def.name+' · Dive Bomb landing',true);}
  }
  const control=list.find(row=>row.id.startsWith('skillFieldImpact:'));
  if (control && control.state!=='Combat frame') {
    const {w:field,p:hero,enemy:owner}=arena();
    runAIActions(field,owner,[{do:'attackPattern',skill:id,at:'target',pattern:{radius:46,delay:.22,points:[{x:0,y:0}]}}],hero);
    if (!field.zones.some(z=>z.inst.def.id===id) || field.flashes.some(f=>f.fx===control.id)) throw Error('Invalid delayed attack-pattern control '+id);
    for(let i=0;i<8;i++){field.update(.06);collect(field,def.name+' · configured enemy pattern, delayed impact',true);}
    // These are valid encounter configurations. An authored encounter needs its
    // own receipt before it can take precedence over this fixture.
    if (control.state==='Configured encounter') control.detail+=' The pattern assigned this skill as its payload.';
  }
  const emitted=[...new Set(w.flashes.map(f=>f.fx).filter(Boolean))].slice(0,6);
  for (const row of list) if (!row.state) {
    const d=def.delivery,[family,phase]=row.id.split(':');
    let reason;
    if (family==='skillMove' && ((phase==='bank'&&d.type!=='carom') || (phase==='wait'&&!(d.type==='blink'&&d.delay)) ||
        (phase==='arrive'&&d.type==='leap')))
      reason='The '+d.type+' delivery has no native '+phase+' phase.';
    if (family==='skillTargetSplash' && !d.splash) reason='This skill has no authored target splash radius.';
    if (family==='skillStrike' && d.fx) reason='The skill explicitly requests '+d.fx+' for this strike.';
    if (family==='skillSelf') {
      const effects=def.effects.map(f=>f.type);
      if(phase==='release' && (skillRiteVoice(id)||effects.some(e=>['detonateMinions','shatterConstructs'].includes(e))))
        reason='Release feedback belongs to the paid rite or the destroyed body.';
      if(phase==='release' && (def.pool?.release.mode==='burst'||d.type==='detonateProjectile'))
        reason='Release is the source-specific area burst. This delivery emits no additional self-release glyph.';
      if(phase==='burst' && (def.pool?.release.mode==='vent'||d.type==='detonate'))
        reason=d.type==='detonate'?'The command cues the arming of each mine. The mine owns the later explosion.':'This reservoir vents continuously through its aura after the release. It has no instantaneous area burst.';
      if (phase==='prepare'&&d.type!=='detonate') reason='Preparation is emitted when arming a mine detonation. This delivery is '+d.type+'.';
      if (['depart','recall'].includes(phase) && !['markRecall','blink','recall'].includes(d.type) && !effects.includes('recallMinions'))
        reason='This phase belongs to a relocation. The tested release did not relocate a body using this skill as its source.';
      if (phase==='burst' && !def.pool?.release && !['detonateProjectile','detonate','markRecall'].includes(d.type) &&
          !effects.some(e=>['detonateMinions','shatterConstructs'].includes(e)) && id!=='iron_ward')
        reason='This release has no authored stored-area or destructive payload requesting a self burst.';
    }
    if (family==='skillPresence' && phase==='break' && d.type==='storm') reason='A storm retires as a field and has no summoned body to kill.';
    if(family==='skillPresence' && phase==='expire' && d.type==='summon' && !d.duration && bodies.length && bodies.every(a=>!(a.lifespan>0)))
      reason='The summoned companion has no lifetime on this grant. Its defeat was tested separately.';
    if(family==='skillPresence' && phase==='pulse' && d.type==='construct' && ['barrier','pod','tree','pylon','totem'].includes(d.kind)
       && !d.skill && !d.skillId && !d.aura?.pulse && bodies.length && bodies.every(a=>!a.skills?.some(Boolean))) {
      reason='The native '+d.kind+' has no cast or pulsing aura to produce this glyph. Its '+(d.hatch?'hatch':d.healBurst?'healing burst':d.aura?'continuous aura':d.taunt?'taunt':'placement and break')+' is a separate interaction.';
    }
    if(family==='skillTarget' && def.targeting?.target==='corpse' && skillRiteVoice(id)) reason='The consumed corpse uses the rite-specific release.';
    row.state=reason?'Alternate art':'Owner unobserved';
    row.detail=label+' · '+(used?'release accepted':'release refused')+'. '+(reason??'The exact phase did not appear in this encounter.')+(emitted.length?' Other late events: '+emitted.join(', ')+'.':'');
  }
}
const priority=['cleave','firebolt','frostbolt','ball_lightning','venom_bolt','snipe','skeleton_warrior','war_cry','frost_storm','flame_totem','crushing_leap'];
const skillTags=new WeakMap();
function tagsFor(s) {
  if(!skillTags.has(s)) skillTags.set(s,new Set([...skillContextTags(s),...Object.keys(s.baseDamage??{})]));
  return skillTags.get(s);
}
const skillChoices=new Map();
function selectSkill(tags,proc,mods) {
  if (proc?.skills?.some(id=>SKILLS[id])) return proc.skills.find(id=>SKILLS[id]);
  const names=mods.map(m=>m.stat).join(' ');
  const prefer=/minion|summon|companion/i.test(names)?'summon':/projectile|arrow|reload/i.test(names)?'projectile':/castSpeed/i.test(names)?'spell':/attackSpeed/i.test(names)?'attack':undefined;
  const required=proc?.tags??[],wanted=[...new Set([...tags,...(prefer?[prefer]:[])])].sort();
  const key=JSON.stringify([wanted,required]);
  if (!skillChoices.has(key)) {
    const shortlist=[...priority.map(id=>SKILLS[id]).filter(Boolean),...allSkills()];
    let best=shortlist[0],score=-Infinity;
    for(const s of shortlist) {
      if (s.targeting?.target==='corpse'||s.delivery.type==='detonate') continue;
      const have=tagsFor(s),value=required.reduce((n,t)=>n+Number(have.has(t)),0)*100+wanted.reduce((n,t)=>n+Number(have.has(t)),0);
      if (value>score){score=value;best=s;}
    }
    skillChoices.set(key,best.id);
  }
  return skillChoices.get(key);
}
function pickGrant(group,id) {
  if(group==='Passive choice') {
    const [g,opt]=id.split('/'), node=choices.get(g);
    return {node,option:CHOICE_GROUPS[g].options.find(x=>x.id===opt)};
  }
  return {node:PASSIVE_NODES[id]};
}
const round=n=>Number(n.toFixed(4));
function passiveFight(node,option,active,extended=false) {
  const grant=option??node, mods=grant.mods??[], stats=new Set(mods.map(m=>m.stat));
  const procDefs=mods.map(m=>PROCS[m.stat.replace(/^proc_/,'')]).filter((p,i)=>p&&mods[i].stat.startsWith('proc_'));
  const proc=procDefs[0];
  const id=selectSkill(mods.flatMap(m=>m.tags??[]),proc,mods);
  const {w,p,enemy,ally}=arena();
  w.meta.allocated.delete(node.id);delete w.meta.choices[node.id];
  if(extended)for(const attr of Object.keys(w.meta.baseAttrs))w.meta.baseAttrs[attr]=Math.max(90,w.meta.baseAttrs[attr]);
  if (option||active) w.meta.allocated.add(node.id);
  if (active&&option) w.meta.choices[node.id]=[option.id];
  // Leave pools and mitigation uncapped so a +life or +armor grant can be
  // measured. Match the two runs down to resources, setup and random draws.
  p.sheet.removeSource('visual-course');
  p.sheet.setSource('trial-equipment',[mod('armor','flat',20),mod('energyShield','flat',6),mod('evasion','flat',10)]);
  const links=[...new Set(mods.map(m=>m.fromStat).filter(Boolean))];
  if(links.length)p.sheet.setSource('trial-investment',links.map(stat=>mod(stat,'flat',Math.max(1,(STAT_DEFS[stat]?.base??0)*.25))));
  w.recalcSeat(w.localSeat);p.fillResources();
  enemy.pos={x:p.pos.x+42,y:p.pos.y};enemy.spawnedAt=-20;
  const element=['fire','cold','lightning','chaos'].find(k=>mods.some(m=>m.stat===k+'Res'||m.stat===k+'ResMax'));
  const skill=makeSkillInstance(SKILLS[id]), incoming=makeSkillInstance(SKILLS[{fire:'firebolt',cold:'frostbolt',lightning:'ball_lightning',chaos:'venom_bolt'}[element]??'cleave']);
  p.skills=[skill];enemy.skills=[incoming];ally.brain=undefined;
  if(proc?.effect.type==='arc') {
    const next=w.createMonster('zombie',1,'enemy');next.pos={x:enemy.pos.x+19,y:enemy.pos.y+8};next.brain=undefined;w.actors.push(next);
  }
  if(proc?.effect.type==='cooldown') for(const def of allSkills().filter(s=>(!proc.effect.skills||proc.effect.skills.includes(s.id))&&(proc.effect.tags??[]).every(t=>tagsFor(s).has(t))).slice(0,5)) {
    if(def.id!==id)p.skills.push(makeSkillInstance(def));p.cooldowns.set(def.id,14);
  }
  const read=new Map(), result={name:grant.name,id,incoming:incoming.def.name,read,procs:new Set(),gated:new Set(),feedback:new Set(),cues:new Set(),hud:new Set(),numbers:{},sheet:{},source:0};
  const rowsAtStart=p.sheet.getSourceMods('passives')??[];
  result.source=mods.filter(m=>rowsAtStart.includes(m)).length;
  for(const m of mods) result.sheet[m.stat]=round(p.sheet.get(m.stat,new Set(m.tags??[])));
  const oldGet=p.sheet.get, oldProc=w.executeProc;
  let phase='release',observing=false,gated=false;
  p.sheet.get=function(stat,tags,extra,base) {
    const value=oldGet.call(this,stat,tags,extra,base);
    if(!observing&&stats.has(stat)) {
      const k=phase+' / '+stat+' ['+[...(tags??[])].sort().join(',')+']';
      const v=round(value);
      if(!read.has(k)) read.set(k,v);
      if(extended){
        const lo=k+' / minimum',hi=k+' / maximum';
        read.set(lo,Math.min(read.get(lo)??v,v));read.set(hi,Math.max(read.get(hi)??v,v));
      }
    }
    return value;
  };
  w.executeProc=function(def,owner,...args) {
    if(owner!==p || !procDefs.some(x=>x.id===def.id)) return oldProc.call(this,def,owner,...args);
    (gated?result.gated:result.procs).add(def.id);
    const before=w.flashes.length, previous=new Map(p.cooldowns), returned=oldProc.call(this,def,owner,...args);
    observing=true;
    try {
      for(const f of w.flashes.slice(before)) {
        const label=f.mechanicLink?.kind??f.fx??(f.lightning?'lightning discharge':undefined);
        if(label&&!result.feedback.has(label)&&witness(w,f)>=8)result.feedback.add(label);
      }
      for(const q of procCueRows(p))if(q.id===def.id && hudArt(q,true))result.feedback.add('hotbar '+q.id);
      for(const [key,v] of previous) if((p.cooldowns.get(key)??0)<v) result.feedback.add('cooldown reduced on '+(SKILLS[key]?.name??key));
    }finally{observing=false;}
    return returned;
  };
  function watch() {
    observing=true;
    try{
    for(const f of w.flashes) if(f.fx) result.cues.add(f.fx);
    if (active) collect(w,grant.name+' · '+phase);
    for(const row of buffRows(p)) {
      if (!result.hud.has(row.label) && hudArt(row)) result.hud.add(row.label);
    }
    for(const q of procCueRows(p)) if (!result.hud.has(q.id) && hudArt(q,true)) result.hud.add(q.id);
    }finally{observing=false;}
  }
  const restore=seedGlobalRandom(8491);
  try {
    if(extended){
      phase='equipped sequence';
      extendedLoadout(w,p,enemy,ally,stats,mods,(label,n)=>{if(Number.isFinite(n))result.numbers[label]=round(n);},watch);
      return result;
    }
    // Both trials receive the same prerequisites. Native event producers
    // decide whether the grant fires and whether it makes an effect.
    const playerStatus=array(proc?.requireStatus)[0], requiredBuff=array(proc?.requireBuff)[0];
    if (playerStatus && STATUS_DEFS[playerStatus]) p.applyStatus(playerStatus,0,1,'fixture');
    if (requiredBuff) p.addBuff({id:requiredBuff,type:'buff',duration:10,mods:[]});
    for(const vs of array(proc?.vs)) {
      const sid=({wet:'soaked',hardCC:'stun',afflicted:'burn'})[vs]??vs;
      if(STATUS_DEFS[sid])enemy.applyStatus(sid,1,2,'fixture');
      if(vs==='airborne')enemy.flying=true;
      if(vs==='lowLife')enemy.life=enemy.maxLife()*.18;
    }
    const victimStatus=mods.flatMap(m=>m.tags??[]).filter(tag=>tag.startsWith('vs:')).map(tag=>tag.slice(3));
    for(const status of victimStatus) if(STATUS_DEFS[status]) enemy.applyStatus(status,1,2,'fixture');
    if(proc?.when==='lowLife' || proc?.condition==='lowLife') p.life=p.maxLife()*.25;
    if(proc?.crit || proc?.noCrit) p.sheet.setSource('trial-critical',[mod('critChance','override',proc.crit?1:0)]);
    if(proc?.trigger==='block'||proc?.trigger==='evade')
      p.sheet.setSource('trial-defense',[mod(proc.trigger==='block'?'blockChance':'evasion','override',proc.trigger==='block'?1:1e5)]);
    if(proc?.trigger==='esBreak'||proc?.trigger==='esFilled') {p.sheet.setSource('trial-es',[mod('energyShield','flat',12)]);p.es=proc.trigger==='esFilled'?10:3;}
    if(proc?.trigger==='poiseBroken'||proc?.trigger==='poiseBracket') {p.sheet.setSource('trial-poise',[mod('poise','flat',10)]);p.poise=4;}
    result.numbers['life capacity']=round(p.maxLife());result.numbers['mana capacity']=round(p.maxMana());
    result.numbers['energy shield capacity']=round(p.maxEs());
    const origin={...p.pos};w.moveActor(p,1,0,.12);result.numbers['distance walked']=round(Math.hypot(p.pos.x-origin.x,p.pos.y-origin.y));p.pos=origin;
    p.life=Math.max(1,p.life*.82);p.mana=Math.max(1,p.mana*.75);
    const conditions=new Set(mods.map(m=>m.when));
    if(conditions.has('lowLife'))p.life=p.maxLife()*.18;
    if(conditions.has('lowMana'))p.mana=p.maxMana()*.18;
    if(conditions.has('fullLife'))p.life=p.maxLife();
    if(conditions.has('fullMana'))p.mana=p.maxMana();
    if(conditions.has('hasWard'))p.gainWard(12);
    if(conditions.has('lowEs'))p.es=1;
    for(const m of mods)if(m.gauge?.startsWith('charge:'))p.gainCharge(m.gauge.slice(7),m.gaugeAt??2,8);
    p.refreshConditions();
    const startLife=enemy.life;
    phase='skill press';
    if(w.useSkill(p,skill,enemy.pos,true)){
      result.numbers['cast lock (s)']=round(p.useLock);result.numbers['cast duration (s)']=round(p.casting?.total??0);
      watch();for(let i=0;i<5;i++){w.update(.12);watch();}
    }
    for(let n=0;n<(proc?5:1);n++){
      phase='outgoing';w.executeSkill(p,skill,enemy.pos);watch();
      const shot=w.projectiles.find(s=>s.inst?.def.id===id);
      if(shot){result.numbers['projectile speed']=round(shot.speed);result.numbers['projectile radius']=round(shot.radius);}
      const field=w.zones.find(z=>z.inst.def.id===id);if(field)result.numbers['area radius']=round(field.radius);
      phase='impact';for(let i=0;i<4;i++){w.update(.1);watch();}
      if (proc?.trigger==='kill' && n===2 && !enemy.dead) {
        enemy.life=1;for(const sid of array(proc.vs))if(STATUS_DEFS[sid])enemy.applyStatus(sid,0,4,'fixture');
        w.resolveHit(p,makeSkillInstance(SKILLS.cleave),enemy);watch();
      }
    }
    result.numbers['damage dealt']=round(startLife-enemy.life);
    result.numbers['summoned allies']=w.actors.filter(a=>a.owner===p&&!a.dead).length;
    result.numbers['remaining mana']=round(p.mana);
    if(!proc && !p.dead && !enemy.dead) {
      const hasAny=(...names)=>names.some(s=>stats.has(s));
      if(hasAny('lifeRegenPct','esRechargeRate','esRechargeDelay')||grant.conduit||hasAny('guardStrength','guardMend','guardAegis')){
        phase='resource recovery under guard';
        // Percentage increases need an independently supplied base. Injure
        // both trials equally, then follow the actual resource ticks.
        p.sheet.setSource('trial-defense',[mod('poise','flat',45),mod('lifeRegenPct','flat',.02)]);
        p.fillResources();p.es=0;p.esDelay=0;p.life=p.maxLife()*.55;p.poise=p.maxPoise()*.7;
        const guard=makeSkillInstance(SKILLS.shield_up);p.skills.push(guard);p.useLock=0;p.casting=null;
        w.useSkill(p,guard,enemy.pos,true);
        if(p.casting?.mode==='guard')p.casting.shield=p.casting.maxShield*.4;
        for(let i=0;i<8;i++){if(p.casting?.mode==='guard')p.casting.held=true;w.update(.12);watch();}
        result.numbers['shield while guarding']=round(p.casting?.shield??0);
        result.numbers['recharged energy shield']=round(p.es);result.numbers['recovering life']=round(p.life);
        result.numbers['poise after maintaining guard']=round(p.poise);result.numbers['mana after maintaining guard']=round(p.mana);
      }
      if(hasAny('wriggle','gripPower','impactDamage','shoveAuthority')){
        phase='grappling and heavy contact';
        const leverage=['wriggle','gripPower','impactDamage','shoveAuthority'].filter(s=>stats.has(s));
        p.sheet.setSource('trial-leverage',leverage.map(s=>mod(s,'flat',.3)));
        if(hasAny('wriggle','gripPower')){
          const seize=allSkills().find(s=>s.effects.some(f=>f.type==='grabSeize'&&f.grab.verb==='carry'));
          const holder=stats.has('wriggle')?enemy:p,victim=holder===p?enemy:p;
          if(seize){
            const inst=makeSkillInstance(seize);
            w.resolveHit(holder,inst,victim);for(let i=0;i<6;i++){w.update(.045);watch();}
            result.numbers['grapple struggle']=round(holder.gripping?.struggle??0);
          }
        }else{
          const impact=makeSkillInstance(SKILLS.cleave),hp=enemy.life;
          w.pushActor(enemy,0,750,p,impact);
          if(enemy.push){const speed=Math.hypot(enemy.push.vx,enemy.push.vy);result.numbers['shove speed']=round(speed);w.resolveImpactHit(enemy,speed,enemy.push);}
          result.numbers['collision damage']=round(hp-enemy.life);
        }
      }
      if(stats.has('reloadSpeed')){
        phase='spent reload cooldown';
        const inst=makeSkillInstance(SKILLS.reload_powder);p.skills.push(inst);p.cooldowns.set(inst.def.id,6);
        w.update(.2);result.numbers['reload cooldown after one beat']=round(p.cooldowns.get(inst.def.id)??0);
        p.useLock=0;p.casting=null;p.cooldowns.delete(inst.def.id);w.useSkill(p,inst,p.pos,true);
        result.numbers['reload cast time']=round(p.casting?.total??p.useLock);
      }
      if(stats.has('triggerThreshold')){
        phase='damage-taken support threshold';
        const inst=makeSkillInstance(SKILLS.firebolt);inst.sockets[0]={def:SUPPORTS.cast_on_damage_taken,level:1};p.skills.push(inst);
        w.bankDamageTakenTriggers(p,p.maxLife()*.29,enemy);watch();
        result.numbers['damage retained by armed trigger']=round(inst.state?.trigAccum??0);
      }
      phase='targeted contact';
      const typed=mods.find(m=>/^(fire|cold|lightning|chaos|armor)Pen$/.test(m.stat))?.stat.replace('Pen','');
      const condition=mods.flatMap(m=>m.tags??[]).find(t=>['cold','chaos','fire','lightning'].includes(t));
      const element=typed??condition;
      const ailments=mods.map(m=>m.stat.match(/^apply_(.+)$/)?.[1]).filter(Boolean);
      const status=ailments[0]??({fire:'burn',cold:'chill',chaos:'poison',lightning:'shock'})[element]??(stats.has('statusMagnitude')?'burn':undefined);
      const tagged=new Set(mods.flatMap(m=>m.tags??[]));
      if([...stats].some(s=>['critMulti','damage','statusMagnitude','poiseDamage','ailmentStacks','critChance','damageVs_vulnerable'].includes(s)||s.startsWith('apply_')||s.endsWith('Pen'))){
        p.sheet.setSource('trial-contact',[mod('accuracy','flat',100000),...(stats.has('critMulti')?[mod('critChance','override',1)]:[])]);
        enemy.sheet.setSource('trial-target',[mod('poise','flat',200),mod('evasion','override',0),mod('blockChance','override',0),
          ...(typed && typed!=='armor'?[mod(typed+'Res','flat',.4)]:[])]);
        enemy.fillResources();
        for(const token of tagged){
          if(!token.startsWith('vs:'))continue;
          const condition=token.slice(3);
          if(STATUS_DEFS[condition])enemy.applyStatus(condition,2,2,p.name,{casterId:p.id});
          else if(condition==='lowLife')enemy.life*=.18;
          else if(condition==='afflicted')enemy.applyStatus('burn',2,2,p.name,{casterId:p.id});
          else if(condition==='poiseBroken')enemy.poiseBroken=true;
          else if(condition==='farRing')enemy.pos={x:p.pos.x+410,y:p.pos.y};
          else if(condition==='moving')w.moveActor(enemy,1,0,.1);
          else if(condition==='guarding')w.useSkill(enemy,makeSkillInstance(SKILLS.shield_up),p.pos,true);
          else if(condition==='grabbed'){
            const seize=allSkills().find(s=>s.effects.some(f=>f.type==='grabSeize'));
            if(seize)w.resolveHit(p,makeSkillInstance(seize),enemy);
          }
        }
        const source=status&&allSkills().find(s=>s.effects.some(f=>f.type==='status'&&f.status===status&&f.chance===1)&&
          Object.keys(s.baseDamage??{}).length && (!element||tagsFor(s).has(element)));
        const hit=source?makeSkillInstance(source):typed?makeSkillInstance(SKILLS[{fire:'firebolt',cold:'frostbolt',chaos:'venom_bolt',lightning:'ball_lightning',armor:'cleave'}[typed]]):skill;
        const hp=enemy.life,poise=enemy.poise;w.resolveHit(p,hit,enemy);watch();
        result.numbers[hit.def.name+' direct damage']=round(hp-enemy.life);
        result.numbers[hit.def.name+' poise removed']=round(poise-enemy.poise);
        if(status)result.numbers[status+' damage per second']=round(enemy.statuses.filter(s=>s.id===status).reduce((sum,s)=>sum+(s.dps??0),0));
      }
      if(stats.has('healPower')||stats.has('overheal')){
        const inst=makeSkillInstance(SKILLS.mend);ally.life=ally.maxLife()*.15;
        const hp=ally.life;w.executeSkill(p,inst,ally.pos,{targetInfo:w.resolveTargeting(p,inst,ally.pos)??undefined});watch();
        result.numbers['healing received by wounded ally']=round(ally.life-hp);
      }
      if(stats.has('wardGain')){p.ward=0;p.gainWard(20);result.numbers['ward from gain']=round(p.ward);}
      if([...stats].some(s=>s.startsWith('minion'))||tagged.has('minion')){
        const family=allSkills().filter(s=>s.delivery.type==='summon').sort((a,b)=>
          [...tagged].filter(t=>tagsFor(b).has(t)).length-[...tagged].filter(t=>tagsFor(a).has(t)).length)[0];
        const summoner=makeSkillInstance(family??SKILLS.summon_skeleton),before=new Set(w.actors);
        w.executeSkill(p,summoner,enemy.pos);watch();
        const summon=w.actors.find(a=>!before.has(a)&&a.owner===p);
        if(summon){
          result.numbers['summon life capacity']=round(summon.maxLife());
          const start={...summon.pos};w.moveActor(summon,1,0,.1);result.numbers['summon distance walked']=round(Math.hypot(summon.pos.x-start.x,summon.pos.y-start.y));
          const hit=summon.skills.find(Boolean);if(hit){const hp=enemy.life;w.resolveHit(summon,hit,enemy);result.numbers['summon damage dealt']=round(hp-enemy.life);}
        }
      }
    }
    phase='incoming';const hp=p.life;
    if(!enemy.dead) {w.executeSkill(enemy,incoming,p.pos);for(let i=0;i<3;i++)w.update(.1);}
    watch();result.numbers['life lost on incoming hit']=round(hp-p.life);
    if(proc) {
      phase='resource or companion event';
      if(!p.dead && !enemy.dead && ['cast','hit','heal','hurt','chargeGain','buffGain','lastGasp','collision','struck','orbPickup','statusApply','poiseBracket'].includes(proc.trigger)){
        phase='targeted '+proc.trigger+' encounter';
        p.sheet.setSource('extended-trial',[mod('life','flat',10000),mod('mana','flat',500),mod('accuracy','flat',10000)]);
        p.life=p.maxLife()*.5;enemy.life=enemy.maxLife();enemy.tier=p.tier;enemy.brain=undefined;
        if(proc.trigger==='collision'){
          const grid=new GridWalkField(w.arena.w,w.arena.h,32);grid.fillRegion(0,0,w.arena.w,w.arena.h,'ground');
          grid.fillRegion(800,0,895,w.arena.h,'wall');w.walk=grid;
        }
        const when=proc.when,charge=array(proc.charge)[0],buff=array(proc.buff)[0]??'war_cry';
        const shot=makeSkillInstance(SKILLS[proc.receivedTypes?.includes('fire')?'firebolt':'cleave']);
        for(let j=0;j<45 && !p.dead && !enemy.dead && !result.procs.has(proc.id);j++){
          p.mana=p.maxMana()*(when==='lowMana'?.18:.8);
          if(when==='lowLife')p.life=p.maxLife()*.15;
          p.refreshConditions();
          if(proc.trigger==='cast'){
            const varied=['spark','firebolt','frostbolt'];
            const variation=when==='comboVaried'?makeSkillInstance(SKILLS[varied[j%3]]):skill;
            w.useSkill(p,variation,enemy.pos,true);
          } else if(proc.trigger==='hit'||proc.trigger==='statusApply'){
            const eligible=proc.trigger==='statusApply'&&allSkills().find(s=>s.effects.some(f=>f.type==='status'&&(!proc.status||array(proc.status).includes(f.status))&&f.chance===1));
            w.resolveHit(p,eligible?makeSkillInstance(eligible):skill,enemy);
          } else if(proc.trigger==='heal'){p.life=p.maxLife()*.5;p.healBy(22);}
          else if(proc.trigger==='chargeGain'){p.spendCharge(charge??'fury',1);p.gainCharge(charge??'fury',1,8);}
          else if(proc.trigger==='buffGain'){p.buffs.delete(buff);p.addBuff({id:buff,type:'buff',duration:.5,mods:[]});}
          else if(proc.trigger==='orbPickup'){w.shedOrb(array(proc.orb)[0]??'life',{...p.pos},{homeTo:p,tier:p.tier});}
          else if(proc.trigger==='collision'){
            enemy.pos={x:782,y:p.pos.y};w.pushActor(enemy,0,450,p,skill);
          }else{
            if(proc.trigger==='lastGasp'){
              p.sheet.setSource('last-gasp-prerequisite',[mod('lastGasp','override',1)]);p.life=1;p.es=0;p.ward=0;
            }
            if(proc.trigger==='poiseBracket'){
              p.sheet.setSource('bracket-prerequisite',[mod('poise','flat',28)]);p.poise=p.maxPoise()*.52;
            }
            enemy.sheet.setSource('incoming-contact',[mod('critChance','override',proc.crit?1:0),mod('accuracy','flat',10000)]);
            w.resolveHit(enemy,shot,p);
          }
          for(let t=0;t<4;t++){w.update(.12);watch();}
        }
      }
      if(!p.dead && !enemy.dead) {
        const drain=['esBreak','wardBreak','poiseBroken','poiseRearmed','poiseBracket','struck','block','evade'].includes(proc.trigger);
        if(drain || ['poiseBreakDealt','foiled'].includes(proc.trigger)) {
          const victim=drain?p:enemy,attacker=drain?enemy:p;
          attacker.sheet.setSource('trial-impact',[mod('accuracy','flat',proc.trigger==='evade'?0:10000),mod('poiseDamage','increased',1)]);
          if(proc.trigger.startsWith('poise'))victim.sheet.setSource('trial-balance',[mod('poise','flat',20)]);
          if(proc.trigger==='foiled')victim.sheet.setSource('trial-block',[mod('blockChance','flat',.6)]);
          const blow=proc.trigger==='struck'?incoming:makeSkillInstance(SKILLS.cleave);
          for(let i=0;i<16&&!victim.dead;i++){
            victim.life=victim.maxLife()*.8;
            if(proc.trigger==='esBreak')victim.es=1;
            if(proc.trigger==='wardBreak')victim.gainWard(1);
            if(proc.trigger.startsWith('poise') && !victim.poiseBroken)victim.poise=1;
            w.resolveHit(attacker,blow,victim);w.update(.12);watch();
          }
          if(proc.trigger==='poiseRearmed')for(let i=0;i<32;i++){w.update(.4);watch();}
        }
        if(proc.trigger==='heal'){
          p.life=p.maxLife()*.6;
          const mend=makeSkillInstance(SKILLS.mend);w.executeSkill(p,mend,p.pos,{targetInfo:w.resolveTargeting(p,mend,p.pos)??undefined});
          w.update(.1);watch();
        }
        if(proc.trigger==='surface'){
          const kind=doodadRuleKinds().find(k=>doodadRuleOf(k).brittle?.on.includes('hit'));
          if(kind){w.doodads.push({kind,pos:{...p.pos},radius:20,tier:p.tier});w.markDoodadsChanged();w.strikeSurfaces(p,p.pos,35);watch();}
        }
        if(proc.trigger==='statusApply'){
          const requested=array(proc.status);
          const source=allSkills().find(s=>s.effects.some(f=>f.type==='status'&&requested.includes(f.status??f.id)));
          if(source){const s=makeSkillInstance(source);p.sheet.setSource('trial-status',[mod('statusChance','override',1)]);
            for(let n=0;n<6&&!enemy.dead;n++)w.resolveHit(p,s,enemy);watch();}
        }
      }
      if(proc.trigger==='hit' && proc.minionCarry) {
        ally.summonInst=makeSkillInstance(SKILLS.summon_skeleton);ally.sourceSkillId=ally.summonInst.def.id;
        ally.sheet.setSource('trial-contact',[mod('accuracy','flat',1e6)]);
        for(let n=0;n<8&&!enemy.dead;n++)w.resolveHit(ally,makeSkillInstance(SKILLS.cleave),enemy);
      }
      if(proc.trigger==='minionDeath'){ally.owner=p;w.kill(ally,false,enemy);}
      if(proc.trigger==='orbPickup')w.shedOrb(array(proc.orb)[0]??'life',{...p.pos},{scatter:0,tier:p.tier});
      if(proc.trigger==='chargeGain') p.gainCharge(array(proc.charge)[0]??'fury',1,5);
      if(proc.trigger==='buffGain') p.addBuff({id:array(proc.buff)[0]??'enraged',type:'buff',duration:3,mods:[]});
      if(proc.trigger==='statusApply') {const sid=array(proc.status)[0]??'bleed';if(STATUS_DEFS[sid]) enemy.applyStatus(sid,2,1,p.name,{casterId:p.id});}
      for(let i=0;i<(proc.trigger==='pulse'?Math.ceil((proc.every??2)*3):4);i++){w.update(.3);watch();}
      // Independently exercise the official event admission with the installed
      // grant. Keep these separate from events generated by the fight above.
      // Never call executeProc to make this test pass.
      gated=true; phase='controlled event';
      const tags=new Set([...skill.def.tags,...mods.flatMap(m=>m.tags??[])]);
      if(proc.when||proc.condition)p.sheet.setConditions([proc.when,proc.condition].filter(Boolean));
      const opts={inst:skill,tags,extra:[],target:enemy,crit:!!proc.crit,condition:proc.condition,bracket:array(proc.bracket)[0],
        receivedAmounts:Object.fromEntries((proc.receivedTypes??['physical']).map(t=>[t,10]))};
      for(let i=0;i<48&&!p.dead&&!result.gated.has(proc.id)&&!result.procs.has(proc.id);i++){
        w.time+=Math.max(1,proc.icd??0);
        switch(proc.trigger){
          case 'statusApply':w.rollStatusProcs(p,skill,enemy,array(proc.status)[0]??'bleed',tags,[],0);break;
          case 'chargeGain':case 'buffGain':case 'orbPickup':{
            const kind={chargeGain:'charge',buffGain:'buff',orbPickup:'orb'}[proc.trigger];
            w.rollGainProcs(p,{kind,id:array(proc[kind])[0]??({charge:'fury',buff:'enraged',orb:'life'})[kind],n:1,depth:0});break;
          }
          case 'collision':w.rollCollisionProcs(p,skill,enemy);break;
          case 'surface':w.rollSurfaceProcs(p);break;
          case 'hit': case 'kill':{
            if(enemy.dead)break;
            if(proc.trigger==='kill')enemy.life=1;
            w.resolveHit(p,skill,enemy);break;
          }
          default:w.rollOwnProcs(p,proc.trigger,opts);
        }
      }
      watch();
    }
    if(!proc && !p.dead && !enemy.dead){
      phase='specialized equipment and allies';
      passiveLoadout(w,p,enemy,ally,stats,mods,(label,n)=>{result.numbers[label]=round(n);},watch);
    }
    if(mods.some(m=>voices.has('mechanic:'+m.stat))) {
      phase='mixed combat under pressure';gated=false;
      enemy.rarity='rare';
      p.sheet.setSource('trial-contact',[mod('accuracy','flat',1e6),mod('critChance','override',1)]);
      enemy.sheet.setSource('trial-receiver',[mod('evasion','override',0),mod('blockChance','override',0),mod('poise','flat',20)]);enemy.poise=1;
      for(const sid of ['burn','shock','frozen','poison','bleed'])if(STATUS_DEFS[sid])enemy.applyStatus(sid,1,4,p.name,{casterId:p.id});
      for(const sid of ['firebolt','frostbolt','cleave','war_cry','summon_skeleton','ball_lightning','cleave','snipe','firebolt']) {
        if(enemy.dead||p.dead)break;
        const cast=makeSkillInstance(SKILLS[sid]);p.mana=p.maxMana()*.2;
        w.executeSkill(p,cast,enemy.pos);watch();w.resolveHit(p,cast,enemy);watch();w.update(.37);watch();
      }
      if(!enemy.dead){enemy.life=1;w.resolveHit(p,makeSkillInstance(SKILLS.cleave),enemy);watch();}
    }
  } finally {restore();p.sheet.get=oldGet;w.executeProc=oldProc;}
  return result;
}
function passive(group,id,extended=false) {
  const {node,option}=pickGrant(group,id);
  if (!node && option) {
    result(group,id,'Undealt option','The registered option has no dealing node in the current tree. There is no player allocation that installs this option.',option.name);
    return;
  }
  const grant=option??node;
  if(!grant) throw Error('Missing passive '+id);
  // A deal is a real location whose selected option folds via meta.choices.
  // Compare the same allocated host without a pick against one legal option.
  const selection=option??(node.choice?CHOICE_GROUPS[node.choice.group]?.options[0]:undefined);
  const a=passiveFight(node,selection,false,extended), b=passiveFight(node,selection,true,extended);
  const mods=(selection??grant).mods??[],name=grant.name;
  const differences=(before,after)=>Object.entries(after).filter(([k,v])=>Object.hasOwn(before,k)&&Math.abs(v-before[k])>1e-4)
    .map(([k,v])=>k+' '+before[k]+' → '+v);
  const changed= differences(a.numbers,b.numbers),sheet=differences(a.sheet,b.sheet);
  const read=[];
  for(const [k,v] of b.read) if(a.read.has(k)&&Math.abs(v-a.read.get(k))>1e-4) {
    const line=k.split(' [')[0]+' '+a.read.get(k)+' → '+v;if(!read.includes(line)) read.push(line);
  }
  const procs=[...b.procs].filter(q=>!a.procs.has(q)),hud=[...b.hud].filter(q=>!a.hud.has(q));
  const extra=[...b.cues].filter(q=>!a.cues.has(q));
  const payouts=procs.length && !b.feedback.size && !hud.length && !extra.length ? procs.map(qualifiedPayout).filter(Boolean) : [];
  const procMods=mods.filter(m=>m.stat.startsWith('proc_'));
  const gated=[...b.gated].filter(id=>!a.gated.has(id)&&!a.procs.has(id));
  const state=!option && node.choice?'Choice location':!mods.length && !grant.conduit && !grant.attributes && !grant.attributesPct?'Path or gate':
    procs.length?'Proc fired':gated.length?'Event gate verified':procMods.length?'Trigger unobserved':hud.length?'HUD changed':extra.length?'Combat event changed':
    changed.length&&changed.every(x=>x.startsWith('price offered by the recruiter '))?'Contract price changed':
    changed.length&&changed.every(x=>x.startsWith('company capacity '))?'Company capacity changed':
    changed.length?'Combat outcome changed':read.length?'Combat stat used':sheet.length?'Sheet changed':'Grant installed';
  if(!extended && (state==='Sheet changed'||state==='Grant installed'))return passive(group,id,true);
  const trial=extended?'Equipped casts, qualified targets and allied bodies.':SKILLS[b.id].name+' against a target, with '+b.incoming+' equipped on the opponent.';
  const detail=[(selection??grant).description,trial+' Same seed and setup with and without the grant.',
    selection?'Choice '+selection.name+' on '+node.name+'.':'', procs.length?'Dispatched '+procs.join(', ')+'.':'',
    gated.length?'Matched installed grant under the controlled '+procMods.map(m=>PROCS[m.stat.slice(5)]?.trigger).join('/')+' event: '+gated.join(', ')+'.':'',
    b.feedback.size?'Feedback during resolution: '+[...b.feedback].join(', ')+'.':'',
    ...payouts,
    hud.length?'New painted HUD feedback: '+hud.join(', ')+'.':'', extra.length?'Additional emitted effects: '+extra.slice(0,8).join(', ')+'.':'',
    changed.length?'Measured: '+changed.join(' / ')+'.':'',read.length?'Changed in combat queries: '+read.slice(0,10).join(' / ')+'.':'',
    sheet.length?'Character sheet: '+sheet.join(' / ')+'.':'',mods.length?'Installed '+b.source+'/'+mods.length+' modifier lines.':'',
    state==='Trigger unobserved'?'Required event: '+procMods.map(m=>PROCS[m.stat.slice(5)]?.trigger).join(', ')+'.':'',
    state==='Path or gate'?'This node has no independent modifier or combat payload.':'',
    state==='Grant installed'?'The paired fight did not establish an individual combat outcome.':''].filter(Boolean).join(' ');
  result(group,id,state,detail,name);
  const row=rows.get(key(group,id));
  if(state==='Sheet changed'||state==='Grant installed')row.pendingStats=[...new Set(mods.map(m=>m.stat))];
  else {delete row.pendingStats;delete row.nextEncounter;}
}
function qualifiedPayout(id){
  const def=PROCS[id],fx=def.effect;
  const notes=[],art=[];
  for(const eligible of [false,true]){
    const {w,p,enemy}=arena(),inst=makeSkillInstance(SKILLS.cleave);
    p.sheet.setSource('recipient-capacity',[mod('poise','flat',60),mod('poiseCcAvoid','override',0),mod('energyShield','flat',60),mod('endurance','flat',65)]);
    p.fillResources();p.poise=eligible?5:p.maxPoise();p.es=eligible?5:p.maxEs();p.endurance=eligible?5:p.maxEndurance();p.mana=eligible?5:p.availableMaxMana();
    if(fx.type==='cleanse'&&eligible){
      const sid=fx.statuses?.[0]??Object.keys(STATUS_DEFS).find(s=>fx.hardCC?STATUS_DEFS[s].hardCC:STATUS_DEFS[s].dotType);
      if(sid)p.applyStatus(sid,2,2,enemy.name);
    }
    if(fx.type==='arc'&&eligible){
      for(let i=0;i<2;i++){const a=w.createMonster('zombie',1,'enemy');a.pos={x:enemy.pos.x+23*(i+1),y:enemy.pos.y+12};a.brain=undefined;w.actors.push(a);}
    }
    const resource=fx.type==='fortify'?'endurance':fx.type==='restore'?fx.resource:null;
    const before=resource?p[resource]:0,conditions=p.statuses.map(s=>s.id),first=w.flashes.length;
    const deliver=()=>w.executeProc(def,p,inst,eligible?enemy:null);
    let landing=0;
    if(eligible && fx.type==='status' && STATUS_DEFS[fx.status]){
      const family=statusVoiceOf(STATUS_DEFS[fx.status]),old=renderer.directorFocus;
      try{
        renderer.directorFocus=enemy.pos;resetStatusVoices();renderer.render(w);
        if(effectVoiceOf(family))landing=observeVoice(family,f=>f.pos.x===enemy.pos.x&&f.pos.y===enemy.pos.y,()=>{deliver();w.update(.035);renderer.render(w);});
        else deliver();
      }finally{renderer.directorFocus=old;}
    }else deliver();
    const row=procCueRows(p).find(q=>q.id===id);
    const visible=!!row&&hudArt(row,true);
    art.push(visible);
    if(!eligible)continue;
    if(resource&&p[resource]!==before)notes.push(resource+' '+round(before)+' → '+round(p[resource]));
    const removed=conditions.filter(s=>!p.statuses.some(t=>t.id===s));
    if(removed.length)notes.push('removed '+removed.join(', '));
    if(fx.type==='status'&&enemy.statuses.some(s=>s.id===fx.status))notes.push(STATUS_DEFS[fx.status].label+' landed on the enemy'+(landing>=8?' ('+landing+' body pixels)':''));
    if(visible)notes.push('painted hotbar '+id);
    for(const f of w.flashes.slice(first))if(f.fx&&witness(w,f)>=8)notes.push('painted '+f.fx);
    for(const f of w.flashes.slice(first).filter(f=>f.lightning)){
      const n=witness(w,f);if(n>=8)notes.push('discharge linked the targets ('+n+' pixels)');
    }
  }
  if(!notes.length)return 'The native trigger fired. The controlled recipient comparison has no independently witnessed payout.';
  return 'Controlled payout after native dispatch: '+[...new Set(notes)].join(', ')+'.'+(art[1]&&!art[0]?' The full or unaffected control showed no hotbar payout.':'');
}
function actor(id) {
  const {w,p}=arena(), a=w.createMonster(id,2,'enemy');
  w.actors=[p,a];a.pos={x:p.pos.x+65,y:p.pos.y};a.spawnedAt=-20;
  for(let i=0;i<35&&!a.dead;i++){
    if(i===10) a.life=a.maxLife()*.24;
    updateAI(a,w,.12);w.update(.12);collect(w,MONSTERS[id].name+' · wounded encounter');
  }
  if(!a.dead) w.kill(a,false,p);
  collect(w,MONSTERS[id].name+' · defeat');ticks(w,14,MONSTERS[id].name+' · death aftermath',.2);
}
function observeVoice(voice,accept,exercise) {
  const painter=effectVoiceOf(voice);if(!painter)return 0;
  let changed=0;
  registerEffectVoice(voice,(ctx,f,t)=>{
    if(!accept(f))return painter(ctx,f,t);
    const at=ctx.getTransform().transformPoint(f.pos),size=100;
    const x=Math.max(0,Math.min(ctx.canvas.width-size,Math.round(at.x-size/2)));
    const y=Math.max(0,Math.min(ctx.canvas.height-size,Math.round(at.y-size/2)));
    const before=ctx.getImageData(x,y,size,size).data;
    painter(ctx,f,t);changed=Math.max(changed,pixels(before,ctx.getImageData(x,y,size,size).data));
  });
  try{exercise(()=>changed);}finally{registerEffectVoice(voice,painter);}
  return changed;
}
function statusLandings() {
  const families=['spiral','stars','ripple','wink'];
  const focus=renderer.directorFocus;
  try {
    for(const family of families){
      const row=voices.get(family);
      if(!row || ['Combat frame','Encounter replay','On-body landing'].includes(row.state))continue;
      const owners=allSkills().filter(def=>def.effects.some(fx=>fx.type==='status' && statusVoiceOf(STATUS_DEFS[fx.status])===family));
      for(const def of owners){
        resetStatusVoices();
        const {w,p,enemy,inst}=prepareSkill(def);
        renderer.directorFocus=enemy.pos;renderer.render(w);
        p.sheet.setSource('trial-accuracy',[mod('accuracy','flat',1e6)]);
        const changed=observeVoice(family,f=>f.pos.x===enemy.pos.x&&f.pos.y===enemy.pos.y,read=>{
          for(let hit=0;hit<12 && read()<8 && !enemy.dead;hit++){
            w.resolveHit(p,inst,enemy);w.update(.025);renderer.render(w);
          }
        });
        if(changed<8)continue;
        const status=enemy.statuses.find(s=>statusVoiceOf(STATUS_DEFS[s.id])===family);
        if(!status)continue;
        row.state='On-body landing';row.detail=def.name+' landed '+STATUS_DEFS[status.id].label+' on a previously observed enemy. The live status overlay changed '+changed+' pixels over the body. Its owner is the client’s status transition, which also works without a world flash.';
        break;
      }
    }
  } finally {renderer.directorFocus=focus;resetStatusVoices();}
  for(const id of ['clash','glint','blur','ward']){
    const row=voices.get(id);
    if(row && !row.state && !references[id]?.length){
      row.state='Legacy extension art';
      row.detail='Registered by render/vis/cryVoices.ts for authored extensions. The shipped combat outcomes use the defense and combat cue layers. There is no gameplay caller of World.cry in this checkout.';
    }
  }
}
function specialOwners() {
  statusLandings();
  const deathTypes=new Map();
  for(const [id,monster] of Object.entries(MONSTERS))if(monster.deathBurst){
    const voice=deathBurstVoice(monster.deathBurst);
    if(!deathTypes.has(voice))deathTypes.set(voice,id);
  }
  for(const [voice,row] of voices)if(/^mechanic:death_(orb|implode)_/.test(voice) && !['Encounter replay','Combat frame'].includes(row.state)){
    const id=deathTypes.get(voice), [mode,damageType]=voice.slice('mechanic:death_'.length).split('_');
    for(const funded of [false,true]){
      const {w,p}=arena(),foe=w.createMonster(funded&&id?id:'zombie',1,'enemy');
      if(funded&&!id)foe.deathBurst={mode,damageType,damageFrac:.5,coalesce:.8};
      foe.pos={x:p.pos.x+125,y:p.pos.y};w.actors.push(foe);w.kill(foe,false,p);
      for(let i=0;i<110;i++){
        w.update(.1);
        if(!funded && w.flashes.some(f=>f.fx===voice))throw Error('An ordinary zombie produced '+voice);
        if(funded)collect(w,(id?MONSTERS[id].name:'Configured '+damageType+' '+mode)+' · coalescence through detonation; ordinary zombie control',!id);
      }
    }
  }
  for(const kind of ['tree','water']){
    const entry=Object.entries(MONSTERS).find(([,m])=>m.refuge?.kind===kind);if(!entry)continue;
    const [id,def]=entry,{w,p}=arena(),animal=w.createMonster(id,1,'enemy');animal.pos={x:p.pos.x+60,y:p.pos.y};w.actors.push(animal);
    const at={x:animal.pos.x+12,y:animal.pos.y};w.fleeIntoRefuge(animal,at);
    const f=w.flashes.find(f=>f.departure),row=voices.get(f?.departure?.fx);if(!f||!row)continue;
    w.update(.08);
    const n=observeVoice(row.id,v=>v.pos.x===at.x&&v.pos.y===at.y,()=>renderer.render(w));
    if(n>=8){row.state='Nested combat cue';row.detail=def.name+' withdrew into '+kind+' cover. The refuge animation drew '+row.id+' at its destination ('+n+' changed pixels), then drew the departing body. No defeat was required.';}
  }
  for(const skill of ['arrears','iron_ward']){
    for(const hit of [false,true]){
      const {w,p,enemy}=arena(),inst=makeSkillInstance(SKILLS[skill]);p.skills=[inst];
      p.sheet.setSource('unblocked-hit',[mod('evasion','override',0),mod('blockChance','override',0),mod('energyShield','override',0)]);p.es=0;
      w.executeSkill(p,inst,p.pos);
      if(hit)w.resolveHit(enemy,makeSkillInstance(SKILLS.cleave),p);
      if(skill==='arrears'){const command=makeSkillInstance(SKILLS.absolution);command.hostSkillId=skill;w.executeSkill(p,command,p.pos);}
      const voice=skill==='arrears'?'world:debtPaid':'skillSelf:burst:iron_ward';
      const label=skill==='arrears'?'Absolution · settle the host aura’s hit debt':'Iron Ward · return stored damage on expiry';
      for(let i=0;i<85;i++){
        if(!hit && w.flashes.some(f=>f.fx===voice))throw Error('Unfunded '+skill+' released stored damage');
        if(hit)collect(w,label+'; unchanged control took no hit');w.update(.1);
      }
    }
  }
  for(const interrupted of [false,true]){
    const {w,p}=arena(),faction=Object.keys(FACTIONS).find(id=>FACTIONS[id].table?.length && w.sim.faction.conquerorOf(w.zone.id)!==id);
    if(!faction)continue;
    const from=w.exits[0]?.to??w.zone.id;
    w.spawnWarband({faction,fromZoneId:from,targetZoneId:w.zone.id,pos:{...w.zone.map},target:{...w.zone.map},radius:60,age:0,life:90,arrived:true});
    collect(w,'Invasion · a staged arriving host materializes into its leader and retinue',true);
    const march=w.warbandMarches[0];if(!march)continue;
    if(interrupted)w.kill(march.leader,false,p);else march.leader.pos={...march.goal};
    w.updateWarbandMarches();
    if(interrupted && w.flashes.some(f=>f.fx==='world:warbandDeparts'))throw Error('A defeated warband leader still marched onward');
    if(!interrupted)collect(w,'Invasion · living champion reached the onward exit; defeated champion control',true);
  }
  for(const interrupt of [false,true]){
    const {w,p}=arena();w.zone.objective={kind:'none'};w.zone.level=8;w.time=125;
    const grave={kind:'tombstone',radius:22,pos:{x:p.pos.x+285,y:p.pos.y}};
    w.doodads=[grave];w.markDoodadsChanged();
    w.odyssey.restore({version:1,roster:['goblin','bandit','undead','beastkin'],defeated:['beastkin'],prepared:[],leads:[],kills:{},surveyDone:false,nextScoutAt:0,nextSiegeAt:0,defenses:0,raids:0,initialized:true});
    const def=ODYSSEY_RISINGS.find(d=>d.faction==='undead');
    w.odyssey.update();const clock=def&&w.odyssey.state?.risings?.[def.id];if(!clock)continue;
    clock.nextAt=w.time;w.odyssey.update();ticks(w,3,'Undead Nights · eligible grave warns',.05);
    if(interrupt){grave.gone=true;w.markDoodadsChanged();}
    ticks(w,30,interrupt?'Undead Nights · source removed during warning':'Undead Nights · body rises after warning',.2);
  }
  for(const paid of [false,true]){
    const {w,p,enemy,ally}=arena();
    if(paid)p.sheet.setSource('trial-pact',[mod(BURIAL_GROUND.stat,'flat',1)]);
    const summon=makeSkillInstance(SKILLS.summon_skeleton);ally.summonInst=summon;ally.sourceSkillId=summon.def.id;
    w.kill(ally,false,enemy);
    for(let i=0;i<75;i++){w.update(.25);if(paid)collect(w,'Burial Ground · a fallen summon’s incomplete grave site expires',true);}
  }
  {
    const {w,p,enemy}=arena(),weak=w.createMonster('zombie',1,'enemy'),inst=makeSkillInstance(SKILLS.firebolt,20);
    inst.treeNodes=['cinder_lance','white_heat','focused_flame'];p.skills=[inst];w.meta.knownSkills.set('firebolt',inst);
    weak.pos={x:enemy.pos.x+22,y:enemy.pos.y};weak.brain=undefined;weak.spawnedAt=-20;w.actors.push(weak);
    weak.applyStatus('burn',20,1,p.name,{casterId:p.id});w.resolveHit(p,inst,enemy);
    ticks(w,12,'Pyreheart · stronger enemy draws a neighbouring ignite',.1);
  }
  {
    const {w,p}=arena();
    for(const def of Object.values(SHRINES)){w.shrines=[{def,pos:{...p.pos},tier:p.tier,used:false}];w.update(.04);collect(w,def.name+' · shrine touched');}
    for(const def of Object.values(ALTARS)){p.life=p.maxLife()*.7;w.altars=[{def,pos:{...p.pos},tier:p.tier,affected:new Set()}];ticks(w,15,def.name+' · wounded fighters inside the altar',.25);}
  }
  for(const a of Object.values(INCURSION_ARCHETYPES)) {
    const {w,p}=arena(),kind=doodadRuleKinds().find(k=>doodadRuleOf(k).mutable);
    for(let i=0;i<12;i++){
      const foe=w.createMonster('zombie',1,'enemy');foe.pos={x:p.pos.x+35+i*12,y:p.pos.y};foe.brain=undefined;w.actors.push(foe);
      if(kind)w.doodads.push({kind,radius:18,pos:{x:p.pos.x+30+i*20,y:p.pos.y+30}});
    }
    w.markDoodadsChanged();
    for(const event of a.events){
      const fire=w.incursionEvents[event.id];if(!fire)continue;
      fire(1,a);collect(w,a.id+' incursion · '+event.id+' selected at full influence',true);
      for(let i=0;i<12;i++){w.update(.2);collect(w,a.id+' incursion · '+event.id+' aftermath',true);}
    }
  }
  const trail=Object.values(SUPPORTS).find(s=>s.trail?.blast);
  for(const mode of ['flightAbsorb','flightReflect','flightPathBlast','flightPrism','flightRelay']){
    for(const enabled of [false,true]){
      const {w,p,enemy}=arena(),target={x:p.pos.x+420,y:p.pos.y};
      enemy.pos={x:target.x+160,y:target.y+80};
      if(mode==='flightPrism') {
        if(enabled)w.meta.allocated.add('exp_p11_int_prism_refract_a');
        w.recalcSeat(w.localSeat);
        w.executeSkill(p,makeSkillInstance(SKILLS.flame_totem),{x:p.pos.x+85,y:p.pos.y});
      }
      if(mode==='flightAbsorb'||mode==='flightReflect'){
        const dome=allSkills().find(s=>s.delivery.domeMode===(mode==='flightAbsorb'?'dissolve':'deflect'));
        enemy.pos={x:p.pos.x+180,y:p.pos.y+75};
        if(enabled && dome)w.executeSkill(enemy,makeSkillInstance(dome),{x:p.pos.x+170,y:p.pos.y});
      }
      const inst=makeSkillInstance(mode==='flightRelay'?SKILLS.gyreblade:SKILLS.firebolt);
      if(enabled && mode==='flightPathBlast' && trail)inst.sockets[0]={def:trail,level:1};
      if(enabled && mode==='flightRelay')inst.sockets[0]={def:SUPPORTS.returning,level:1};
      p.skills=[inst];w.executeSkill(p,inst,target);
      const label={flightRelay:'Gyreblade + Returning',flightAbsorb:'hostile projectile-dissolving dome',flightReflect:'hostile projectile-deflecting dome',flightPathBlast:trail?.name??'path blast',flightPrism:'Crystal Focus + Flame Totem'}[mode];
      for(let i=0;i<122;i++){
        w.update(.05);
        if(!enabled && w.flashes.some(f=>f.fx==='mechanic:'+mode))throw Error('Unmodified flight unexpectedly triggered '+mode);
        if(enabled)collect(w,label+' · projectile crossed the encounter');
      }
    }
  }
  for(const kind of doodadRuleKinds()) {
    const rule=doodadRuleOf(kind);if(!rule.brittle&&!rule.resonance&&!rule.effect)continue;
    const {w,p,enemy}=arena(),d={pos:{x:p.pos.x+26,y:p.pos.y},tier:p.tier,kind,radius:20};
    if(rule.effect){
      d.effect={...rule.effect,cd:0};
      if(d.effect.target==='owner')d.effect.ownerId=p.id;
      if(d.effect.faction && d.effect.target==='ally')enemy.faction=d.effect.faction;
      p.life=p.maxLife()*.7;enemy.life=enemy.maxLife()*.7;
    }
    w.doodads.push(d);w.markDoodadsChanged();enemy.pos={...d.pos};
    if(rule.effect)ticks(w,30,kind+' · combatants within reach of the active scenery',.15);
    w.strikeSurfaces(p,d.pos,30);collect(w,kind+' · scenery struck by the hero');
    ticks(w,6,kind+' · scenery reacts to contact',.1);
  }
  for(const [id,def] of Object.entries(PUZZLES)) {
    const {w,p}=arena(),near={x:p.pos.x+180,y:p.pos.y};
    w.bootPuzzles({...w.zone,puzzles:[{id,chance:1}]},[near]);
    const puzzle=w.puzzles.find(r=>r.spec===def);if(!puzzle)continue;
    p.pos={...puzzle.at};const cast=makeSkillInstance(SKILLS.cleave);
    const press=node=>{
      w.resolveHit(p,cast,node);w.update(.05);collect(w,id+' · strike an enrolled puzzle piece');
    };
    ticks(w,18,id+' · puzzle active within earshot',.12);
    if(def.kind==='tempo')for(const i of [puzzle.state.order.at(-1),...puzzle.state.order]) press(puzzle.nodes[i]);
    else if(def.kind==='iceslide' && puzzle.state.blockCells) {
      const dirs=[[1,0],[-1,0],[0,1],[0,-1]],count=puzzle.state.blockCells.length;
      for(let i=0;i<50&&!puzzle.done;i++){
        const block=puzzle.nodes[i%count],dir=dirs[(Math.floor(i/count)+i%count)%4];
        p.pos={x:block.pos.x-23*dir[0],y:block.pos.y-23*dir[1]};press(block);
        ticks(w,6,id+' · block slides or seats',.1);
      }
    }else for(const node of puzzle.nodes)if(!puzzle.done)press(node);
  }
  for(const [id,nodes,property,draw] of [
    ['ember_satellite',['ember_satellites'],'projectiles','drawProjectiles'],
    ['incandescent_pillar',['cinder_lance','white_heat','incandescent_point'],'zones','drawZones']
  ]) {
    const {w,p,enemy}=arena(),inst=makeSkillInstance(SKILLS.firebolt,20);
    inst.treeNodes=nodes;p.skills=[inst];w.meta.knownSkills.set('firebolt',inst);
    p.sheet.setSource('trial-accuracy',[mod('accuracy','flat',1e6)]);
    w.executeSkill(p,inst,enemy.pos);
    if(property==='zones'){enemy.applyStatus('burn',10,1,p.name,{casterId:p.id});w.resolveHit(p,inst,enemy);}
    w.update(.05);const component=w[property].find(o=>o.skillVisualId===id);if(!component)continue;
    const prior=renderer[draw],focus=renderer.directorFocus;let n=0;
    renderer.directorFocus=component.pos;
    renderer[draw]=function(world) {
      const ctx=this.ctx,at=this.toScreen(component.pos);
      const x=Math.min(ctx.canvas.width-120,Math.max(0,Math.round(at.x-60))),y=Math.min(ctx.canvas.height-120,Math.max(0,Math.round(at.y-60)));
      const before=ctx.getImageData(x,y,120,120).data,all=world[property];world[property]=[component];
      try{prior.call(this,world);n=pixels(before,ctx.getImageData(x,y,120,120).data);}finally{world[property]=all;}
    };
    try{renderer.render(w);}finally{renderer[draw]=prior;renderer.directorFocus=focus;}
    const row=voices.get('skillFieldImpact:'+id);
    if(n>=8 && row && !row.state)Object.assign(row,{state:'Related combat art',detail:'Firebolt with '+nodes.join(', ')+' painted '+n+' pixels from the native '+(property==='zones'?'burning pillar':'orbiting projectile')+'. The area-impact registration shares that component identity. This encounter produced no separate impact flash with that key.'});
  }
  for(const def of HARVEST_NODES) {
    const {w,p}=arena(),d={kind:def.kind,pos:{x:p.pos.x+26,y:p.pos.y},radius:20,tier:p.tier};
    w.harvestNodes=[{pos:d.pos,def,doodad:d,spent:true}];w.doodads.push(d);
    const session={ix:0,held:false,seatId:w.localSeat.id,seq:[0],done:0,misses:1};
    w.harvestSessions=[session];w.harvestSettle(session,'expiry');collect(w,def.id+' · harvest settled');
  }
  {
    const {w,enemy,p}=arena();enemy.life*=.5;runAIActions(w,enemy,[{do:'heal',frac:.2}]);collect(w,'Wounded enemy received healing');
    enemy.puzzleNode={idx:0};const run={state:{phase:'answer',seq:[0,1],progress:0},nodes:[enemy]};
    for(let i=0;i<2;i++){PUZZLE_KINDS.refrain.struck(run,enemy,w.puzzleHost());collect(w,'Refrain · '+(i?'incorrect answer':'correct answer'));}
    enemy.burrow={phase:'emerge',t:.55,to:{...enemy.pos},speed:150,damageFrac:.01,emergeRadius:64,dustAcc:.1,color:'#d7b979'};
    w.stepBurrow(enemy,.01);collect(w,'Burrowing enemy · eruption warning');w.stepBurrow(enemy,.56);collect(w,'Burrowing enemy · impact');
    const cleave=makeSkillInstance(SKILLS.cleave);cleave.sockets[0]={def:SUPPORTS.blood_toll,level:1};p.skills=[cleave];
    w.executeSkill(p,cleave,enemy.pos);collect(w,'Blood Toll · cast beside a living allied minion');
    ticks(w,5,'Blood Toll · sacrificed minion',.025);
  }
  for(const [id,d] of Object.entries(STATUS_DEFS)) if(d.ruptureFx) {
    for(const funded of [false,true]) {
      const {w,p,enemy}=arena();
      enemy.applyStatus(id,0,1,p.name,{casterId:p.id,...(funded?{rupture:60,ruptureType:d.element??d.dotType??'physical',ruptureRadius:72}:{})});
      const status=enemy.statuses.find(s=>s.id===id);if(!status)continue;
      status.remaining=.001;w.update(.02);
      if(!funded && w.flashes.some(f=>f.fx===d.ruptureFx))throw Error('Unfunded expiry emitted '+d.ruptureFx+' on '+id);
      if(funded)collect(w,d.label+' · configured stored damage released at expiry; ordinary expiry control',true);
    }
  }
}
// Use the same force-event controls exposed in the game's developer panel.
// Individual events still enforce their package and terrain prerequisites.
function eventButtons(w,flash=()=>{}) {
  const pane=eventsTab.build({runActive:()=>w,flash});
  const buttons=[...pane.el.querySelectorAll('button')],last=buttons.findIndex(b=>b.textContent==='Max Corpse Tide');
  return buttons.slice(0,last+1);
}
function eventPalette(label,outcome) {
  const account=makeAccount();
  for(const pkg of PACKAGES)account.packageUnlocks.add(pkg.id);
  const manifest=buildManifest(account,79481);
  const w=new World(account,Object.freeze(manifest));w.createPlayer(classById('warrior'),{startingCompanions:false});
  const p=w.player;p.level=100;
  p.sheet.setSource('encounter-longevity',[mod('life','override',1e7)]);p.fillResources();
  const wilderness=Object.values(w.zoneMap).filter(z=>z.id!==w.zone.id && z.packs && z.objective.kind!=='safe' && !z.caveDepth && !z.eventOwned && !z.pocket && !z.boundless && !z.floating);
  const zone=(label.startsWith('Wraithsail') && wilderness.find(z=>z.port))||wilderness[0];
  if(!zone)throw Error('Missing expedition wilderness');
  w.loadZone(zone.id);w.update(.1);
  let response='';
  eventButtons(w,text=>response=text).find(b=>b.textContent===label).click();
  if(/unavailable|off this run|not in this run|at cap/i.test(response))console.info('Expedition admission',label,response);
  const encounter=w.encounters.find(e=>label.startsWith('Extraction')?e.ex:label.startsWith('Borough')?e.bo:label.startsWith('Breach Field')?e.def.veil:false);
  if(encounter){p.pos={...encounter.pos};p.tier=w.spoilStoryAt(encounter.pos);}
  const title='Expedition · '+label+(outcome?' · '+outcome:'');
  collect(w,title+' · staged in '+zone.name);
  if(label.startsWith('Amalgamation') && w.amalgamSite){
    const field=w.sim.amalgamationField, origin=w.zone.id;
    for(let i=0;i<Math.min(32,4*field.peek().partsNeeded+3);i++){
      const info=field.peek();if(!info)break;
      if(info.quest==='hunt'){
        const zoneId=Object.keys(w.zoneMap).find(id=>field.minibossIn(id));if(!zoneId)break;
        w.loadZone(zoneId);collect(w,title+' · find the marked champion');
        const foe=w.actors.find(a=>a.tag==='amalgam_miniboss'&&!a.dead);if(!foe)break;
        w.kill(foe,false,p);w.loadZone(origin);collect(w,title+' · return with the requested part');
      }else if(info.quest==='boss'){
        const boss=w.actors.find(a=>a.tag==='amalgam_boss'&&!a.dead);if(!boss)break;
        w.kill(boss,false,p);collect(w,title+' · defeat the assembled Amalgamation');break;
      }else{
        const site=w.amalgamSite;if(!site)break;
        const at=info.quest==='offer'?w.actorById(site.necroId)?.pos:w.amalgamPickSpots(site.center,info.offered)[0]?.pos;
        if(!at)break;p.pos={...at};p.tier=w.spoilStoryAt(at);
        ticks(w,16,title+' · accept a hunt or graft the chosen part',.15);
      }
    }
  }
  if(label.startsWith('Crusade (throne')||label==='Demon Invasion'){
    const portal=label.startsWith('Crusade')?w.crusadePortals[0]:w.demonPortalsView()[0];
    if(portal){
      if(portal.crusadeId)w.enterCrusadeSanctum(portal.crusadeId,portal.pos);
      else if(portal.invId)w.enterDemonRealm(portal.invId,portal.pos);
      for(const seal of [...(w.arenaWard?.seals??[])]){
        p.pos={...seal.pos};p.tier=w.spoilStoryAt(seal.pos);ticks(w,18,title+' · player dwells at the realm seal',.15);
      }
      const boss=w.actorById(w.arenaCrowd?.bossId);
      if(boss)for(const c of w.arenaCrowd.spec.championCalls??[]){
        boss.life=Math.max(1,boss.maxLife()*(c.atLifeFrac-.015));ticks(w,2,title+' · wounded champion calls from the stands');
      }
    }
  }
  // Let the encounter own its waves, expiry and doors. Fight enemies that
  // appeared in this expedition rather than supplying anonymous kill counts.
  for(let i=0;i<(encounter?660:180);i++) {
    if(encounter && i>6 && !w.encounters.includes(encounter))break;
    if(outcome==='overrun' && encounter?.phase==='open') {
      const attacker=w.enemiesOf(p)[0];
      const victims=encounter.ex?[w.actorById(encounter.ex.nodeId)]:encounter.bo?w.boroughFolkAlive(encounter):[];
      if(attacker)for(const v of victims)if(v && !v.invulnerable && !v.dead)w.kill(v,false,attacker);
    }
    if(outcome!=='overrun' && i%9===1)for(const foe of w.enemiesOf(p).slice(0,5))if(!foe.dead && !foe.invulnerable) {
      w.resolveHit(p,makeSkillInstance(SKILLS.cleave),foe);if(!foe.dead)w.kill(foe,false,p);collect(w,title+' · encounter foe defeated');
    }
    w.update(.2);collect(w,title+' · fight and aftermath');
  }
}
const words=id=>id.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ');
function describeVoice(row) {
  const parts=row.id.split(':'),id=parts.at(-1),group=parts[0];
  const profile=({skillPresence:presenceProfile,skillMove:movementProfile,skillSelf:selfProfile,skillTarget:skillTargetProfile,skillTargetSplash:skillTargetProfile,
    skillStrike:skillStrikeProfile,skillRite:skillRiteProfile,skillFieldImpact:fieldProfile,world:id=>WORLD_MOMENTS[id],mechanic:id=>MECHANIC_BURSTS[id]})[group]?.(id);
  row.name=(SKILLS[id]?.name??words(id))+(parts.length===3?' · '+parts[1]:'');
  if(!profile)return;
  const material=profile.burst??profile,shapes=[profile.subject,profile.form,material.motif??profile.material,material.echo].filter(Boolean);
  const motion=({in:'inward',out:'outward',rise:'rising',orbit:'orbiting',split:'splitting',coil:'coiling'})[material.motion]??material.motion;
  row.appearance=[...new Set(shapes.map(words)),motion,profile.layout].filter(Boolean).join(' · ');
}
export function start(targets,refs,previous,scope) {
  __game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();__game.hold(true);
  renderer=__game.renderer;references=refs;
  const canvas=document.createElement('canvas');canvas.width=160;canvas.height=100;tile=canvas.getContext('2d',{willReadFrequently:true});
  for(const node of Object.values(PASSIVE_NODES)) if(node.choice&&!choices.has(node.choice.group))choices.set(node.choice.group,node);
  const prior=new Map((previous??[]).map(r=>[key(r.group,r.id),r]));
  for(const t of targets) {
    const row={...t,...prior.get(key(t.group,t.id))}; rows.set(key(t.group,t.id),row);
    if(t.group!=='Effect voice')continue;
    voices.set(t.id,row);describeVoice(row);
    const id=t.id.split(':').at(-1);
    if(t.id.startsWith('skill')&&SKILLS[id]) {const list=ownSkills.get(id)??[];list.push(row);ownSkills.set(id,list);}
  }
  if(previous) {
    if(scope==='interactions')return {'Combined encounters':['multi-stage combat']};
    if(scope==='proc'){
      const pending=g=>previous.filter(r=>r.group===g && r.state==='Event gate verified').map(r=>r.id);
      return {'Passive':pending('Passive'),'Passive choice':pending('Passive choice')};
    }
    const open=r=>['Owner unobserved','Trigger unobserved','Event gate verified','Grant installed','Sheet changed','Encounter calculation','Error'].includes(r.state) ||
      (r.state==='Proc fired'&&!/Feedback during resolution:|New painted HUD feedback:|Additional emitted effects:|Controlled payout after/.test(r.detail));
    for(const [id,entries] of ownSkills) if(!entries.some(open)) ownSkills.delete(id);
    for(const r of voices.values()) if(open(r))delete r.state;
    const groupIds=g=>previous.filter(r=>r.group===g&&open(r)).map(r=>r.id);
    return {'Skill owners':[...ownSkills.keys()],'Passive':groupIds('Passive'),'Passive choice':groupIds('Passive choice'),'Encounter interactions':['encounter interactions'],
      'Combined encounters':['multi-stage combat'],'Expedition events':eventButtons(__game.world()).map(b=>b.textContent).filter(s=>/^(Extraction|Borough|Breach Field|Crusade \(throne|Demon Invasion|Amalgamation|Wraithsail \(dock)/.test(s))};
  }
  return {'Skill owners':[...ownSkills.keys()],'Passive':targets.filter(t=>t.group==='Passive').map(t=>t.id),
    'Passive choice':targets.filter(t=>t.group==='Passive choice').map(t=>t.id),'Enemy encounters':Object.keys(MONSTERS),
    'Encounter interactions':['harvest, releases and support rites'],'Combined encounters':['multi-stage combat'],'Expedition events':eventButtons(__game.world()).map(b=>b.textContent)};
}
export function run(group,ids) {
  const rng=Math.random;
  try {for(const id of ids) {
    try {
      if(group==='Skill owners')targetedSkill(id);
      else if(group==='Enemy encounters')actor(id);
      else if(group==='Expedition events'){eventPalette(id);if(/^(Extraction|Borough)/.test(id))eventPalette(id,'overrun');}
      else if(group==='Encounter interactions')specialOwners();
      else if(group==='Combined encounters')combinedEncounters({collect,ticks,voices,witness});
      else {
        const row=rows.get(key(group,id)),prior=row?.state==='Encounter calculation'?{...row}:undefined;
        passive(group,id);
        if(prior && (row.state==='Sheet changed'||row.state==='Grant installed')){
          Object.assign(row,prior);delete row.pendingStats;delete row.nextEncounter;
        }
      }
    } catch(err) {
      if(group==='Skill owners') for(const r of ownSkills.get(id)) {r.state='Error';r.detail=String(err?.stack??err).slice(0,750);}
      else if(group==='Enemy encounters'||group.includes('encounters')||group==='Encounter interactions'||group==='Expedition events') throw Error(id+' '+(err?.stack??err));
      else result(group,id,'Error',String(err?.stack??err).slice(0,750));
    }
  }} finally {Math.random=rng;}
}
export function finish() {
  for(const [id,row] of voices) if(!row.state) {
    row.state='Owner unobserved';row.detail='No matching combat frame in the targeted trials.';
  }
  for(const [id,row] of voices) if(references[id]?.length) row.detail=row.detail.split(' Production sources:')[0]+' Production sources: '+references[id].slice(0,8).join(', ')+'.';
  return [...rows.values()];
}

export function cooldownStudy() {
  __game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();__game.hold(true);
  const r=__game.renderer,{w,p,ally,enemy}=arena();
  w.meta.allocated.add('route_wis_accent_funeral_clock');w.recalcSeat(w.localSeat);
  const ids=['summon_skeleton','summon_stone_golem','cleave'];
  p.skills=ids.map(id=>makeSkillInstance(SKILLS[id]));
  [5,.15,5].forEach((v,i)=>p.cooldowns.set(ids[i],v));
  w.kill(ally,false,enemy);
  const rows=procCueRows(p),cue=rows.find(q=>q.id==='route_funeral_clock');
  if(cue?.cooldowns?.[ids[0]]!=='shortened'||cue?.cooldowns?.[ids[1]]!=='ready'||cue?.cooldowns?.cleave)throw Error('Minion death did not return the expected clocks');
  const prior=p.procCues,mode=r.worldOnly,timer=Object.getOwnPropertyDescriptor(performance,'now');
  r.worldOnly=false;Object.defineProperty(performance,'now',{configurable:true,value:()=>4200});
  const sheet=document.createElement('canvas');sheet.width=720;sheet.height=330;
  const g=sheet.getContext('2d');g.fillStyle='#182128';g.fillRect(0,0,720,330);
  g.fillStyle='#f0e0c5';g.font='bold 20px system-ui';g.fillText('The Empty Place',20,28);
  g.font='14px system-ui';g.fillStyle='#c9d4d7';g.fillText('One minion falls. The passive returns 0.4 seconds to active summon cooldowns.',20,52);
  ['Summon Skeleton','Summon Stone Golem','Cleave'].forEach((s,i)=>g.fillText(s,134+i*196,82));
  g.fillText('Control',18,142);g.fillText('With cue',18,251);
  const art=rows.map(({cooldowns,...row})=>row);
  const take=(show)=>{
    p.procCues=show?prior:art;
    const restore=seedGlobalRandom(170);try{r.render(w);}finally{restore();}
    const surf=r.pixelScale<1?r.overlay:r.canvas,k=surf.width/r.frameW;
    return ids.map((id,i)=>{
      const rect=r.hudSlotRects.find(box=>box.seatId===w.localSeat.id&&box.slot===i);
      if(!rect)throw Error('Missing hotbar seat '+id);
      const c=document.createElement('canvas');c.width=Math.round(rect.w*k);c.height=Math.round(rect.h*k);
      c.getContext('2d').drawImage(surf,Math.round(rect.x*k),Math.round(rect.y*k),c.width,c.height,0,0,c.width,c.height);
      return c;
    });
  };
  try {
    take(false);const control=take(false),active=take(true);
    const values=active.map((c,i)=>pixels(c.getContext('2d').getImageData(0,0,c.width,c.height).data,control[i].getContext('2d').getImageData(0,0,c.width,c.height).data));
    if(values[0]<8||values[1]<8||values[2]!==0)throw Error('Unexpected slot pixel comparison '+values);
    for(const [i,c] of active.entries()){
      const x=144+i*196;g.drawImage(control[i],x,93,84,84);g.drawImage(c,x,202,84,84);
      g.fillText(['5.0 → 4.6 seconds','0.15 seconds → ready','5.0 seconds'][i],x-12,314);
    }
    p.cooldowns.set(ids[1],5);
    const recast=take(true)[1],hidden=take(false)[1],read=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    if(pixels(read(recast),read(hidden))!==0)throw Error('Ready cue lingered after recast');
    return {image:sheet.toDataURL('image/png'),values};
  }finally{p.procCues=prior;r.worldOnly=mode;if(timer)Object.defineProperty(performance,'now',timer);else delete performance.now;}
}

export function interactionStudy() {
  const r=renderer=__game.renderer, priorFocus=r.directorFocus, mode=r.worldOnly, rand=Math.random;
  const sheet=document.createElement('canvas');sheet.width=720;sheet.height=1000;
  const g=sheet.getContext('2d');g.fillStyle='#172027';g.fillRect(0,0,sheet.width,sheet.height);
  const comparisons=[];
  try {
    r.worldOnly=true;
    for(let i=0;i<8;i++){
      const {w,p,enemy}=arena(),enabled=i%2===1,kind=Math.floor(i/2);
      for(let n=0;n<5;n++) {
        const a=w.createMonster('zombie',1,'enemy');a.pos={x:enemy.pos.x-92+44*n,y:enemy.pos.y+42+(n%2)*13};
        a.brain=undefined;a.spawnedAt=-50;a.tier=p.tier;w.actors.push(a);
      }
      let wanted,at,label,description;
      if(kind===0) {
        const inst=makeSkillInstance(SKILLS.teleport);if(enabled)inst.sockets[0]={def:SUPPORTS.dive_bomb,level:1};
        p.skills=[inst];w.executeSkill(p,inst,{x:p.pos.x+90,y:p.pos.y});w.update(.055);
        at=p.pos;wanted='skillMove:impact:teleport';label=enabled?'Teleport with Dive Bomb':'Teleport';
        description=enabled?'The support adds a blast at each end.':'Departure and arrival mark the displacement.';
      }else if(kind===1){
        enemy.applyStatus('poison',0,1,p.name,{casterId:p.id,...(enabled?{rupture:60,ruptureType:'chaos',ruptureRadius:72}:{})});
        enemy.statuses.find(s=>s.id==='poison').remaining=.001;w.update(.02);w.update(.045);
        at=enemy.pos;wanted=STATUS_DEFS.poison.ruptureFx;label=enabled?'Poison with stored rupture':'Ordinary poison';
        description=enabled?'Stored damage releases around the victim.':'The status expires quietly.';
      }else if(kind===2){
        enemy.burrow={phase:'emerge',t:.55,to:{...enemy.pos},speed:150,damageFrac:.01,emergeRadius:64,dustAcc:.1,color:'#d7b979'};
        w.update(.01);
        if(enabled)for(let tick=0;tick<35 && !w.flashes.some(f=>f.fx==='mechanic:burrowEruption');tick++)w.update(.02);
        w.update(.045);
        at=enemy.pos;wanted=enabled?'mechanic:burrowEruption':'world:burrowWarning';label=enabled?'Burrow breaks ground':'Burrow warning';
        description=enabled?'The same footprint now deals damage.':'The warned area shows where to move.';
      }else{
        const def=enabled?SKILLS.sanctuary:SKILLS.torpor_field,inst=makeSkillInstance(def);
        p.skills=[inst];w.meta.knownSkills.set(def.id,inst);
        w.executeSkill(p,inst,p.pos);
        const dome=w.actors.find(a=>a.presenceBadge?.skillId===def.id);
        if(!dome)throw Error(def.name+' field did not form');
        at=dome.pos;wanted='skillPresence:pulse:'+def.id;
        enemy.pos={x:at.x-195,y:at.y+8};
        w.executeSkill(enemy,makeSkillInstance(SKILLS.firebolt),{x:at.x+140,y:at.y+8});
        for(let t=0;t<80&&!w.flashes.some(f=>f.fx===wanted);t++)w.update(.016);
        w.update(.025);
        const hit=w.flashes.some(f=>f.fx==='mechanic:flightAbsorb');
        if(hit!==enabled)throw Error(def.name+' failed its flight outcome control');
        label=def.name;description=enabled?'The field answers as the incoming shot dissolves.':'The field answers as the shot slows inside it.';
      }
      const effects=w.flashes.filter(f=>f.fx===wanted);
      const evidence=effects.reduce((best,f)=>Math.max(best,witness(w,f)),0);
      if((kind>=2||enabled)?evidence<8:effects.length>0)throw Error(label+' failed its control: '+wanted+' / '+evidence);
      comparisons.push(evidence);r.directorFocus=at;r.render(w);
      const center=r.toScreen(at),sw=285*r.zoom,sh=sw*154/348,x=8+(i%2)*360,y=8+kind*198;
      g.drawImage(r.canvas,center.x-sw/2,center.y-sh/2,sw,sh,x,y,348,154);
      g.fillStyle='#f0e0c5';g.font='bold 15px system-ui';g.fillText(label,x+3,y+172);
      g.fillStyle='#cad7d9';g.font='13px system-ui';g.fillText(description,x+3,y+190);
    }
    // Compare the *finished* frame. The storm, six hostiles, camera, time
    // and seed are identical. Suppress only the burrow warning in the
    // control so cover from later layers is included in the measurement.
    const {w,p,enemy}=arena(),storm=makeSkillInstance(SKILLS.frost_storm);
    const at={...enemy.pos};
    p.skills=[storm];w.meta.knownSkills.set(storm.def.id,storm);
    for(const [dx,dy] of [[-34,8],[-52,30],[17,24],[49,15],[60,-13]]){
      const a=w.createMonster('zombie',1,'enemy');a.pos={x:at.x+dx,y:at.y+dy};a.brain=undefined;a.spawnedAt=-30;w.actors.push(a);
    }
    w.meta.baseAttrs.intelligence=Math.max(w.meta.baseAttrs.intelligence,SKILLS.frost_storm.requirements.intelligence);
    w.recalcSeat(w.localSeat);p.fillResources();
    if(!w.useSkill(p,storm,at,true))throw Error('Frost Storm did not begin channeling');
    for(let i=0;i<45&&!w.flashes.some(f=>f.fx==='skillFieldImpact:frost_storm');i++){
      if(p.casting)p.casting.held=true;w.update(.025);
    }
    enemy.burrow={phase:'emerge',t:.55,to:{...at},speed:150,damageFrac:.01,emergeRadius:64,dustAcc:.1,color:'#d7b979'};
    w.update(.01);w.update(.045);
    const warning=w.flashes.find(f=>f.fx==='world:burrowWarning');
    if(!warning||!w.flashes.some(f=>f.fx==='skillFieldImpact:frost_storm'&&f.life>0))
      throw Error('Burrow and Frost Storm did not overlap in the combat frame');
    const draw=r.drawTerrainFlash,clock=Object.getOwnPropertyDescriptor(performance,'now');
    const crop=document.createElement('canvas');crop.width=348;crop.height=154;
    const c=crop.getContext('2d',{willReadFrequently:true});
    try{
      r.directorFocus=at;Object.defineProperty(performance,'now',{value:()=>4200,configurable:true});
      const take=(show,x)=>{
        r.drawTerrainFlash=function(f,world){if(show||f!==warning)return draw.call(this,f,world);};
        const restore=seedGlobalRandom(214);try{r.render(w);}finally{restore();}
        const center=r.toScreen(at),sw=285*r.zoom,sh=sw*154/348;
        c.drawImage(r.canvas,center.x-sw/2,center.y-sh/2,sw,sh,0,0,crop.width,crop.height);
        if(x!==undefined)g.drawImage(crop,x,800);
        return c.getImageData(0,0,crop.width,crop.height).data;
      };
      take(false);const control=take(false,8),repeat=take(false),armed=take(true,368);
      const drift=pixels(control,repeat),changed=pixels(repeat,armed);
      if(drift>4||changed<16)throw Error('Crowded warning frame: '+drift+' control pixels, '+changed+' warning pixels');
      comparisons.push(drift,changed);
      g.fillStyle='#f0e0c5';g.font='bold 15px system-ui';g.fillText('Frost Storm in a pack',11,970);g.fillText('The burrow warning beneath Frost Storm',371,970);
      g.fillStyle='#cad7d9';g.font='13px system-ui';g.fillText('Same six hostiles, storm and camera.',11,989);g.fillText(changed+' warning pixels survive the full scene.',371,989);
    }finally{r.drawTerrainFlash=draw;if(clock)Object.defineProperty(performance,'now',clock);else delete performance.now;}
    return {image:sheet.toDataURL('image/png'),comparisons};
  }finally{r.directorFocus=priorFocus;r.worldOnly=mode;Math.random=rand;}
}

// Preserve the exact emitted event, actors and timing across the production
// network serializer. Render only records from scenarios whose own assertions
// passed. Scenario setup, mock rows and neutral painter samples earn no credit.
export async function replay(name,ids,auditMirror=false) {
  renderer=__game.renderer;
  __game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();__game.hold(true);
  const wanted=new Set(ids), snaps=new Map(), messages=[];
  const saved=console.log, rng=Math.random, exitSignal={};
  const proc={exitCode:0,exit(code=0){this.exitCode=code;throw exitSignal;}};
  try {
    const mod=await window.targetEncounterReplays[name]();
    window.__captureEncounter=(world,items)=>{
      const fresh=items.filter(f=>wanted.has(f.fx)&&!snaps.has(f.fx)&&f.radius>0);
      if (!fresh.length || !world.seats?.length) return;
      // A few fixtures intentionally mock a partial world. Only transferable
      // real world states are candidates for client playback.
      try {const snap=serializeSnapshot(world,1);for(const f of fresh) {
        let host=0;
        if(world.player && typeof world.publishViewFrame==='function') {
          try{host=witness(world,f);}catch{ /* Some scenarios contain deliberately incomplete object doubles. */ }
        }
        snaps.set(f.fx,{snap,index:world.flashes.indexOf(f),host});
      }}
      catch { /* Wait for a complete scene. */ }
    };
    console.log=(...args)=>{if(/FAIL|✗/.test(String(args[0])))messages.push(args.join(' ').slice(0,150));};
    window.__encounterRunning=true;
    try {await mod.replay(proc);}catch(err){if(err!==exitSignal)throw err;}
    if(proc.exitCode)throw Error('Scenario exited '+proc.exitCode+' '+messages.slice(-2).join(' / '));
  } finally {delete window.__encounterRunning;delete window.__captureEncounter;console.log=saved;Math.random=rng;}
  const observed=[];
  for(const [id,{snap,index,host}] of snaps) {
    if(host>=8 && !auditMirror){observed.push({id,n:host,source:'host'});continue;}
    try {
      const {w}=arena();applySnapshot(w,snap);
      const exact=w.flashes[index];
      const f=exact?.fx===id && exact.life>0?exact:w.flashes.findLast(f=>f.fx===id && f.life>0);
      if(!f) continue;
      let n=witness(w,f);
      if(n<8){f.life=f.maxLife*.72;n=witness(w,f);}
      if(n>=8)observed.push({id,n,source:'snapshot'});
    }catch(error){
      // A broken fixture scene is not a receipt. Preserve other real scenes
      // that pass, and surface this exact missing frame to the ledger.
      observed.push({id,issue:String(auditMirror?error.stack:error.message??error).slice(0,auditMirror?800:160)});
    }
  }
  return observed;
}

// Replay an authored encounter unchanged. At an actual engine read on its
// player, compare the same stat twice, with the grant folded into the
// second read. The live action keeps its original value and sheet version.
// This proves the number participates in that action; it cannot prove an
// additional hit landed, a projectile was painted, or a duration elapsed.
export async function replayPassiveReads(name,targets){
  for(const n of Object.values(PASSIVE_NODES))if(n.choice&&!choices.has(n.choice.group))choices.set(n.choice.group,n);
  const byStat=new Map(),found=new Map();
  for(const entry of targets){
    const {node,option}=pickGrant(entry.group,entry.id),grant=option??node;
    if(!node||!grant?.mods)continue;
    for(const stat of new Set(grant.mods.map(m=>m.stat))){
      const bucket=byStat.get(stat)??[];bucket.push({entry,node,grant});byStat.set(stat,bucket);
    }
  }
  let current,checking=false;
  const get=StatSheet.prototype.get,wrapped=new Map(),cache=new WeakMap();
  for(const method of ['useSkill','executeSkill','resolveHit','kill','spawnMinion','moveActor','update','rollOwnProcs','bakeMinionOwnerStats']){
    const original=World.prototype[method];if(!original)continue;
    wrapped.set(method,original);
    World.prototype[method]=function(...args){
      const prior=current;
      if(this.seats?.length)current={player:this.player,method,skill:args[1]?.def?.name??prior?.skill};
      try{return original.apply(this,args);}finally{current=prior;}
    };
  }
  StatSheet.prototype.get=function(stat,tags,extra,base){
    const before=get.call(this,stat,tags,extra,base),candidates=byStat.get(stat);
    if(!window.__encounterRunning||checking||!candidates?.length||current?.player?.sheet!==this)return before;
    const context=[...(tags??[])].sort(),label=[current.method,current.skill??'',stat,context.join(','),base??'',before].join('/');
    let seen=cache.get(this);if(!seen){seen=new Set();cache.set(this,seen);}
    if(seen.has(label))return before;seen.add(label);
    checking=true;
    try{
      for(const {entry,node,grant} of candidates){
        const id=key(entry.group,entry.id);
        if(found.has(id)||grant.mods.some(m=>this.getSourceMods('passives')?.includes(m))||
          !grant.mods.some(m=>m.stat===stat&&(m.tags??[]).every(t=>tags?.has(t))))continue;
        const after=get.call(this,stat,tags,[...(extra??[]),...grant.mods],base);
        if(Number.isFinite(before)&&Number.isFinite(after)&&Math.abs(after-before)>1e-4)
          found.set(id,{...entry,action:current.method,skill:current.skill,stat,before:round(before),after:round(after),actor:current.player.name});
      }
    }finally{checking=false;}
    return before;
  };
  try{await replay(name,[]);return [...found.values()];}
  finally{StatSheet.prototype.get=get;for(const [method,original] of wrapped)World.prototype[method]=original;}
}
