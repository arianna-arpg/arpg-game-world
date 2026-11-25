import { strict as assert } from 'node:assert';
import { makeSimWorld } from '../src/sim/arena';
import { addPassiveBuffGrant, buffRows, buffRowDetails, newPassiveBuffGrants } from '../src/engine/buffPresentation';
import { PASSIVE_NODES } from '../src/data/passives';
import { CHOICE_GROUPS } from '../src/data/passiveChoices';
import { PROCS, type ProcDef } from '../src/data/procs';
import { SUPPORTS } from '../src/data/supports';
import { supportMarks } from '../src/engine/supportPresentation';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance, type BuffEffect } from '../src/engine/skills';
import { CHARGE_DEFS } from '../src/engine/charges';
import { STATUS_DEFS } from '../src/engine/status';
import { BENEFICIAL_LOOKS, BUFF_LOOKS, CHARGE_LOOKS, procBuffLook } from '../src/data/buffLooks';
import type { Actor } from '../src/engine/actor';
import { procCueRows } from '../src/engine/procCues';
import { applySnapshot, serializeSnapshot } from '../src/net/snapshot';
import { buffAddendum } from '../src/render/vis/buffAddendum';
import { wornBuffRow } from '../src/engine/buffPresentation';
import { VIS_CFG } from '../src/render/vis/visConfig';
import { buffBehavior } from '../src/render/vis/buffBehavior';

const w = makeSimWorld('warrior',751), p = w.player, meta = w.localSeat.meta;
const gate = (label: string) => buffRows(p).filter(row => row.kind === 'passive' && row.label === label);
const statusIds = Object.keys(STATUS_DEFS).filter(id => STATUS_DEFS[id].beneficial);
for (const id of statusIds) {
  const s = STATUS_DEFS[id];
  assert.ok(s.buffLook ?? BENEFICIAL_LOOKS[id], id+' missing intentional positive-status art');
  p.applyStatus(id,0,1,'inspection');
  assert.equal(buffRows(p).find(row => row.kind === 'status' && row.id === id)?.label,s.label,id);
  p.endStatus(id);
}
for (const id of Object.keys(CHARGE_DEFS)) assert.ok(CHARGE_DEFS[id].buffLook ?? CHARGE_LOOKS[id],id+' has no charge mark');
const directBuffs = Object.values(SKILLS).flatMap(skill => (skill.effects ?? []).filter((fx): fx is BuffEffect => fx.type === 'buff'));
for (const buff of directBuffs) assert.ok(buff.buffLook ?? BUFF_LOOKS[buff.id],buff.id+' missing intentional native material');
for (const proc of Object.values(PROCS)) {
  if (proc.effect.type === 'buff') assert.ok(procBuffLook(proc.id, proc.effect.buff), proc.id+' missing triggered buff art');
}

// The real build fold, including selected options and refunds.
const mountain = 'cl_crag_mountain', threshold = 'weave_chorus_third_voice', choice = 'cross_str_mastery';
for (const id of [mountain,threshold,choice,'route_for_school_graft_bulwark_of_thorns']) meta.allocated.add(id);
meta.choices[choice] = ['anchored_blow']; w.recalcPlayer();
p.sheet.setConditions(['stationary']); p.sheet.setGauges([['charge:verse',1]]);
assert.equal(gate('Anchored Blow').length,1);
assert.equal(buffBehavior(gate('Anchored Blow')[0]),'condition');
assert.equal(gate(PASSIVE_NODES[mountain].name).length,1,'two benefits on one condition share a tile');
assert.equal(gate(PASSIVE_NODES[threshold].name).length,0);
p.sheet.setGauges([['charge:verse',2]]);
assert.equal(gate(PASSIVE_NODES[threshold].name).length,1);
assert.equal(gate(PASSIVE_NODES[threshold].name)[0].count,undefined,'threshold is binary');
p.sheet.setConditions(['moving']);
assert.equal(gate(PASSIVE_NODES[mountain].name).length,0,'movement penalty alone is not a boon');
assert.equal(gate('Anchored Blow').length,0);
meta.choices[choice] = []; meta.allocated.delete(threshold); w.recalcPlayer(); p.sheet.setConditions(['stationary']);
assert.equal(gate('Anchored Blow').length,0); assert.equal(gate(PASSIVE_NODES[threshold].name).length,0);

const proc = PROCS.native_barbed_reply;
(w as unknown as {executeProc(proc:ProcDef,caster:Actor,inst:null,target:null):void}).executeProc(proc,p,null,null);
const barbs = buffRows(p).find(row => row.id === 'native_barbed_reply')!;
assert.equal(buffBehavior(barbs),'proc','a timed block proc keeps its trigger identity');
assert.equal(barbs.look.subject,'thorns'); assert.equal(barbs.look.pose,'shoulder');
assert.ok(buffRowDetails(p,barbs).some(line => line.includes(PASSIVE_NODES.route_for_school_graft_bulwark_of_thorns.name)));
assert.ok(!procCueRows(p).some(r => r.id === barbs.id && r.phase === 'stored'),'timed counterattack has no ammunition');
// Bloodlust's bank exists before the drain, its stat bonus only during the drain.
p.gainCharge('bloodlust',3,6); let blood = buffRows(p).find(row => row.id === 'bloodlust')!;
assert.equal(blood.draining,false); assert.equal(blood.look.pose,'native');
p.startChargeDrain('bloodlust',1); p.updateTimers(.01); blood = buffRows(p).find(row => row.id === 'bloodlust')!;
assert.equal(blood.draining,true); assert.equal(blood.look.subject,'fangs');

const scaledNode = Object.values(PASSIVE_NODES).find(n => n.mods?.some(m => m.gauge === 'charge:verse' && m.gaugeAt === undefined))!;
assert.ok(scaledNode); meta.allocated.add(scaledNode.id); w.recalcPlayer();
p.gainCharge('verse',1,6); p.updateTimers(.01);
assert.equal(gate(scaledNode.name)[0]?.count,1);
p.gainCharge('verse',2,6); p.updateTimers(.01);
assert.equal(gate(scaledNode.name)[0]?.count,3);

const ammo = makeSkillInstance({...SKILLS.flame_imbuement,requirements:undefined,manaCost:0,useTime:0});
p.useLock=0; p.casting=null;
assert.ok(w.useSkill(p,ammo,p.pos,true));
const loaded = buffRows(p).find(row => row.id === 'flame_imbue')!;
assert.equal(loaded.count,6); assert.equal(loaded.look.pose,'native');
assert.equal(procCueRows(p).find(row => row.id === loaded.id && row.phase === 'stored')?.profile,'fire');
const bar = (slots: (typeof ammo | null)[]) => buffAddendum(buffRows(p),procCueRows(p),slots,10,100,54,6);
assert.equal(bar([null,ammo]).magazines[0].rect.x,70+VIS_CFG.buffMagazine.inset);
assert.equal(bar([ammo,null]).magazines[0].rect.x,10+VIS_CFG.buffMagazine.inset);
assert.equal(bar([ammo,ammo]).magazines.length,1);
assert.ok(!bar([ammo]).strip.some(row=>row.id===loaded.id) && !bar([ammo]).legacyBanks.length);
assert.equal(bar([]).strip.find(row=>row.id===loaded.id)?.count,6,'an unslotted source retains its exact bank');
const worn = p.buffs.get(loaded.id)!;
assert.equal(buffBehavior(wornBuffRow(loaded.id,worn)),'stack');
const stripOnly = wornBuffRow(loaded.id,{...worn,def:{...worn.def,buffHud:'strip'}});
assert.equal(buffAddendum([stripOnly],procCueRows(p),[ammo],0,100,54,6).strip.length,1);
const second = {...loaded,id:'other-payload'}, bank = procCueRows(p).find(r=>r.id===loaded.id)!;
const paired = buffAddendum([loaded,second],[bank,{...bank,id:second.id}],[ammo],10,100,54,6);
const [lower,upper] = paired.magazines.map(m=>m.rect);
assert.ok(upper.y+upper.h < lower.y && 100-paired.clearance < upper.y,'two magazines leave room for each other and the shared strip');
const withMeta = makeSkillInstance({...ammo.def,meta:{skillId:'cleave',label:'Follow up'}});
const aboveMeta = bar([withMeta]).magazines[0].rect;
assert.ok(aboveMeta.y+aboveMeta.h < 100-22,'the magazine clears the secondary action and its click target');
const mirrorBuffs = serializeSnapshot(w,0).actors.find(a=>a.id===p.id)!;
assert.equal(buffAddendum(mirrorBuffs.buffPresentation!,mirrorBuffs.procCues!,[ammo],10,100,54,6).magazines[0].bank.count,6);
p.spendBuffs('use',['spell']); assert.equal(buffRows(p).find(row => row.id === loaded.id)?.count,6);
for (let use=0;use<5;use++) p.spendBuffs('use',['attack']);
assert.equal(buffRows(p).find(row => row.id === loaded.id)?.count,1);
p.spendBuffs('use',['attack']); assert.ok(!buffRows(p).some(row => row.id === loaded.id));
assert.equal(bar([ammo]).magazines.length,0);
const custom: BuffEffect = {id:'garden_plate',type:'buff',mods:[],duration:2,maxStacks:6,stackTimers:'independent',
  buffLook:{pose:'shoulder',subject:'flower',color:'#ff96b5'}};
p.addBuff(custom); p.updateTimers(1); p.addBuff(custom); p.updateTimers(1.1);
assert.deepEqual(buffRows(p).find(row => row.id === custom.id)?.look,custom.buffLook);
assert.equal(buffRows(p).find(row => row.id === custom.id)?.count,1,'independent expiry returns to one');
p.applyStatus('stormlaced',0,1,'inspection');
const socketHost=p.skills.find(s=>s?.def.id==='cleave') ?? makeSkillInstance(SKILLS.cleave);
p.skills[0]=socketHost;socketHost.sockets[0]={def:SUPPORTS.building_rhythm,level:1};
(socketHost.state ??= {}).stackN=3;
const client = makeSimWorld('warrior',752), snap = serializeSnapshot(w,1);
applySnapshot(client,JSON.parse(JSON.stringify(snap)));
const hostMarks=supportMarks(w,p,socketHost);
assert.equal(hostMarks.find(m=>m.id==='building_rhythm')?.meter?.count,3);
assert.deepEqual(supportMarks(client,client.player,socketHost),hostMarks,'mirror shows authoritative slot banks');
for (const row of buffRows(p)) {
  const remote = buffRows(client.player).find(r => r.id === row.id && r.kind === row.kind)!;
  assert.ok(remote,row.id+' on mirror');
  assert.equal(remote.count,row.count); assert.equal(remote.look.subject,row.look.subject);
  assert.equal(buffBehavior(remote),buffBehavior(row),'co-op buff behavior');
  assert.deepEqual(buffRowDetails(client.player,remote),buffRowDetails(p,row));
}
assert.equal(buffRows(client.player).filter(row => row.id === 'stormlaced').length,1);
socketHost.sockets[0]=null;
p.updateTimers(10); p.charges.clear(); meta.allocated.clear(); w.recalcPlayer(); p.downed=true;
assert.equal(buffRows(p).length,0); applySnapshot(client,serializeSnapshot(w,2));
assert.equal(buffRows(client.player).length,0,'host removal clears stale mirror effects');
assert.ok(!supportMarks(client,client.player,socketHost).some(m=>m.id==='building_rhythm'),'unsocket clears the remote bank');

const grants = [...Object.values(PASSIVE_NODES),...Object.values(CHOICE_GROUPS).flatMap(g => g.options)];
let activeSources=0;
for (const g of grants) {
  const compiled = newPassiveBuffGrants(); addPassiveBuffGrant(compiled,g.id,g.name,g.mods ?? []);
  if (compiled.gates.length) activeSources++;
}
console.log('PASS',statusIds.length,'beneficial statuses,',Object.keys(CHARGE_DEFS).length,'charge families,',activeSources,
  'conditional node/choice definitions. Native allocation, threshold, grant, spend, expiry, refund and co-op parity.');
