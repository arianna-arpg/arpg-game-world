import { makeSimWorld } from '../../src/sim/arena';
import { makeSkillGem } from '../../src/engine/skills';
import { rollItem } from '../../src/engine/itemgen';
import { mod } from '../../src/engine/stats';
import { SUPPORTS } from '../../src/data/supports';
import { SKILLS } from '../../src/data/skills';
import { auditSupports } from './supportCoverage';
import { supportMarks, supportMeters } from '../../src/engine/supportPresentation';

/** Socket one real example of each discovered counter, preferring its earliest available level. */
export function counterExamples(audit=auditSupports()) {
  return audit.flatMap(row=>{
    const seen=new Set<string>();
    const samples=row.variants.flatMap(({rolled,levels})=>levels.map(setup=>({rolled,setup})))
      .sort((a,b)=>a.setup.level-b.setup.level || b.setup.readings.length-a.setup.readings.length);
    return samples.flatMap(({rolled,setup})=>{
      if (!setup.readings.some(r=>r.counter && !seen.has(r.counter))) return [];
      const world=makeSimWorld('warrior',0x5ea1), seat=world.localSeat;
      const host=SKILLS[setup.host], inst=makeSkillGem(host,1,'legendary');
      if (seat.actor.skills[0]?.def.id===host.id) world.bindSkill(0,host.id,seat);
      seat.meta.knownSkills.set(host.id,inst);world.bindSkill(0,host.id,seat);
      for (const id of [...setup.links,row.id]) {
        const own=id===row.id;
        const item=world.grantSupportGemItem(seat,{def:SUPPORTS[id],level:own?setup.level:1,rolled:own?rolled:undefined});
        if (!item || !world.socketSupport(item.uid,host.id)) throw Error('Cannot preview '+id+' on '+host.id);
      }
      const mark=supportMarks(world,seat.actor,inst).find(m=>m.id===row.id)!;
      const readings=supportMeters([mark]).map(m=>({mark:m,cap:m.meter!.cap,host:host.name,level:setup.level}));
      if (mark.useBank) readings.push({mark,cap:seat.actor.skillChargeCap(inst),host:host.name,level:setup.level});
      if (readings.length!==setup.readings.length) throw Error('Missing fitted readings for '+row.id);
      return readings.filter(r=>{
        if (!r.mark.counter || seen.has(r.mark.counter)) return false;
        seen.add(r.mark.counter);
        return true;
      });
    });
  });
}

/** Real, adjacent legendary hosts. Only their displayed balances are scrubbed by the workshop. */
export function slotFitExamples(observe?:(world:ReturnType<typeof makeSimWorld>,stage:'solo'|'linked')=>void) {
  const world=makeSimWorld('warrior',0x6517), seat=world.localSeat;
  function fit(slot:number,skill:string,ids:string[]) {
    const inst=makeSkillGem(SKILLS[skill],1,'legendary');
    if(seat.actor.skills[slot]?.def.id===skill) world.bindSkill(slot,skill,seat);
    seat.meta.knownSkills.set(skill,inst);world.bindSkill(slot,skill,seat);
    for(const id of ids) {
      const item=world.grantSupportGemItem(seat,{def:SUPPORTS[id],level:1});
      if(!item || !world.socketSupport(item.uid,skill)) throw Error('Cannot fit '+id+' on '+skill);
    }
    return inst;
  }
  function sample(inst:ReturnType<typeof makeSkillGem>) {
    const marks=supportMarks(world,seat.actor,inst);
    if(!marks.every(m=>m.serving)) throw Error('Inactive workshop link on '+inst.def.name);
    return {id:inst.def.id,name:inst.def.name,marks,cap:marks.some(m=>m.useBank)?seat.actor.skillChargeCap(inst):0};
  }
  const solo=sample(fit(0,'cleave',['building_rhythm']));
  observe?.(world,'solo');
  const lmb=fit(0,'cleave',['chambered_casting','building_rhythm','ravening','bandolier']);
  const rmb=fit(1,'deep_carve',['building_rhythm','ravening','metronome','skewering_blows']);
  for(const [slot,baseId,family] of [
    ['gloves','gloves_evasion','slotgraft_1_battering_ram'],['ring1','ring_coral','slotgraft_2_battering_ram'],
  ] as const) {
    const item=rollItem({ilvl:20,rarity:'magic',baseId,withFamily:family,rng:()=>.48});
    if(!item) throw Error('Missing workshop graft '+family);
    seat.meta.equipped[slot]=item;
  }
  world.recalcSeat(seat);
  // Bandolier supplies two rounds. These preview investments use the real stat folds.
  seat.actor.sheet.setSource('workshop-capacity',[mod('skillCharges','flat',7),mod('chargeCap_frenzy','flat',12)]);
  seat.actor.gainCharge('frenzy',15,3,rmb);
  const pair=[sample(lmb),sample(rmb)];
  if(pair.some(s=>s.marks.length!==5)) throw Error('Expected two five-support skills');
  observe?.(world,'linked');
  return {solo,pair};
}

/** Assemble through the bag and equipment routes so a changed fit rule fails the preview build. */
export function socketExample(observe?:(world:ReturnType<typeof makeSimWorld>,press:number)=>void) {
  const world=makeSimWorld('warrior',0x5ea1), seat=world.localSeat, actor=seat.actor;
  const inst=makeSkillGem(SKILLS.cleave,1,'legendary');
  world.bindSkill(0,'cleave',seat); // Release the starter copy before seating the legendary gem.
  seat.meta.knownSkills.set(inst.def.id,inst);
  world.bindSkill(0,'cleave',seat);
  const glove=rollItem({ilvl:20,rarity:'magic',baseId:'gloves_evasion',withFamily:'slotgraft_1_battering_ram',rng:()=>.48});
  if (!glove) throw Error('Missing Battering Ram graft');
  seat.meta.equipped.gloves=glove;
  world.recalcSeat(seat);
  for (const id of ['chambered_casting','building_rhythm','ravening','metronome']) {
    const item=world.grantSupportGemItem(seat,{def:SUPPORTS[id],level:1});
    if (!item || !world.socketSupport(item.uid,'cleave')) throw Error('Cannot socket '+id);
  }
  const snapshot=()=>({
    marks:supportMarks(world,actor,inst),
    rounds:actor.skillChargeBank(inst).count, capacity:actor.skillChargeCap(inst),
    face:world.slotFaceOf(actor,inst).name, faceId:world.slotFaceOf(actor,inst).id,
  });
  actor.gainCharge('frenzy',3,3,inst);
  const states=[snapshot()];
  if (states[0].marks.length!==5 || !states[0].marks.every(m=>m.serving) || !states[0].marks[4].graft)
    throw Error('Invalid five-support setup '+JSON.stringify([states[0].marks.map(m=>m.name),seat.wornGrafts?.map(r=>r.state),glove.affixes,actor.skills.map(s=>s?.def.id)]));
  observe?.(world,0);
  for(let press=0;press<3;press++) {
    if (!world.useSkill(actor,inst,{x:actor.pos.x+50,y:actor.pos.y},true)) throw Error('Cleave refused cast '+(press+1));
    for(let i=0;i<180;i++) {
      world.update(1/60);
      if (!actor.casting && actor.useLock<=0 && !actor.cooldowns.get(inst.def.id)) break;
    }
    // A fresh gain after the second cast exercises Ravening independently of Rhythm.
    if (press===1) actor.gainCharge('frenzy',2,3,inst);
    states.push(snapshot());
    observe?.(world,press+1);
  }
  if (states[3].rounds!==0 || states[3].marks.find(m=>m.role==='stack')?.meter?.count!==3)
    throw Error('Unexpected charge or rhythm state '+JSON.stringify(states[3]));
  return states;
}
