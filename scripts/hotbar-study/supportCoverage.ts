import { SUPPORTS } from '../../src/data/supports';
import { SKILLS } from '../../src/data/skills';
import { PROCS } from '../../src/data/procs';
import { makeSkillGem, supportFitsInst, supportMaxLevel, type SupportDef, type SkillInstance } from '../../src/engine/skills';
import { supportMarks, supportMeters } from '../../src/engine/supportPresentation';
import { spawnVeinOf, veinMods, type SupportRolled } from '../../src/engine/supportbase';
import { makeSimWorld } from '../../src/sim/arena';

/** Independent of presentation declarations. An artist omitting a face cannot hide a mechanic from the audit. */
export function expectedReadings(d:SupportDef,level:number,rolled?:SupportRolled) {
  const mods=[...d.mods,...(level>1?d.perLevel ?? []:[]),...(d.rollBase?veinMods(d.rollBase,rolled):[])];
  const vein=d.rollBase && spawnVeinOf(d.rollBase,rolled);
  const procs=new Set(mods.filter(m=>m.stat.startsWith('proc_')).map(m=>PROCS[m.stat.slice(5)]?.id));
  return [
    d.munition || d.useChargeGraft, d.selfStack, d.chargeCost, d.overcharge,
    d.trigger && ['damageTaken','statusApply'].includes(d.trigger.on), d.throngSource?.kind==='gauge',
    d.meta && SKILLS[d.meta.skillId]?.chargeCost, d.gather, d.shellGraft, d.corpseSpawn, d.dominate, d.brood,
    d.birth, d.summon, d.echo, d.turret, d.curseField?.mode==='ground', vein?.hits, vein,
    ...['unleashMax','channelSpool','channelHitSpool','castAsTotem'].map(stat=>mods.some(m=>m.stat===stat && m.value>0)),
    ...[...procs].map(id=>id && ['summon','birth'].includes(PROCS[id].effect.type)),
  ].filter(Boolean).length;
}
function cuts(def:SupportDef) {
  let variants:SupportRolled[]=[{}];
  for (const axis of def.rollBase?.axes ?? [])
    variants=variants.flatMap(part=>axis.rows.map(row=>({...part,[axis.id]:row.id})));
  return variants;
}
const hosts=[SKILLS.cleave,...Object.values(SKILLS).filter(s=>s!==SKILLS.cleave).sort((a,b)=>Number(!!a.noDrop)-Number(!!b.noDrop))];

export function auditSupports() {
  const world=makeSimWorld('warrior',0x6518), actor=world.player;
  function fit(def:SupportDef,level:number,rolled:SupportRolled|undefined) {
    const expected=expectedReadings(def,level,rolled);
    function tryHost(inst:SkillInstance) {
      if (!supportFitsInst(def,inst,rolled)) return;
      const slot=inst.sockets.findIndex(s=>!s);
      inst.sockets[slot]={def,level,rolled};
      const mark=supportMarks(world,actor,inst).find(m=>m.id===def.id);
      if (!mark?.serving) return;
      const readings=supportMeters([mark]).map(m=>({counter:m.counter,cap:m.meter!.cap,label:m.readout}));
      if (mark.useBank) readings.push({counter:mark.counter,cap:actor.skillChargeCap(inst),label:'Skill charges'});
      if (readings.length>expected) throw Error(def.id+' has an unclassified live reading');
      if (readings.length<expected) return;
      if (readings.some(r=>!r.counter || !Number.isFinite(r.cap) || r.cap<=0)) throw Error(def.id+' has a missing face or invalid capacity');
      return {host:inst.def.id,links:inst.sockets.flatMap(s=>s && s.def!==def?[s.def.id]:[]),roles:mark.roles!,readings};
    }
    for (const host of hosts) {
      const match=tryHost(makeSkillGem(host,1,'legendary'));
      if (match) return match;
    }
    // Supports may require a tag bestowed by another socket, such as Overcharge.
    for (const grant of Object.values(SUPPORTS).filter(g=>g!==def && g.grantsTags?.some(t=>def.requiresTags?.includes(t)))) {
      for (const host of hosts) {
        const inst=makeSkillGem(host,1,'legendary');
        if (!supportFitsInst(grant,inst)) continue;
        inst.sockets[0]={def:grant,level:1};
        const match=tryHost(inst);
        if (match) return match;
      }
    }
    throw Error('No serving host with '+expected+' readings for '+def.id+' level '+level+' '+JSON.stringify(rolled));
  }
  return Object.values(SUPPORTS).map(def=>{
    const levels=Array.from({length:supportMaxLevel(def)},(_,i)=>i+1);
    const variants=cuts(def).map(rolled=>({rolled,levels:levels.map(level=>({level,...fit(def,level,rolled)}))}));
    if (def.rollBase) {
      const canonical=variants[0].levels[0];
      for (const legacy of [undefined,Object.fromEntries(def.rollBase.axes.map(a=>[a.id,'retired-row']))]) {
        const fallback=fit(def,1,legacy);
        if (JSON.stringify(fallback.readings)!==JSON.stringify(canonical.readings) || fallback.roles.join()!==canonical.roles.join())
          throw Error('Unexpected legacy roll placement for '+def.id);
      }
    }
    return {id:def.id,name:def.name,variants};
  });
}
