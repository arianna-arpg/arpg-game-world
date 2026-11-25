import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SUPPORTS } from '../src/data/supports';
import { SKILLS } from '../src/data/skills';
import { PROCS } from '../src/data/procs';
import { visualRoleForStat, type SupportRole } from '../src/data/supportVisuals';
import { multipleSupportBuffs, supportMarks, supportMeters, supportRoles } from '../src/engine/supportPresentation';
import { buffAddendum } from '../src/render/vis/buffAddendum';
import { wornBuffRows } from '../src/engine/buffPresentation';
import { CHARGE_DEFS } from '../src/engine/charges';
import { ITEM_AFFIXES } from '../src/data/itemaffixes';
import { makeSkillGem, type SkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import type { Actor } from '../src/engine/actor';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { SUPPORT_ICON_CATALOG } from '../src/render/supportIconCatalog';
import { skillIconKey, supportIconFace, SKILL_ICONS } from '../src/render/skillIcons';
import { useChargeSupport } from '../src/engine/skills';
import { socketExample, counterExamples, slotFitExamples } from '../scripts/hotbar-study/socketExample';
import { supportCounterLayout, compactChargeCounters, type CounterSlot } from '../src/render/vis/supportCounterLayout';
import { counterGroupSize } from '../src/render/vis/supportCounters';
import { VIS_CFG } from '../src/render/vis/visConfig';
import { supportRailLayout } from '../src/render/vis/supportRail';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';

type Painting = {kind:string; id:string; src:string; imageSha256:string};
const {entries} = JSON.parse(readFileSync('site/assets/art/icons/manifest.json','utf8')) as {entries:Painting[]};
const paintings = entries.filter(e=>e.kind==='support');
const defs=Object.values(SUPPORTS);
const capacityAffixes=Object.keys(ITEM_AFFIXES).filter(id=>id.startsWith('fount_cap_')).sort();
assert.deepEqual(capacityAffixes,Object.entries(CHARGE_DEFS).filter(([,d])=>d.capacityAffix).map(([id])=>'fount_cap_'+id).sort());
for (const id of ['riposte','verdict']) {
  assert.equal(CHARGE_DEFS[id].hud,'slot');
  assert.ok(!capacityAffixes.includes('fount_cap_'+id),'A command counter alone cannot introduce an equipment roll');
}
assert.deepEqual(paintings.map(p=>p.id).sort(),defs.map(d=>d.id).sort());
assert.equal(new Set(paintings.map(p=>p.imageSha256)).size,defs.length,'each support has its own selected painting');
for(const p of paintings)
  assert.equal(createHash('sha256').update(readFileSync('site/'+p.src)).digest('hex'),p.imageSha256,p.id);
assert.deepEqual(Object.keys(SUPPORT_ICON_CATALOG).sort(),defs.map(d=>d.id).sort(),'every socket has its own engraving');
const outlines=new Set<string>();
for (const d of defs) {
  const key=skillIconKey(supportIconFace(d));
  assert.equal(key,'support:'+d.id);
  assert.equal(SKILL_ICONS[key].source,'hollow-wake/supports/'+d.id);
  const geometry=JSON.stringify(SKILL_ICONS[key].layers);
  assert.ok(!outlines.has(geometry),'duplicate engraving for '+d.id);
  outlines.add(geometry);
}
const seen=new Set<SupportRole>(), missing=new Set<string>();
let multi=0;
for(const def of defs) {
  const roles=supportRoles(def);
  assert.ok(roles.length,def.id);
  if(roles.length>1) multi++;
  for(const role of roles) seen.add(role);
  const rolled=def.rollBase?.axes.flatMap(axis=>axis.rows.flatMap(row=>row.mods ?? [])) ?? [];
  for(const m of [...def.mods,...(def.perLevel ?? []),...rolled]) {
    if(m.stat.startsWith('proc_')) assert.ok(PROCS[m.stat.slice(5)],def.id+' refers to '+m.stat);
    else if(!visualRoleForStat(m.stat)) missing.add(m.stat);
  }
}
assert.deepEqual([...missing].sort(),[],'every current stat has an intentional role');
function expectRoles(id:string, yes:SupportRole[], no:SupportRole[]=[]) {
  const actual=supportRoles(SUPPORTS[id]);
  for(const r of yes) assert.ok(actual.includes(r),id+' needs '+r);
  for(const r of no) assert.ok(!actual.includes(r),id+' should not claim '+r);
}
expectRoles('wrathful_edge',['gain'],['target']);
expectRoles('parasitic_pact',['recovery','proc'],['target','buff']);
expectRoles('sainted_ash',['field','recovery','proc']);
expectRoles('fresh_ranks',['companion','buff']);
expectRoles('summon_phantasm',['companion','proc'],['target']);
expectRoles('skewering_blows',['target'],['proc','field']);
expectRoles('frostbite_grip',['target']);
expectRoles('metronome',['buff','proc']);
assert.equal(multipleSupportBuffs(SUPPORTS.metronome),false);
assert.equal(multipleSupportBuffs(SUPPORTS.fevered_hands),true);
expectRoles('building_rhythm',['stack']);
assert.deepEqual([supportRailLayout(5,48).visible,supportRailLayout(5,24).hidden],[5,3]);

// Each gallery example must survive the normal inventory socket path.
const examples=counterExamples();
assert.equal(new Set(examples.map(e=>e.mark.counter)).size,examples.length,'every different reading has distinct thematic art');
const counted=defs.filter(d=>examples.some(e=>e.mark.id===d.id));
for (const d of defs) assert.equal(!!d.presentation?.counter,counted.includes(d),d.id+' orphan or missing counter art');
const cfg=VIS_CFG.buffMagazine;
const overlaps=(a:{x:number;y:number;w:number;h:number},b:typeof a)=>
  a.x < b.x+b.w-.0001 && b.x < a.x+a.w-.0001 && a.y < b.y+b.h-.0001 && b.y < a.y+a.h-.0001;
for(const width of [28,38,40,54]) for(const count of [1,2,3,4,5,8]) for(let anchor=0;anchor<8;anchor++) {
  for(const crowded of [false,true]) {
    const slots:CounterSlot[]=Array.from({length:8},(_,i)=>({meters:i===anchor?count:crowded && i%2===0?3:0,
      magazines:crowded && i%3===0?2:0,meta:crowded && i%2===1}));
    const layout=supportCounterLayout(slots,12,200,width,6);
    const rects=layout.groups.flatMap(g=>[...g.meters,...g.magazines]);
    assert.equal(layout.groups[anchor].meters.length,count);
    layout.groups.forEach((g,j)=>{
      const left=12+j*(width+6);
      for(const r of [...g.meters,...g.magazines]) assert.ok(r.x>=left && r.x+r.w<=left+width,'every mark stays within its own hotbar slot');
    });
    for(const [i,r] of rects.entries()) {
      assert.ok(r.w>=Math.min(width-2*cfg.inset,cfg.minCounterWidth) && r.x>=12 && r.x+r.w<=12+8*(width+6)-6);
      assert.ok(r.y>200-layout.clearance && r.y+r.h<=200-cfg.slotClearance);
      assert.ok(!rects.slice(i+1).some(b=>overlaps(r,b)),'counters and magazines keep exclusive hitboxes');
      for(let j=0;j<slots.length;j++) if(slots[j].meta) assert.ok(!overlaps(r,{x:12+j*(width+6),y:178,w:width,h:14}));
    }
  }
}
const dense=Array.from({length:8},()=>({meters:5,magazines:1,meta:true}));
for(const width of [28,38,54]) {
  const bar=supportCounterLayout(dense,0,180,width,6);
  for(const [i,g] of bar.groups.entries()) {
    assert.equal(g.meters.length,5);
    for(const r of [...g.meters,...g.magazines]) assert.ok(r.x>=i*(width+6) && r.x+r.w<=i*(width+6)+width);
    assert.equal(g.meters.at(-1)!.w,width-2*cfg.inset);
  }
}
assert.deepEqual([3,6,8,12,15,101,10000].map(n=>counterGroupSize(n,6)),[1,1,2,2,5,20,2000]);
slotFitExamples((world,stage)=>{
  const p=world.player, lmb=p.skills[0]!, rmb=p.skills[1];
  if(stage==='solo') {assert.deepEqual(supportMarks(world,p,lmb).map(m=>m.id),['building_rhythm']);return;}
  assert.equal(p.skillChargeCap(lmb),12);
  assert.deepEqual(supportMarks(world,p,lmb).find(m=>m.fuelBank)?.meter,{count:15,cap:15});
  assert.ok(rmb && supportMarks(world,p,rmb).length===5);
  p.spendCharge('frenzy',4);
  assert.deepEqual(supportMarks(world,p,lmb).find(m=>m.fuelBank)?.meter,{count:11,cap:15});
  p.sheet.removeSource('workshop-capacity');
  p.gainCharge('frenzy',1,18,rmb);
  assert.deepEqual(supportMarks(world,p,lmb).find(m=>m.fuelBank)?.meter,{count:12,cap:18},'a spender reads the funding skill’s bank');
  assert.equal(p.skillChargeCap(lmb),5,'only Bandolier remains');
});
const linked=socketExample((world,index)=>{
  const host=world.player.skills[0]!, marks=supportMarks(world,world.player,host);
  const meters=marks.filter(m=>m.meter);
  assert.deepEqual(meters.map(m=>m.id),['building_rhythm','ravening']);
  const mirror=makeSimWorld('warrior',2341);
  applySnapshot(mirror,serializeSnapshot(world,index+1));
  assert.deepEqual(mirror.player.supportPresentation?.cleave.filter(m=>m.meter).map(m=>m.meter),meters.map(m=>m.meter));
  const bank=()=>({count:world.player.skillChargeBank(host).count,cap:world.player.skillChargeCap(host)});
  assert.deepEqual(compactChargeCounters(marks,28,bank).filter(m=>m.meter).map(m=>m.id),['chambered_casting','building_rhythm','ravening']);
  assert.equal(compactChargeCounters(marks,54,bank),marks);
});
assert.deepEqual(linked.map(s=>[s.rounds,...s.marks.filter(m=>m.meter).map(m=>m.meter!.count)]),[[3,0,3],[2,1,0],[1,2,2],[0,3,0]]);
const bankWorld=makeSimWorld('warrior',2340), keeper=bankWorld.player;
function equipBank(id:string) {
  const example=examples.find(e=>e.mark.id===id)!;
  const def=Object.values(SKILLS).find(s=>s.name===example.host)!;
  const host=makeSkillGem(def,1,'legendary');host.sockets[0]={def:SUPPORTS[id],level:1};
  keeper.skills[0]=host;
  return host;
}
const ignite=equipBank('cast_on_ignition'), ignition=()=>supportMarks(bankWorld,keeper,ignite)[0];
bankWorld.bankStatusTriggers(keeper,'poison');assert.equal(ignition().meter?.count,0);
bankWorld.bankStatusTriggers(keeper,'burn');assert.deepEqual(ignition().meter,{count:1,cap:3});
ignite.state!.triggerOff=true;
bankWorld.bankStatusTriggers(keeper,'burn');assert.equal(ignition().lit,false);assert.equal(ignition().meter?.count,1);
const pain=equipBank('cast_on_damage_taken');bankWorld.bankDamageTakenTriggers(keeper,3);
assert.deepEqual(supportMarks(bankWorld,keeper,pain)[0].meter,{count:3,cap:keeper.maxLife()*.3});
const coil=equipBank('spooling');
coil.sockets[1]={def:SUPPORTS.mounting_frenzy,level:1};
keeper.casting={mode:'channel',inst:coil,aim:keeper.pos,elapsed:0,total:1,held:true,baseMult:1,channelTime:5,hitSpool:16};
const spools=supportMarks(bankWorld,keeper,coil);
assert.deepEqual(spools.map(s=>s.meter),[{count:2,cap:3},{count:2,cap:3}]);
assert.ok(spools.every(s=>s.readout?.includes('Combined bonus projectiles 3 / 3')));
keeper.casting=null;
assert.ok(supportMarks(bankWorld,keeper,coil).every(m=>m.meter?.count===0));
const surge=equipBank('overcharge'), stages=()=>supportMarks(bankWorld,keeper,surge)[0].meter;
assert.deepEqual(stages(),{count:0,cap:3});
keeper.casting={mode:'overcharge',inst:surge,aim:keeper.pos,elapsed:0,total:1,held:true,baseMult:1,stage:2};
assert.deepEqual(stages(),{count:2,cap:3});
keeper.casting=null;
assert.equal(stages()?.count,0);
const anchor=equipBank('hidden_reserves');anchor.state={throngGauge:42};
assert.deepEqual(supportMarks(bankWorld,keeper,anchor)[0].meter,{count:42,cap:100});
console.log('PASS '+examples.length+' live counter designs, linked cast states, co-op and collision checks');

seedGlobalRandom(8937);
const w=makeSimWorld('warrior',8937), actor=w.player, target=w.createMonster('zombie',1,'enemy');
target.pos={x:actor.pos.x+25,y:actor.pos.y}; w.actors=[actor,target];
target.sheet.setSource('range',[mod('life','override',100000),mod('evasion','override',0),mod('blockChance','override',0)]);
target.fillResources();
const inst=makeSkillGem(SKILLS.cleave,1,'legendary');
inst.sockets[0]={def:SUPPORTS.metronome,level:1};
inst.sockets[1]={def:SUPPORTS.skewering_blows,level:1};
actor.skills[0]=inst;
const hit=(w as unknown as {resolveHit(a:Actor,s:SkillInstance,b:Actor):void}).resolveHit.bind(w);
const bankTest=makeSkillGem(SKILLS.cleave,1,'legendary');
bankTest.sockets[0]={def:SUPPORTS.deep_reserves,level:1};
bankTest.sockets[1]={def:SUPPORTS.chambered_casting,level:1};
assert.equal(useChargeSupport(bankTest)?.def.id,'chambered_casting','munition wins over an auxiliary reserve');
assert.deepEqual(supportMarks(w,actor,bankTest).filter(m=>m.useBank).map(m=>m.counter),['chamber']);
const intrinsic=makeSkillGem({...SKILLS.cleave,useCharges:{max:4}},1,'legendary');
intrinsic.sockets[0]={def:SUPPORTS.chambered_casting,level:1};
assert.equal(useChargeSupport(intrinsic),undefined);
assert.ok(!supportMarks(w,actor,intrinsic).some(m=>m.useBank),'the skill retains an intrinsic bank');
const marks=()=>supportMarks(w,actor,inst);
assert.ok(marks().every(m=>!m.fired));
for(let i=0;i<60 && !actor.buffs.has('tempo');i++) hit(actor,inst,target);
const row=wornBuffRows(actor,true).find(r=>r.id==='tempo');
assert.deepEqual(row?.supportSources,['metronome']);
assert.ok(row?.details?.some(line=>line.includes('Metronome')));
assert.equal(marks().find(m=>m.id==='metronome')?.fired,true);
assert.ok(!marks().find(m=>m.id==='skewering_blows')?.fired);
assert.ok(!wornBuffRows(target).some(r=>r.id==='tempo'));
const mirror=makeSimWorld('warrior',8938);
applySnapshot(mirror,serializeSnapshot(w,1));
const replica=mirror.player;
assert.deepEqual(wornBuffRows(replica).find(r=>r.id==='tempo')?.supportSources,['metronome']);
assert.equal(replica.supportPresentation?.cleave.find(m=>m.id==='metronome')?.fired,true);
w.time+=0.6;
assert.ok(!marks().some(m=>m.fired),'completed proc pulse expires');
actor.buffs.delete('tempo');
actor.sheet.setSource('independent-proc',[mod('proc_tempo','flat',1)]);
const other=makeSkillGem(SKILLS.cleave,1,'common');
for(let i=0;i<60 && !actor.buffs.has('tempo');i++) hit(actor,other,target);
assert.ok(actor.buffs.has('tempo'),'independent grant fired');
assert.equal(wornBuffRows(actor).find(r=>r.id==='tempo')?.supportSources,undefined);
assert.ok(!marks().some(m=>m.fired),'a different host cannot flash the socket');
const echo=makeSkillGem(SKILLS.cleave,1,'rare');
echo.sockets[0]={def:SUPPORTS.echoing_might,level:1};
for(let i=0;i<60 && !actor.buffs.has('echoing_might');i++) hit(actor,echo,target);
assert.deepEqual(wornBuffRows(actor).find(r=>r.id==='echoing_might')?.supportSources,['echoing_might']);
const summon=makeSkillGem(SKILLS.summon_skeleton,1,'rare');
summon.sockets[0]={def:SUPPORTS.fresh_ranks,level:1};
const minion=(w as unknown as {spawnMinion(a:Actor,s:SkillInstance):Actor|null}).spawnMinion(actor,summon);
assert.ok(minion);
assert.deepEqual(wornBuffRows(minion).find(r=>r.id==='fresh_ranks')?.supportSources,['fresh_ranks']);
assert.ok(!wornBuffRows(actor).some(r=>r.id==='fresh_ranks'));
assert.equal(supportMarks(w,actor,summon)[0].fired,true);
const vein=makeSkillGem(SKILLS.cleave,1,'rare');
vein.sockets[0]={def:SUPPORTS.teeming_vein,level:1,rolled:{trigger:'gauge_quick'}};
for(let i=0;i<100 && !supportMarks(w,actor,vein)[0].fired;i++) hit(actor,vein,target);
assert.equal(supportMarks(w,actor,vein)[0].fired,true);
assert.deepEqual(supportMarks(w,actor,vein)[0].meter,{count:0,cap:9});
// A counted cut owns two ledgers. Observe an actual hit and birth, then remove its living brood.
actor.skills[0]=vein;
const readings=()=>supportMeters(supportMarks(w,actor,vein)).map(m=>({id:m.counter,...m.meter}));
const born=w.actors.filter(a=>a.owner===actor && !a.dead && a.sourceSkillId==='__vein:cleave:teeming_vein');
assert.ok(born.length>0);
assert.deepEqual(readings().map(m=>[m.id,m.count]),[['clutch',0],['hive',born.length]]);
applySnapshot(mirror,serializeSnapshot(w,2));
assert.deepEqual(supportMeters(mirror.player.supportPresentation!.cleave).map(m=>m.meter),readings().map(m=>({count:m.count,cap:m.cap})));
w.kill(born[0],true);
assert.deepEqual(readings().map(m=>m.count),[0,born.length-1]);
for(const width of [54,38,28]) {
  const layout=buffAddendum([],[],[vein],0,120,width,4,[supportMarks(w,actor,vein)]);
  assert.deepEqual(layout.meters.map(m=>m.mark.counter),['clutch','hive']);
  assert.ok(!overlaps(layout.meters[0].rect,layout.meters[1].rect));
}
const commands=makeSimWorld('warrior',4490), hero=commands.player;
const shield=makeSkillGem(SKILLS.shield_charge,1,'legendary');
shield.sockets[0]={def:SUPPORTS.answering_steel,level:1};
shield.sockets[1]={def:SUPPORTS.stored_verdict,level:1};
hero.skills[0]=shield;
const commandMarks=()=>supportMarks(commands,hero,shield);
hero.gainCharge('riposte',2,3,shield);hero.gainCharge('verdict',3,3,shield);
assert.deepEqual(commandMarks().map(m=>[m.counter,m.threshold,m.meter?.count]),[['ripostes',1,2],['scales',3,3]]);
const held=wornBuffRows(hero,true);
assert.ok(held.some(b=>b.id==='riposte') && held.some(b=>b.id==='verdict'));
assert.ok(!buffAddendum(held,[],[shield],0,100,54,6,[commandMarks()]).strip.some(b=>b.id==='verdict' || b.id==='riposte'));
assert.ok(buffAddendum(held,[],[],0,100,54,6).strip.some(b=>b.id==='verdict'),'unbound fuel returns to the player strip');
assert.ok(commands.useMetaSkill(hero,shield,hero.pos));
assert.equal(commandMarks()[0].meter?.count,1);
for (let t=0;t<95;t++) commands.update(1/60);
assert.equal(commandMarks()[1].meter?.count,0,'the queued second command spends its own ledger');
const gatherWorld=makeSimWorld('warrior',4010), mage=gatherWorld.player;
const gathering=makeSkillGem(SKILLS.cleave,1,'legendary');
gathering.sockets[0]={def:SUPPORTS.gathered_casting,level:1};mage.skills[0]=gathering;
assert.ok(gatherWorld.useSkill(mage,gathering,mage.pos,true));
for (let t=0;t<35;t++) gatherWorld.update(1/60);
const fill=mage.brims?.get('cleave')?.fill ?? 0;
assert.ok(fill>0);
assert.equal(supportMarks(gatherWorld,mage,gathering)[0].meter?.count,fill*100);
const fieldWorld=makeSimWorld('warrior',4500), bearer=fieldWorld.player;
const field=makeSkillGem(SKILLS.doom_chant,1,'legendary');
field.sockets[0]={def:SUPPORTS.miasma,level:1};bearer.skills[0]=field;
const fieldMark=()=>supportMarks(fieldWorld,bearer,field)[0];
assert.equal(fieldMark().lit,false);
assert.ok(fieldWorld.executeSkill(bearer,field,bearer.pos));
assert.equal(fieldMark().lit,true);
const fieldCooldown=bearer.cooldowns.get(field.def.id) ?? 0;
for (let t=0;t<Math.ceil(fieldCooldown*60)+1;t++) fieldWorld.update(1/60);
assert.ok(fieldWorld.useSkill(bearer,field,bearer.pos,true));
assert.equal(fieldMark().lit,false);
field.sockets[0]={def:SUPPORTS.miasmic_ground,level:1};
assert.ok(fieldWorld.executeSkill(bearer,field,bearer.pos));
assert.deepEqual(fieldMark().meter,{count:1,cap:1});
assert.ok(fieldWorld.executeSkill(bearer,field,bearer.pos));
assert.equal(fieldMark().meter?.count,1,'relocating a patch replaces the previous one');
const reflex=makeSkillGem(SKILLS.dash,1,'rare');
const socket={def:SUPPORTS.muscle_memory,level:1};
reflex.sockets[0]=socket;
assert.ok(!supportMarks(w,actor,reflex)[0].roles?.includes('cooldown'));
socket.level=2;
assert.ok(supportMarks(w,actor,reflex)[0].roles?.includes('cooldown'));
console.log('PASS '+defs.length+' unique verified paintings, '+seen.size+' mechanic categories, '+multi+' multi-role supports; native hit, recipient, source, expiry, co-op and narrow rail.');
