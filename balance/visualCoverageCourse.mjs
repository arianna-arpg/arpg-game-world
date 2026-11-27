import { mechanicStudy } from './mechanicSilhouetteStudy.mjs';
// Loaded only by the Electron QA entry. Never infer a native cast from a
// registry swatch. Paint the objects its release and subsequent ticks leave.
import { arena, prepareSkill } from './skillVisualFixture';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { PROCS } from '../src/data/procs';
import { SUPPORTS } from '../src/data/supports';
import { PASSIVE_NODES } from '../src/data/passives';
import { CHOICE_GROUPS } from '../src/data/passiveChoices';
import { MONSTERS } from '../src/data/monsters';
import { makeSkillInstance, makeSkillGem, MAX_SKILL_LEVEL } from '../src/engine/skills';
import { treeGraph } from '../src/engine/skilltree';
import { STATUS_DEFS } from '../src/engine/status';
import { CHARGE_DEFS } from '../src/engine/charges';
import { mod } from '../src/engine/stats';
import { buffRows, newPassiveBuffGrants, addPassiveBuffGrant } from '../src/engine/buffPresentation';
import { procCueRows } from '../src/engine/procCues';
import { afflictionPressureOf } from '../src/engine/afflictionPressure';
import { drawProcHud, drawBuffMagazine } from '../src/render/vis/procCueLayer';
import { buffAddendum } from '../src/render/vis/buffAddendum';
import { drawBuffTile } from '../src/render/vis/buffIcons';
import { statusIcons, drawStatusIcons } from '../src/render/vis/statusIcons';
import { drawMechanicLink } from '../src/render/vis/mechanicVisuals';
import { supportMarks, supportMeters } from '../src/engine/supportPresentation';
import { drawSupportRail, drawSupportMeter } from '../src/render/vis/supportRail';
import { drawSupportCounter } from '../src/render/vis/supportCounters';
import { drawShellCue } from '../src/render/vis/defenseCueLayer';
import { replenishingDelivery } from '../src/engine/replenishment';
import { PAINTERS } from '../src/render/vis/painters';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { GridWalkField } from '../src/world/gridWalk';
import { refugeDeparture } from '../src/engine/refugeDeparture';
import { updateAI } from '../src/engine/ai';
import { auditSupports } from '../scripts/hotbar-study/supportCoverage';
import { cosmeticHotbar } from '../src/render/vis/cosmeticEffects';
import { effectVoiceKinds, effectVoiceOf } from '../src/render/vis/effectVoice';
import { MECHANIC_BURSTS, MECHANIC_LINKS, MECHANIC_FIELDS } from '../src/data/mechanicVisuals';
import { MECHANIC_MARKS } from '../src/engine/mechanicMarks';
import { drawMechanicField, drawMechanicMarks } from '../src/render/vis/mechanicVisuals';

const skillNodes = new Map(), choices = new Map();
const emittedBy = new Map();
const treeSamples = new Map();
const payloads = new Map();
let silhouettes;
export const materialPreview = () => silhouettes?.preview;
let supports, r, ctx;
const size = 128, center = { x: size / 2, y: size / 2 }, rect = { x: 40, y: 40, w: 36, h: 36 };
export function start() {
  window.__game.account().ledger.prologue_lived = 1;
  window.__game.devStartRun('warrior'); window.__game.ui.hideAll(); window.__game.hold(true);
  Object.defineProperty(performance,'now',{configurable:true,value:()=>4200});
  r = window.__game.renderer;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  ctx = canvas.getContext('2d', { willReadFrequently: true });
  for (const skill of Object.values(SKILLS)) {
    for (const entry of treeGraph(skill)?.nodes.values() ?? []) skillNodes.set(skill.id + '/' + entry.id, { skill, entry });
    for (const effect of skill.effects) {
      const owners=payloads.get(effect.type)??new Set(); owners.add(skill.id); payloads.set(effect.type,owners);
    }
  }
  for (const group of Object.values(CHOICE_GROUPS))
    for (const opt of group.options) choices.set(group.id + '/' + opt.id, opt);
  supports = new Map(auditSupports().map(s => [s.id, s]));
  return { Skill: Object.keys(SKILLS), Proc: Object.keys(PROCS), Status: Object.keys(STATUS_DEFS), Charge: Object.keys(CHARGE_DEFS),
    Support: Object.keys(SUPPORTS), 'Skill tree': [...skillNodes.keys()], Passive: Object.keys(PASSIVE_NODES), 'Passive choice': [...choices.keys()],
    'Actor skill kit':Object.keys(MONSTERS), 'Mechanic link':Object.keys(MECHANIC_LINKS), 'Mechanic field':Object.keys(MECHANIC_FIELDS), 'Mechanic mark':Object.keys(MECHANIC_MARKS),
    'Mechanic silhouette':Object.keys(MECHANIC_BURSTS), 'Payload family':[...payloads.keys()], 'Effect voice': effectVoiceKinds() };
}

// A transparent tile, centered on one real object. Ignore pixels below the
// alpha floor. Actor overlays require a comparison against the same bare actor.
function frame(at, span, paint) {
  const old = r.ctx, cam = r.cam;
  const restoreRandom=seedGlobalRandom(713);
  ctx.resetTransform(); ctx.clearRect(0, 0, size, size); ctx.save();
  try {
    r.ctx = ctx; r.cam = { x: at.x - size / 2, y: at.y - size / 2 };
    ctx.translate(size / 2, size / 2); ctx.scale(size / span, size / span); ctx.translate(-at.x, -at.y);
    paint();
    return ctx.getImageData(0, 0, size, size).data;
  } finally { ctx.restore(); r.ctx = old; r.cam = cam; restoreRandom(); }
}
function ink(pixels, before) {
  let n = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (before ? Math.abs(pixels[i]-before[i])>8 || Math.abs(pixels[i+1]-before[i+1])>8 ||
      Math.abs(pixels[i+2]-before[i+2])>8 || Math.abs(pixels[i+3]-before[i+3])>8 : pixels[i+3] > 8) {
      if (++n >= 8) return true;
    }
  }
  return false;
}
const hud = paint => ink(frame(center, size, paint));
const buff = row => hud(() => drawBuffTile(ctx, row, rect));
const idsOn = a => new Set([...buffRows(a).map(row => row.kind + '/' + row.id), ...procCueRows(a).map(q => q.phase + '/' + q.id)]);
const flashKind = f => f.fx || (f.lightning && 'lightning path') || (f.movement && 'movement trail') || (f.companionCue && 'companion cue') ||
  (f.feedingCue && 'feeding transfer') || (f.mechanicLink && f.mechanicLink.kind) || (f.bolt && 'bolt') || (f.meteor && 'meteor') ||
  (f.beam && 'beam') || (f.haze && 'haze') || f.cosmeticMotif || 'generic flash';

// Observe one draw inside the normal world composition, after admission,
// camera transforms and terrain clipping. Only attribute the layer if this
// cast owns its contents. Idle actors, ground tiles and HUD clocks cannot pass.
function witnessScene(w,base) {
  const watches=new Map(), hits=new Set();
  function watch(method, pick) {
    const original=r[method];
    watches.set(method,original);
    r[method]=function(...args) {
      const candidate=pick(...args);
      if (!candidate || hits.has(candidate[0])) return original.apply(this,args);
      const [key,at]=candidate, screen=r.toScreen(at), c=r.ctx, width=Math.min(224,c.canvas.width), height=Math.min(224,c.canvas.height);
      const x=Math.max(0,Math.min(c.canvas.width-width,Math.floor(screen.x-width/2)));
      const y=Math.max(0,Math.min(c.canvas.height-height,Math.floor(screen.y-height/2)));
      const clean=c.getImageData(x,y,width,height);
      let before=clean.data;
      if (method==='drawActor' && key==='directional shell') {
        const owner=args[0], shell=owner.shellGuard;
        try {
          owner.shellGuard=undefined;
          original.apply(this,args);
          before=c.getImageData(x,y,width,height).data;
        } finally {owner.shellGuard=shell;c.putImageData(clean,x,y);}
      }
      const result=original.apply(this,args);
      if (ink(c.getImageData(x,y,width,height).data,before)) hits.add(key);
      return result;
    };
  }
  watch('drawTerrainFlash', f=>{
    const tip=f.arc && f.edgeFrac ? f.radius*(1+f.edgeFrac)/2 : 0;
    const at=tip?{x:f.pos.x+tip*Math.cos(f.arc.facing),y:f.pos.y+tip*Math.sin(f.arc.facing)}:f.pos;
    return ['impact '+flashKind(f),at];
  });
  watch('drawActor', a=>!base.actors.has(a)?['summoned body',a.pos]:a.shellGuard && !base.shells.has(a) && ['directional shell',a.pos]);
  watch('drawZones', ()=>w.zones.length&&w.zones.every(z=>!base.objects.has(z))&&['field',w.zones[0].pos]);
  watch('drawAuras', ()=>{
    const bearer=w.actors.find(a=>[...a.activeAuras.values()].some(aura=>aura.radius>0));
    return bearer && ['aura',bearer.pos];
  });
  watch('drawProjectiles', ()=>{
    if (w.tethers.length) return ['tether/flight',w.tethers[0].a.pos];
    return w.projectiles.length&&w.projectiles.every(s=>!base.objects.has(s))&&['flight',w.projectiles[0].pos];
  });
  const restore=seedGlobalRandom(713);
  try { r.render(w); } finally { restore(); for (const [method,original] of watches) r[method]=original; }
  return [...hits];
}

function observe(w, base) {
  const seen = new Map(), failed = new Set();
  function measure(key, at, span, paint) {
    if (seen.has(key)) return;
    if (ink(frame(at, Math.max(36, span), paint))) seen.set(key, true);
    else failed.add(key);
  }
  function sample() {
    const only = props => Object.assign(Object.create(w), props);
    for (const f of w.flashes) {
      const key = 'impact ' + flashKind(f);
      if (seen.has(key)) continue;
      const span = f.radius * 2.5 || 128;
      if (f.mechanicLink) {
        const { from, to, kind } = f.mechanicLink, a = w.actorById(from), b = w.actorById(to);
        if (a && b && !a.dead && !b.dead) measure(key, a.pos, span, () => drawMechanicLink(ctx, kind, a.pos, b.pos, f.color, .75));
      } else {
        // Fast clocks may skip the flash's peak. Sample two ages of the
        // emitted flash without advancing or mutating the gameplay object.
        for (const t of [.74, .38]) measure(key, f.pos, span, () => r.drawTerrainFlash({ ...f, life: f.maxLife*t }, w));
      }
    }
    for (const shot of w.projectiles) if (!base.objects.has(shot)) {
      const id = shot.skillVisualId ?? shot.inst?.def.id ?? shot.orbPaint;
      measure('flight ' + id, shot.pos, 90, () => r.drawProjectiles(only({ projectiles:[shot], tethers:[] })));
    }
    for (const z of w.zones) if (!base.objects.has(z)) {
      measure('field ' + (z.skillVisualId ?? z.inst.def.id), z.pos, z.radius*2.5, () => r.drawZones(only({ zones:[z], actors:[] })));
    }
    for (const a of w.actors) {
      if (!base.actors.has(a) && !a.dead) measure('body ' + (a.defId ?? a.name), a.pos, 85, () => r.drawActor(a, w));
      if (a.shellGuard && !base.shells.has(a)) measure('directional shell',a.pos,85,()=>{
        ctx.translate(a.pos.x,a.pos.y);drawShellCue(ctx,a,w.time);
      });
      if ([...a.activeAuras.values()].some(aura=>aura.radius>0)) measure('aura ' + [...a.activeAuras.keys()].join(', '), a.pos, 350, () => r.drawAuras(only({actors:[a]})));
    }
    for (const t of w.tethers) measure('tether ' + t.skillId, t.a.pos, 180, () => r.drawTethers(only({tethers:[t]})));
    for (const d of w.doodads) if (!base.objects.has(d)) {
      const def=DOODAD_VISUALS[d.kind], painter=def && PAINTERS[def.painter];
      if (painter) measure('placed prop '+d.kind,d.pos,Math.max(70,d.radius*2.7),()=>painter({ctx,theme:w.zone.theme,time:w.time,world:w},[d],def));
    }
  }
  function sampleHud() {
    for (const a of w.actors) {
      const cues=procCueRows(a), layout=buffAddendum(buffRows(a),cues,a.skills,16,100,54,6);
      for (const bank of layout.magazines) {
        if (!base.hud.get(a)?.has('buff/'+bank.buff.id) && hud(()=>drawBuffMagazine(ctx,{...bank,rect},cosmeticHotbar())))
          seen.set('skill magazine '+bank.buff.id,true);
      }
      for (const row of layout.strip) {
        if (base.hud.get(a)?.has(row.kind + '/' + row.id)) continue;
        const key = 'buff tile ' + row.id;
        if (!seen.has(key) && buff(row)) seen.set(key, true);
      }
      for (const q of cues) {
        if (q.phase === 'stored' || base.hud.get(a)?.has(q.phase + '/' + q.id)) continue;
        const key = 'proc HUD ' + q.id;
        if (!seen.has(key) && hud(() => drawProcHud(ctx, [q], 64, 64))) seen.set(key, true);
      }
      for (const s of a.statuses) {
        if (base.statuses.get(a)?.has(s.id) || STATUS_DEFS[s.id]?.beneficial) continue;
        const icon = statusIcons(a.statuses, afflictionPressureOf(a)).find(q => q.id === s.id);
        if (icon && hud(() => drawStatusIcons(ctx, [{icon,...rect}]))) seen.set('status icon ' + s.id, true);
      }
    }
  }
  return { sample, sampleHud, seen, failed };
}

function combat(group, id, nodes=[], treeTrial=false) {
  const proc = group === 'Proc' && PROCS[id], def = proc ? SKILLS.cleave : SKILLS[id];
  const {w,p,enemy,target,inst,d} = prepareSkill(def);
  if (d.onGround?.length) {
    // A ground-gated storm cannot boil a dry field. The normal grid and
    // region types drive both the hit test and the renderer's wet-cell clip.
    const grid=new GridWalkField(w.arena.w,w.arena.h,32);
    grid.fillRegion(0,0,w.arena.w,w.arena.h,d.onGround[0]);
    w.walk=grid;
  }
  if (treeTrial) {
    for (const stat of Object.keys(w.meta.baseAttrs)) w.meta.baseAttrs[stat]=200;
    inst.level=MAX_SKILL_LEVEL;
    inst.treeNodes=[...nodes];
    w.recalcSeat(w.localSeat);
    p.skills=[inst]; p.fillResources();
  }
  if (proc) {
    const next = w.createMonster('zombie',1,'enemy'); next.pos = {...enemy.pos,x:enemy.pos.x+12}; next.brain = undefined; w.actors.push(next);
    p.sheet.setSource('coverage-pools', [mod('energyShield','flat',200),mod('poise','flat',150),mod('endurance','flat',200)]);
    p.life -= 200; p.mana -= 100; p.es = 0; p.poise = 0; p.endurance=0;
    if (proc.effect.type === 'cooldown') for (const skill of Object.values(SKILLS).filter(s=>
      (!proc.effect.skills || proc.effect.skills.includes(s.id)) && (proc.effect.tags??[]).every(t=>s.tags.includes(t))).slice(0,8)) {
      const host=makeSkillInstance(skill); p.skills.push(host); p.cooldowns.set(skill.id,5);
    }
    if (proc.effect.type === 'cleanse') for (const [id,s] of Object.entries(STATUS_DEFS)) {
      if (proc.effect.statuses?.includes(id) || proc.effect.hardCC&&s.hardCC || proc.effect.afflictions&&s.dotType) p.applyStatus(id,1,1,'fixture');
    }
    if (proc.effect.type === 'removeBuff') for (const id of [proc.effect.buff].flat()) p.addBuff({id,type:'buff',duration:10,mods:[]});
  }
  const base = {actors:new Set(w.actors), shells:new Set(w.actors.filter(a=>a.shellGuard)), objects:new Set([...w.projectiles,...w.zones,...w.doodads]),
    hud:new Map(w.actors.map(a=>[a,idsOn(a)])), statuses:new Map(w.actors.map(a=>[a,new Set(a.statuses.map(s=>s.id))]))};
  const o = observe(w,base);
  const passiveDelivery=!proc && replenishingDelivery(inst);
  if (proc) {
    const before=buffRows(p);
    w.executeProc(proc,p,inst,enemy);
    for (const row of before) if (proc.effect.type==='removeBuff' && !p.buffs.has(row.id) && [proc.effect.buff].flat().includes(row.id) && buff(row))
      o.seen.set('buff tile removed '+row.id,true);
  }
  else if (!passiveDelivery) {
    const presses = d.type === 'projectile' && d.caroms ? d.caroms.anchors + Number(!!d.caroms.hang) : 1;
    for (let i=0;i<presses;i++) {
      if (!w.executeSkill(p,inst,{x:target.pos.x+i*18,y:target.pos.y})) throw Error('Release refused');
      o.sample();
    }
  }
  o.sample(); o.sampleHud();
  const geometry = [w.projectiles.length, w.tethers.length, ...w.zones.map(z=>z.radius), ...w.projectiles.slice(0,4).map(s=>s.radius),
    ...w.flashes.slice(0,8).map(f=>f.radius)].join(',');
  let scene=proc||treeTrial?[]:witnessScene(w,base);
  for (let i=0;i<40;i++) {
    w.time+=.1;
    for (const f of w.flashes) f.life-=.1;
    w.flashes=w.flashes.filter(f=>f.life>0);
    w.updatePendingBursts(); w.updateDetonations(.1); w.updateRepeats(.1); w.updateProjectiles(.1);
    w.updateLeaps(.1); w.updateZones(.1); w.updateAuras(.1); w.updateConstructs(.1);
    if (w.emergences.length) w.updateEmergences(.1);
    if (passiveDelivery) w.updateReplenishment(.1);
    o.sample();
    if (!proc && !treeTrial && !scene.length && [0,3,10,25].includes(i)) scene=witnessScene(w,base);
  }
  o.sampleHud();
  if (passiveDelivery && !w.actors.some(a=>!base.actors.has(a))) throw Error('Equipped replenishment produced no summon');
  for (const key of o.seen.keys()) if (key.startsWith('impact ')) {
    const voice=key.slice(7), owners=emittedBy.get(voice) ?? new Set();
    owners.add((treeTrial&&nodes.length?'Skill tree '+id+'/'+nodes.at(-1):group+' '+id)); emittedBy.set(voice,owners);
  }
  const misses=[...o.failed].filter(k=>!o.seen.has(k));
  const kind=proc ? proc.effect.type : passiveDelivery?'equipped replenishment':d.type;
  const state=misses.length?'Missing':scene.length?'In game':o.seen.size && (proc||treeTrial)?'Rendered':'Missing';
  return {name:(proc||def).name, state,
    scene, geometry, layers:[...o.seen.keys()].sort(), detail:kind+' · '+(proc?'':scene.length?'Game frame: '+scene.join(', ')+' · ':'No world-frame witness · ')+
      ([...o.seen.keys()].join(' · ') || 'No isolated visual observed')+(misses.length?' · Empty samples: '+misses.join(', '):'')};
}

function statusOrCharge(group,id) {
  const {w,p,enemy}=arena(), charge=group==='Charge', def=charge?CHARGE_DEFS[id]:STATUS_DEFS[id];
  const surfaces=[];
  if (charge) {
    p.gainCharge(id,2,5);
    const row=buffRows(p).find(row=>row.kind==='charge' && row.id===id);
    if (row && buff(row)) surfaces.push('owned charge HUD tile ×'+row.count);
  } else {
    p.applyStatus(id,1,1,'coverage');
    if (def.beneficial) {
      const row=buffRows(p).find(row=>row.kind==='status' && row.id===id);
      if (row && buff(row)) surfaces.push('player buff tile');
    } else {
      const icon=statusIcons(p.statuses,afflictionPressureOf(p)).find(icon=>icon.id===id);
      if (icon && hud(()=>drawStatusIcons(ctx,[{icon,...rect}]))) surfaces.push('player debuff icon');
      const draw=()=>frame(enemy.pos,70,()=>r.drawActor(enemy,w));
      const bare=draw(); enemy.applyStatus(id,1,1,'coverage');
      if (enemy.statuses.some(s=>s.id===id) && ink(draw(),bare)) surfaces.push('enemy body changed');
    }
  }
  const expected=charge||def.beneficial?1:2;
  return {name:def.label,state:surfaces.length===expected?'Rendered':'Missing',detail:surfaces.join(' · ') || 'No visual observed'};
}

function support(id) {
  const {w,p}=arena(), item=supports.get(id), skin=cosmeticHotbar(), faces=new Set(), roles=new Set(), hosts=new Set();
  let cases=0;
  for (const {rolled,levels} of item.variants) {
    for (const {host,links,level} of levels) {
      const inst=makeSkillGem(SKILLS[host],1,'legendary');
      for (const [n,link] of links.entries()) inst.sockets[n]={def:SUPPORTS[link],level:1};
      inst.sockets[links.length]={def:SUPPORTS[id],level,rolled};
      p.skills=[inst]; const mark=supportMarks(w,p,inst).find(m=>m.id===id && m.serving);
      if (!mark) throw Error('Missing socket on '+host);
      hosts.add(host); mark.roles.forEach(role=>roles.add(role));
      // Redraw only distinct combinations of icon and meter art. Every cut
      // and level above goes through the real serving-host admission.
      if (!cases && !hud(()=>drawSupportRail(ctx,[mark],40,65,48,skin))) throw Error('Empty socket art');
      if (mark.useBank && !faces.has(mark.counter)) {
        const cap=p.skillChargeCap(inst);
        if (!hud(()=>drawSupportCounter(ctx,mark,{count:cap,cap},rect,skin))) throw Error('Empty charge display');
        faces.add(mark.counter);
      }
      for (const m of supportMeters([mark])) if (!faces.has(m.counter)) {
        if (!hud(()=>drawSupportMeter(ctx,m,rect,skin))) throw Error('Empty '+m.counter);
        faces.add(m.counter);
      }
      cases++;
    }
  }
  return {name:item.name,state:'Rendered',detail:cases+' level/cut configurations on '+[...hosts].join(', ')+
    ' · socket rail · '+[...roles].join(', ')+(faces.size?' · counter faces: '+[...faces].join(', '):'')+' · trigger timing unverified here'};
}

function passive(group,id) {
  const node=group==='Passive'?PASSIVE_NODES[id]:choices.get(id), grants=newPassiveBuffGrants();
  addPassiveBuffGrant(grants,id,node.name,node.mods??[],node.buffLook);
  const surfaces=[];
  if (grants.gates.length || grants.banks.size) {
    const {p}=arena(); p.passiveBuffGrants=grants;
    for (const {row,mod} of grants.gates) {
      p.sheet.setConditions(mod.when?[mod.when]:[]);
      p.sheet.setGauges(mod.gauge?[[mod.gauge,Math.max(2,mod.gaugeAt??0)]]:[]);
      const actual=buffRows(p).find(r=>r.id===row.id);
      if (!actual || !buff(actual)) throw Error('Gate did not yield '+row.id);
      if (mod.when || mod.unless) p.sheet.setConditions(mod.unless?[mod.unless]:[]);
      if (mod.gauge) p.sheet.setGauges([[mod.gauge,mod.gaugeAt===undefined?0:mod.gaugeAt-1]]);
      if (buffRows(p).some(r=>r.id===row.id)) throw Error('Gate stayed visible '+row.id);
      surfaces.push('HUD gate '+[mod.when,mod.unless&&'unless '+mod.unless,mod.gauge].filter(Boolean).join(' / '));
    }
    for (const [gauge,{art}] of grants.banks) {
      p[art.field]=3;
      const actual=buffRows(p).find(r=>r.label===art.label);
      if (!actual || !buff(actual)) throw Error('Bank did not yield '+gauge);
      surfaces.push('HUD bank '+gauge);
    }
  }
  const refs=[...grants.procs.keys()].map(id=>'proc '+id);
  const triggered=[];
  if (grants.procs.size) {
    const {w,p,enemy}=arena();
    if (group==='Passive') {
      w.meta.allocated.add(node.id); w.recalcSeat(w.localSeat);
    } else {
      p.sheet.setSource('coverage-choice',node.mods??[]); p.passiveBuffGrants=grants;
    }
    p.sheet.setSource('coverage-accuracy',[mod('accuracy','flat',100000)]);
    const recorded=new Set(), original=w.executeProc;
    w.executeProc=function(proc,owner,...args) {
      if (owner===p && grants.procs.has(proc.id) && p.passiveBuffGrants?.procs.get(proc.id)?.some(s=>s.name===node.name)) recorded.add(proc.id);
      return original.call(this,proc,owner,...args);
    };
    const hosts=['cleave','frostbolt'].map(k=>makeSkillInstance(SKILLS[k]));
    p.skills=hosts;
    for (let i=0;i<12 && !enemy.dead && recorded.size<grants.procs.size;i++) {
      if (i===11) enemy.life=1;
      w.executeSkill(p,hosts[i%hosts.length],enemy.pos);
      w.time+=.2;w.updateProjectiles(.2);w.updateZones(.2);
    }
    for (const proc of recorded) triggered.push('dispatched '+proc+' on a native attack or spell with the grant installed');
  }
  if (node.graft) refs.push('graft '+node.graft.support);
  if (node.choice) refs.push('choice '+(node.choice.group??node.choice.id));
  const stats=[...new Set((node.mods??[]).map(m=>m.stat))];
  const attributesOnly=(node.attributes||node.attributesPct) && !stats.length && !node.graft && !node.conduit && !node.choice;
  return {name:node.name,state:surfaces.length?'Rendered':triggered.length?'Triggered':attributesOnly?'Attributes':'Mapped',detail:[...surfaces,...triggered,...refs,
    ...(stats.length?['modifiers '+stats.join(', ')]:[]),...(node.attributes||node.attributesPct?['attributes']:[]),
    surfaces.length?'Controlled HUD state':triggered.length?'Resolved proc art is listed under its own ID':attributesOnly?'Attribute grant':'Individual encounter activation unverified'].join(' · ')};
}

// A short AI encounter cannot guarantee that it selects every move. Recast
// the remaining listed moves on their actual monster body in fresh worlds.
// Keep these receipts separate from the choices the AI made itself.
function kitMoveFrame(actorId,skillId) {
  const def=SKILLS[skillId]; if (!def) return false;
  const {w,p}=arena(), owner=w.createMonster(actorId,1,'enemy');
  owner.pos={x:p.pos.x-65,y:p.pos.y};owner.spawnedAt=-100;
  const inst=owner.skills.find(s=>s?.def.id===skillId);
  if (!inst) return false;
  const enemy=w.createMonster('zombie',1,'enemy',owner);
  enemy.pos={x:owner.pos.x+20,y:owner.pos.y};enemy.life*=.35;enemy.brain=undefined;
  w.actors=[owner,p,enemy];w.flashes=[];
  const target=['ally','minion'].includes(def.targeting?.target)?enemy:p;
  w.corpses[0].pos={...target.pos};
  for (const s of [def.targeting?.requiresStatus??[]].flat()) target.applyStatus(s,1,2,'coverage');
  if (def.pool) owner.pools.set(def.pool.id,def.pool.cap);
  if (def.invokes) owner.runes=['rime','rime'];
  const base={actors:new Set(w.actors),objects:new Set(),shells:new Set(w.actors.filter(a=>a.shellGuard))};
  if (!w.executeSkill(owner,inst,target.pos)) return false;
  for (let i=0;i<40;i++) {
    if ([0,1,4,12,25,39].includes(i) && witnessScene(w,base).length) return true;
    w.time+=.1;w.updateDetonations(.1);w.updateRepeats(.1);w.updateProjectiles(.1);
    w.updateLeaps(.1);w.updateZones(.1);w.updateAuras(.1);w.updateConstructs(.1);
    if (w.emergences.length) w.updateEmergences(.1);
    for (const f of w.flashes) f.life-=.1;
    w.flashes=w.flashes.filter(f=>f.life>0);
  }
  return false;
}

function actorKit(id) {
  const def=MONSTERS[id], {w,p}=arena(), actor=w.createMonster(id,1,'enemy');
  const ally=w.createMonster('zombie',1,'enemy');ally.brain=undefined;ally.life*=.35;ally.pos={x:800,y:725};
  w.actors=[p,actor,ally]; p.skills=[]; p.pos={x:700,y:700}; actor.pos={x:782,y:700};
  actor.spawnedAt=-100; actor.facing=Math.PI; actor.facingPrev=Math.PI;
  const releases=new Set(), original=w.executeSkill;
  w.executeSkill=function(owner,inst,...args) {
    const result=original.call(this,owner,inst,...args);
    if (result && owner===actor) releases.add(inst.def.id);
    return result;
  };
  const base={actors:new Set(w.actors),objects:new Set(),shells:new Set(w.actors.filter(a=>a.shellGuard))};
  let scene=[], ticks=0;
  const sampled=new Set();
  for (let tick=0;tick<120 && !actor.dead && !p.dead;tick++) {
    if (tick===40 || tick===80) {
      if (scene.length && def.skills.every(k=>releases.has(k))) break;
      if (tick===40) p.pos=w.clampPos({x:actor.pos.x+230,y:actor.pos.y},p.radius);
      else { actor.life=Math.min(actor.life,actor.maxLife()*.28); p.pos=w.clampPos({x:actor.pos.x+45,y:actor.pos.y},p.radius); }
    }
    for (const body of w.actors) updateAI(body,w,.1);
    w.update(.1);
    ticks++;
    for (const f of w.flashes) {
      if (!f.fx || sampled.has(f.fx) || f.mechanicLink || !effectVoiceOf(f.fx)) continue;
      // Keep encounter receipts separate from native-release ownership. A
      // kit's on-death or phase script can emit art absent from all base casts.
      const key='AI encounter '+id, sources=emittedBy.get(f.fx)??new Set();
      if (sources.size && !sources.has(key)) continue;
      if (ink(frame(f.pos,Math.max(48,f.radius*2.6),()=>r.drawTerrainFlash(f,w)))) {
        sampled.add(f.fx); sources.add(key); emittedBy.set(f.fx,sources);
      }
    }
    if (!scene.length && (w.flashes.length||w.projectiles.length||w.zones.length||w.tethers.length||actor.activeAuras.size||w.actors.some(a=>!base.actors.has(a))))
      scene=witnessScene(w,base);
  }
  const pending=def.skills.filter(k=>!releases.has(k));
  const controlled=pending.filter(k=>kitMoveFrame(id,k));
  const unwitnessed=pending.filter(k=>!controlled.includes(k));
  return {name:def.name,state:scene.length?'In game':sampled.size?'Rendered':controlled.length?'Controlled cast':releases.size?'Exercised':'Unobserved',
    detail:(ticks/10)+'s AI encounter'+(ticks>40?' with a ranged phase':'')+(ticks>80?' and a wounded phase':'')+' · '+(releases.size?'released '+[...releases].join(', '):'no completed native release')+
      (scene.length?' · game-frame layers '+scene.join(', '):'')+(sampled.size?' · sampled encounter effects '+[...sampled].join(', '):'')+
      (pending.length?' · AI did not release '+pending.join(', '):!def.skills.length?' · no listed native skill IDs':'')+
      (controlled.length?' · visible in controlled owner casts for '+controlled.join(', '):'')+
      (unwitnessed.length?' · owner-frame evidence still missing for '+unwitnessed.join(', '):'')+
      ' · scripted phases and terrain conditions may need a different encounter'};
}

function inspect(group,id) {
  if (group==='Mechanic silhouette') {
    silhouettes ??= mechanicStudy();
    return silhouettes.rows.find(r=>r.id===id);
  }
  if (group==='Payload family') return {state:'Mapped',detail:'Declared by '+[...payloads.get(id)].join(', ')+'. A native release does not independently prove every payload branch.'};
  if (group==='Actor skill kit') return actorKit(id);
  if (group==='Skill'||group==='Proc') return combat(group,id);
  if (group==='Status'||group==='Charge') return statusOrCharge(group,id);
  if (group==='Support') return support(id);
  if (group==='Skill tree') {
    const {skill,entry}=skillNodes.get(id), graph=treeGraph(skill);
    const path=[entry.id]; let at=entry;
    while (at.depth>1) {
      const parent=at.links.map(k=>graph.nodes.get(k)).find(n=>n && n.depth===at.depth-1);
      if (!parent) throw Error('No reachable prerequisite for '+at.id);
      path.unshift(parent.id); at=parent;
    }
    function sample(nodes) {
      const key=skill.id+'/'+nodes.join('/');
      if (!treeSamples.has(key)) {
        const test=combat('Skill',skill.id,nodes,true);
        treeSamples.set(key,{layers:test.layers,geometry:test.geometry});
      }
      return treeSamples.get(key);
    }
    const control=sample(path.slice(0,-1)), changed=sample(path);
    const added=changed.layers.filter(k=>!control.layers.includes(k)), removed=control.layers.filter(k=>!changed.layers.includes(k));
    const delta=[...added.map(k=>'appeared: '+k),...removed.map(k=>'removed: '+k)];
    if (control.geometry!==changed.geometry) delta.push('release count or geometry changed');
    return {name:entry.node.name,state:delta.length?'Changed':'Exercised',detail:skill.name+' · controlled release with and without '+entry.node.name+
      ' · '+(delta.join(', ')||'same measured layers and release geometry; conditional or stat changes unverified')};
  }
  if (group==='Passive'||group==='Passive choice') return passive(group,id);
  const sources=group==='Effect voice'&&emittedBy.get(id);
  if (sources?.size) return {state:'Rendered',detail:'Captured from '+[...sources].join(', ')};
  const f={fx:id,pos:center,radius:45,color:'#7cbfd3',life:.7,maxLife:1,facing:.3,shape:0};
  // These voices deliberately draw nothing without their event payload.
  // A negative swatch cannot establish that a resolved, typed event is blank.
  if (id==='refuge') f.departure=refugeDeparture(arena().enemy,{x:90,y:50}).cue;
  if (id==='battle_doctrine') f.doctrineCue={kind:'meter',count:3,max:5};
  if (id==='defenseCue') f.defenseCue={kind:'shell',event:'break',arc:Math.PI,facing:.4};
  if (id==='summon_pact') f.summonPactCue={kind:'part',shape:'bone'};
  const paints={
    'Effect voice':()=>effectVoiceOf(id)(ctx,f,.7),
    'Mechanic link':()=>drawMechanicLink(ctx,id,{x:16,y:48},{x:110,y:84},MECHANIC_LINKS[id].color,.7),
    'Mechanic field':()=>drawMechanicField(ctx,{kind:id,pos:center,tier:0,remain:2,radius:40},2),
    'Mechanic mark':()=>{ctx.translate(64,64);drawMechanicMarks(ctx,[{id,stacks:2}],15,2);},
  };
  const visible=hud(paints[group]);
  return {state:visible?'Painter':'Unobserved',detail:visible?'Isolated registered art; owning encounter unverified':'No pixels with the neutral specimen; check the required event parameters'};
}
export function run(group,ids) {
  const original=Math.random;
  try {
    return ids.map(id=>{
      try {return {group,id,...inspect(group,id)};}
      catch(e) {return {group,id,state:'Error',detail:String(e?.stack||e).split('\n').slice(0,3).join(' ')};}
    });
  } finally {Math.random=original;}
}
