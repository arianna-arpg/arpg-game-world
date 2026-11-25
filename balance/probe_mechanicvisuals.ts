import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { CHOICE_GROUPS } from '../src/data/passiveChoices';
import { procReceiptMark } from '../src/data/procCues';
import { STATUS_DEFS } from '../src/engine/status';
import { PROCS, type ProcEffect } from '../src/data/procs';
import { PASSIVE_NODES } from '../src/data/passives';
import { MECHANIC_BURSTS, MECHANIC_FIELDS, MECHANIC_FIELD_KINDS, type MechanicFieldKind, mechanicBurst, procImpactVoice, type MechanicBurst } from '../src/data/mechanicVisuals';
import { SHRINES } from '../src/data/shrines';
import { REMNANT_KINDS } from '../src/data/remnants';
import { BUFF_LOOKS, GRANTED_BUFF_LOOKS, procBuffLook } from '../src/data/buffLooks';
import { SKILL_BURSTS } from '../src/data/skillVisuals';
import { SKILL_STRIKES } from '../src/data/skillStrikeVisuals';
import { SKILL_FLIGHTS, SKILL_FIELDS, SKILL_BEAMS } from '../src/data/skillFlightVisuals';
import { SKILL_TARGETS } from '../src/data/skillTargetVisuals';
import { SKILL_PRESENCES } from '../src/data/skillPresenceVisuals';
import { SKILL_SELFS } from '../src/data/skillSelfVisuals';
import { SKILL_MOVEMENTS } from '../src/data/skillMovementVisuals';
import { effectVoiceOf } from '../src/render/vis/effectVoice';
import '../src/render/vis/mechanicVisuals';
import { buffRows, buffRowDetails } from '../src/engine/buffPresentation';
import { attackSequenceOf } from '../src/engine/attackSequenceSpec';
import { projectileArtsOf } from '../src/engine/projectileArtsSpec';
import { guardArtsOf } from '../src/engine/guardArtsSpec';
import { companionBondOf } from '../src/engine/companionSpec';
import { throngEvolution } from '../src/engine/throngEvolution';
import { challengeOf } from '../src/engine/challengeSpec';
import { treeGraph } from '../src/engine/skilltree';
import { instanceEffects, instanceChargeGain, instanceConduits, instanceFollowUps, instanceTrigger, makeSkillInstance, type SkillEffect, type SkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { mechanicMarks } from '../src/engine/mechanicMarks';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import type { Actor } from '../src/engine/actor';
import { statusIcons } from '../src/render/vis/statusIcons';
import { afflictionPressureOf } from '../src/engine/afflictionPressure';

seedGlobalRandom(671);
const w=makeSimWorld('warrior',671), p=w.player;
const deliveryFamilies=[SKILL_STRIKES,SKILL_MOVEMENTS,SKILL_FLIGHTS,SKILL_FIELDS,SKILL_BEAMS,SKILL_TARGETS,SKILL_PRESENCES,SKILL_SELFS,SKILL_BURSTS];
// Where a resolved payload already has a native visual owner. A new engine
// effect must select its in-game surface even if no default skill uses it yet.
const payloadSurface = {
  damage:'strike',status:'status',buff:'buff row',knockback:'body motion',pull:'body motion',
  spawnZone:'field',gainCharge:'charge bank',absorb:'defense bar',restore:'resource bar',terrain:'terrain',
  recallMinions:'companion',drainCharge:'charge bank',heal:'recovery',cleanse:'status',shed:'body motion',
  commandMinions:'companion',ironWard:'ward bank',guardSurge:'guard',reduceCooldowns:'skill slot',
  relocateConstruct:'construct',restoreOverTime:'resource bar',ward:'defense bar',siphonOrb:'pickup',
  detonateMinions:'companion',spawnCorpse:'corpse',dragCorpses:'corpse',shatterConstructs:'construct',
  minionCast:'companion cast',payLedger:'debt',spreadStatus:'status transfer',siphonStatus:'status transfer',
  transfuseStatus:'status transfer',recallImpales:'impale',tame:'companion',whistleCompanion:'companion',
  companionStance:'stance',restoreSkillCharges:'skill slot',conjure:'body',kindle:'field',townPortal:'portal',
  throngDirect:'swarm',grabSeize:'body motion',grabThrow:'body motion',mimicSelect:'skill slot',
  possess:'body',possessEnd:'body',shapeshift:'body',litePour:'swarm',lure:'body',vent:'field',
  rupture:'bank payout',birth:'body',
} satisfies Record<SkillEffect['type'],string>;
const payloads=new Set<string>();
let treeNodes=0, patches=0, followUps=0, grafts=0, passiveProcRefs=0, passiveStatusRefs=0;
const options=Object.values(CHOICE_GROUPS).flatMap(group=>group.options);
for(const grant of [...Object.values(PASSIVE_NODES),...options]) {
  if(grant.graft) { assert(SUPPORTS[grant.graft.support],grant.id); grafts++; }
  for(const mod of grant.mods ?? []) {
    if(mod.stat.startsWith('proc_')) { assert(PROCS[mod.stat.slice(5)],grant.id+' '+mod.stat); passiveProcRefs++; }
    if(mod.stat.startsWith('apply_')) { assert(STATUS_DEFS[mod.stat.slice(6)],grant.id+' '+mod.stat); passiveStatusRefs++; }
  }
}
const granted=new Set<string>();
const treeArts={attackSequence:attackSequenceOf,projectileArts:projectileArtsOf,guardArts:guardArtsOf,
  companionBond:companionBondOf,throngEvolution,challenge:challengeOf} as const;
let artPatches=0;
for (const s of Object.values(SKILLS)) {
  assert.equal(deliveryFamilies.filter(table=>Object.hasOwn(table,s.id)).length,1,s.id+' requires an authored delivery');
  for(const effect of s.effects) {
    assert(payloadSurface[effect.type],s.id);
    payloads.add(effect.type);
  }
  for (const {node} of treeGraph(s)?.nodes.values() ?? []) {
    treeNodes++;
    if(node.graft) { assert(SUPPORTS[node.graft.support],node.id); grafts++; }
    const inst=makeSkillInstance(s); inst.treeNodes=[node.id];
    if(node.trigger) assert.equal(instanceTrigger(inst),node.trigger,node.id);
    for(const key of Object.keys(treeArts) as (keyof typeof treeArts)[]) {
      const patch=node[key]; if(!patch) continue;
      const resolved=treeArts[key](inst) as Record<string,unknown> | undefined;
      assert(resolved,node.id+' failed to resolve '+key);
      for(const [field,value] of Object.entries(patch)) {
        const actual:unknown=resolved[field];
        if(Array.isArray(value)) assert(Array.isArray(actual) && value.every(v=>actual.includes(v)),node.id+' '+field);
        else assert.deepEqual(actual,value,node.id+' '+field);
      }
      artPatches++;
    }
    for(const gain of node.chargeGain ?? []) assert(instanceChargeGain(inst).includes(gain),node.id);
    for(const conduit of node.conduits ?? []) assert(instanceConduits(inst).includes(conduit),node.id);
    for(const follow of node.followUps ?? []) {
      assert(SKILLS[follow.skillId] && instanceFollowUps(inst).some(f=>f.skillId===follow.skillId),node.id); followUps++;
    }
    for(const effect of node.utilityEffects ?? []) assert(payloadSurface[effect.type],node.id);
    if (!node.buffs?.length) continue;
    for (const patch of node.buffs) {
      patches++;
      if (patch.duration === undefined || s.effects.some(e=>e.type==='buff' && e.id===patch.id)) continue;
      const resolved=instanceEffects(inst).find(e=>e.type==='buff' && e.id===patch.id);
      assert(resolved?.type==='buff' && resolved.skillTreeGrants?.includes(node.name),node.id);
      assert(resolved.buffLook ?? GRANTED_BUFF_LOOKS[patch.id],patch.id+' requires an independent tree face');
      granted.add(patch.id);
    }
  }
}
const procSurfaces={
  extraHit:'impact',explosion:'impact',arc:'impact',collisionDamage:'impact',displace:'impact',burst:'impact',delayedBurst:'impact',
  gainCharge:'hud',buff:'hud',heal:'hud',restore:'hud',fortify:'hud',cooldown:'hud',removeBuff:'hud',ward:'hud',cleanse:'hud',
  status:'status',cast:'cast',summon:'body',birth:'body',kindle:'field',vent:'field',
} satisfies Record<ProcEffect['type'],string>;
const impactArt=new Set<string>();
let impacts=0;
for (const proc of Object.values(PROCS)) {
  const surface=procSurfaces[proc.effect.type]; assert(surface,proc.id);
  if(proc.effect.type==='buff') assert(procBuffLook(proc.id,proc.effect.buff),proc.id+' requires identifiable buff art');
  if(proc.effect.type==='cast') assert(SKILLS[proc.effect.cast.skillId],proc.id);
  if(proc.effect.type==='status') assert(STATUS_DEFS[proc.effect.status],proc.id);
  if(['gainCharge','heal','restore','fortify','cooldown','ward','cleanse'].includes(proc.effect.type)) {
    assert(proc.procCue===false || proc.announceName===false || proc.procCue?.subject || procReceiptMark(proc.id),proc.id+' needs a receipt emblem');
  }
  if(surface==='impact') {
    assert(proc.impactFx || Object.hasOwn(MECHANIC_BURSTS,proc.id),proc.id+' requires an intentional impact');
    const voice=procImpactVoice(proc);
    assert(effectVoiceOf(voice),proc.id);
    const material=proc.impactFx ?? JSON.stringify(MECHANIC_BURSTS[proc.id as MechanicBurst]);
    assert(!impactArt.has(material),proc.id+' duplicates another native impact'); impactArt.add(material);
    impacts++;
  }
}
for(const shrine of SHRINES) assert(shrine.buffLook ?? GRANTED_BUFF_LOOKS['shrine_'+shrine.id],shrine.name);
for(const remnant of Object.values(REMNANT_KINDS)) if(remnant.buff) {
  assert(remnant.buff.buffLook ?? GRANTED_BUFF_LOOKS[remnant.buff.id] ?? BUFF_LOOKS[remnant.buff.id],remnant.id);
}
assert.deepEqual(['fire','cold','lightning'].map(key=>MECHANIC_BURSTS[('triune_'+key) as MechanicBurst].motif),
  ['flame','ice','sparks'],'Triune should distinguish outgoing elements by shape');
for (const key of Object.keys(MECHANIC_BURSTS) as MechanicBurst[]) assert(effectVoiceOf(mechanicBurst(key)),key);
console.log('Census:',Object.keys(SKILLS).length,'authored casts,',Object.keys(PASSIVE_NODES).length,'passive nodes,',treeNodes,'skill-tree nodes,',
  patches,'buff patches,',granted.size,'distinct added buffs,',Object.keys(PROCS).length,'procs,',impacts,'independent proc impacts');

console.log('Resolved:',options.length,'passive options,',passiveProcRefs,'passive proc grants,',passiveStatusRefs,'status grants,',
  grafts,'support grafts,',artPatches,'combat-art patches,',followUps,'tree follow-ups,',payloads.size,'native skill payload families,',Object.keys(MECHANIC_BURSTS).length,'registered impact materials');

function enemy(x:number,y:number) {
  const a=w.createMonster('zombie',1,'enemy'); a.brain=undefined; a.pos={x:p.pos.x+x,y:p.pos.y+y};
  a.sheet.setSource('rig',[mod('life','override',5000),mod('evasion','override',0),mod('armor','override',0)]);
  a.fillResources(); w.actors.push(a); return a;
}
w.actors=[p]; const foes=[enemy(65,0),enemy(0,80),enemy(-65,0),enemy(0,-90),enemy(330,0)];
w.meta.allocated.add('exp_p14_int_omnitempest'); w.recalcSeat(w.localSeat);
p.sheet.setSource('rig',[mod('accuracy','flat',1e6),mod('critChance','override',0)]);
const sim=w as unknown as {resolveHit(caster:Actor, inst:SkillInstance,target:Actor):void};
for (const [input,result] of [['fire','cold'],['cold','lightning'],['lightning','fire']] as const) {
  const inst=makeSkillInstance({...SKILLS.cleave,tags:['attack','melee',input],baseDamage:{[input]:[100,100]},effects:[{type:'damage'}]});
  w.time+=2; w.flashes=[]; const before=foes[1].life;
  sim.resolveHit(p,inst,foes[0]);
  const bursts=w.flashes.filter(f=>f.fx===mechanicBurst(`triune_${result}`));
  assert.equal(bursts.length,1,input); assert.equal(bursts[0].radius,150*p.sheet.get('aoeRadius'));
  assert.deepEqual(bursts[0].pos,foes[0].pos); assert(foes[1].life<before);
  sim.resolveHit(p,inst,foes[0]); assert.equal(w.flashes.filter(f=>f.fx===bursts[0].fx).length,1,'ICD must stay quiet');
}
w.meta.allocated.add('exp_p18_int_tractor_beams'); w.recalcSeat(w.localSeat);
for (let i=0;i<7;i++) w.update(.1);
const links=()=>w.flashes.filter(f=>f.mechanicLink?.kind==='tractorTetherPower');
assert.equal(links().length,3); assert.deepEqual(links().map(f=>f.mechanicLink!.to),foes.slice(0,3).map(a=>a.id));
assert(links().every(f=>f.mechanicLink!.from===p.id)); assert(foes[0].pos.x<p.pos.x+65,'actual pull');
const client=makeSimWorld('warrior',681);
foes[0].addRivenStack(2);
foes[0].addBuff({type:'buff',id:'feral_hangover',mods:[],duration:3});
assert(!buffRows(foes[0]).some(r=>r.id==='feral_hangover'));
const marks=mechanicMarks(foes[0],w.time);
assert.equal(statusIcons([],afflictionPressureOf(foes[0]),false,marks).find(m=>m.id==='mechanic:riven')?.stacks,2);
const fieldRuntime=w as unknown as {spawnPowerBlob(a:Actor,at:Actor['pos'],power:number,tier:number):void};
fieldRuntime.spawnPowerBlob(p,foes[4].pos,1,p.tier);
const field=w.mechanicFields().find(f=>f.kind==='powerBlobs')!;
assert(field && MECHANIC_FIELDS[field.kind].subject==='droplet');
applySnapshot(client,serializeSnapshot(w,1));
const mirrorLinks=client.flashes.filter(f=>f.mechanicLink).map(f=>f.mechanicLink!);
assert.equal(mirrorLinks.length,3);
for (const [i,link] of mirrorLinks.entries()) {
  assert.equal(client.actorById(link.from),client.player);
  assert.deepEqual(client.actorById(link.to)?.pos,foes[i].pos);
}
assert.deepEqual(client.mechanicFields(),w.mechanicFields()); assert.deepEqual(mechanicMarks(client.actorById(mirrorLinks[0].to)!,client.time),marks);
w.meta.allocated.delete('exp_p18_int_tractor_beams'); w.recalcSeat(w.localSeat); p.pos={...field.pos};
for(let i=0;i<9;i++) w.update(.1);
assert.equal(links().length,0); assert(!w.mechanicFields().some(f=>f.kind==='powerBlobs'));
applySnapshot(client,serializeSnapshot(w,2));
assert(!client.flashes.some(f=>f.mechanicLink)); assert.equal(client.mechanicFields().length,0);
// All object types cross the wire at their own position and floor. Exercise
// just the projection here; the live pickup above uses the ordinary update.
const lists=w as unknown as Record<MechanicFieldKind,{pos:Actor['pos'];tier:number;remain:number;radius?:number}[]>;
for(const [i,kind] of MECHANIC_FIELD_KINDS.entries()) {
  lists[kind].push({pos:{x:300+i*11,y:170+i*7},tier:i%2,remain:4+i,radius:52+i});
}
const packet=serializeSnapshot(w,3); applySnapshot(client,packet);
assert.deepEqual(client.mechanicFields().map(f=>f.kind),MECHANIC_FIELD_KINDS);
assert.deepEqual(client.mechanicFields(),w.mechanicFields());
lists.wickerDecoys[0].pos.x+=15;
assert.notEqual(client.mechanicFields()[0].pos.x,lists.wickerDecoys[0].pos.x);
w.loadZone('sim_arena');
assert.equal(w.mechanicFields().length,0,'zone-local objects must retire on travel');
applySnapshot(client,serializeSnapshot(w,4)); assert.equal(client.mechanicFields().length,0);
w.meta.allocated.add('exp_p17_int_residual_energy'); w.recalcSeat(w.localSeat);
p.spellImprint={type:'cold',charges:2,remain:6}; p.attackImprint={charges:1,remain:3};
assert.deepEqual(buffRows(p).filter(b=>b.id.endsWith('Imprint')).map(b=>[b.look.subject,b.count,b.remaining]),[['ice',2,6],['fist',1,3]]);
w.meta.allocated.delete('exp_p17_int_residual_energy'); w.recalcSeat(w.localSeat);
assert(!buffRows(p).some(b=>b.id.endsWith('Imprint')));
const inst=makeSkillInstance(SKILLS.dash);
const picked=[...treeGraph(inst.def)!.nodes.values()].find(g=>g.node.buffs?.some(b=>b.id==='dash_escape' && b.duration))!;
inst.treeNodes=[picked.id];
const buff=instanceEffects(inst).find(e=>e.type==='buff' && e.id==='dash_escape')!;
assert(buff.type==='buff'); p.addBuff(buff); const row=buffRows(p).find(b=>b.id==='dash_escape')!;
assert(row.effectFace && row.label===picked.node.name); assert(buffRowDetails(p,row).some(line=>line.includes('Skill tree')));
console.log('PASS real elemental transitions, shared cooldown, target cap, active links, tree buff provenance, danger marks, pickup, refund and co-op retirement');
