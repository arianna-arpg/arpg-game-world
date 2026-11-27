// Combat prerequisites shared by passive grants from every tree and vocation.
import { SKILLS } from '../src/data/skills';
import { BATTLE_DOCTRINES } from '../src/data/battleDoctrines';
import { ATTUNEMENTS, TERRAFORMS } from '../src/data/attunements';
import { makeSkillInstance, parseSlotGraftStat } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { applyHit, applyDot } from '../src/engine/damage';
import { MERC_TEMPLATES } from '../src/data/mercenaries';
import { STATUS_DEFS } from '../src/engine/status';
import { MINION_FAMILIES } from '../src/data/minionFamilies';
import { LAST_BREATH } from '../src/data/summonPacts';
import { CARRIED_FIELDS, carriedFieldStat } from '../src/data/carriedFields';
import { PROCS } from '../src/data/procs';
import { SUPPORTS } from '../src/data/supports';

const definitions=Object.values(SKILLS);
export function passiveLoadout(w,p,enemy,ally,stats,mods,measure,watch){
  const has=(...ids)=>ids.some(s=>stats.has(s));
  const match=re=>[...stats].some(s=>re.test(s));
  const equip=def=>{
    const inst=makeSkillInstance(def);p.skills.push(inst);w.meta.knownSkills.set(def.id,inst);return inst;
  };
  for(const stat of stats){
    if(stat.startsWith('survivalEase_')){
      const id=stat.slice('survivalEase_'.length);
      w.drainSurvival(p,id,12,1);measure('remaining '+id+' after exposure',p.survival?.get(id)??0);
    }
    if(stat.startsWith('chargeCap_')){
      const id=stat.slice('chargeCap_'.length);p.gainCharge(id,50,4);
      measure(id+' charges after filling',p.charges.get(id)??0);
    }
  }
  if(has('manaCost','castSpeed','cooldownRecovery')){
    const tags=new Set(mods.flatMap(m=>m.tags??[]));
    for(const def of definitions.filter(s=>s.manaCost>0&&[...tags].every(t=>s.tags.includes(t))).slice(0,3)){
      const inst=equip(def);p.cooldowns.delete(def.id);p.useLock=0;p.casting=null;p.fillResources();
      w.useSkill(p,inst,enemy.pos,true);
      measure('mana after '+def.name,p.mana);measure('time committed to '+def.name,p.casting?.total??p.useLock);
    }
  }
  if(has('overdriveCap')){
    const def=definitions.find(s=>s.delivery.overdrive?.lane==='mana');
    if(def){const inst=equip(def);w.executeSkill(p,inst,p.pos);p.mana=0;
      for(let i=0;i<15;i++){const cost={mana:3,life:0};if(!p.canAfford(cost))break;p.payCost(cost);}
      measure('mana borrowed against active overdrive',p.overdrive.mana?.debt??0);
    }
  }
  if(has('lifeOnKill','manaOnKill','esOnKill')){
    p.life=p.maxLife()*.4;p.mana=p.maxMana()*.4;p.es=0;
    p.sheet.setSource('execution-contact',[mod('accuracy','flat',1e5)]);
    const foe=w.createMonster('zombie',1,'enemy');foe.pos={...enemy.pos};foe.brain=undefined;foe.life=1;foe.spawnedAt=-45;w.actors.push(foe);
    w.resolveHit(p,makeSkillInstance(SKILLS.cleave),foe);
    measure('life after finishing blow',p.life);measure('mana after finishing blow',p.mana);measure('energy shield after finishing blow',p.es);
  }
  if(match(/recuperate|stagger|graze|^(esDot|esLeech|damageTaken|enduranceDR)/)){
    p.sheet.setSource('incoming-damage-fixture',[mod('grazeChance','override',1),mod('grazeMitigation','flat',.15),mod('staggerFrac','flat',.1),mod('recuperate','flat',.1),mod('blockChance','override',0)]);
    p.fillResources();p.es=0;const before=p.life;
    applyHit(enemy,p,{amounts:{physical:p.maxLife()*.4},crit:false,tags:new Set(['spell','physical']),sourceName:'Incoming physical spell'});
    measure('life lost to the graze',before-p.life);measure('ward gained from grazing',p.ward);
    measure('damage deferred',p.stagger?.amount??0);for(let i=0;i<5;i++){w.update(.08);watch();}
    measure('life after deferred damage and recovery',p.life);
  }
  if(has('luck','fateDiceBonus')){
    if(!stats.has('fateDiceBonus'))p.sheet.setSource('dice-owner',[mod('fateDiceBonus','flat',1)]);
    p.casting=null;p.useLock=0;p.fillResources();w.useSkill(p,equip(SKILLS.teleport),{x:p.pos.x+46,y:p.pos.y},true);
    for(let beat=0;beat<10;beat++){w.update(.08);watch();}
  }
  if(has('wardDecay')){p.gainWard(100);for(let i=0;i<60;i++)w.update(.1);measure('ward after six seconds',p.ward);}
  const doctrine=BATTLE_DOCTRINES.find(d=>stats.has(d.stat)||[...d.forms,...(d.traits??[])].some(f=>stats.has(f.stat)));
  if(doctrine){
    if(!stats.has(doctrine.stat))p.sheet.setSource('doctrine-owner',[mod(doctrine.stat,'flat',1)]);
    ally.companion=doctrine.subjects==='companions';
    if(doctrine.growth){
      const t=TERRAFORMS[doctrine.growth.kind],d={kind:t.doodadKind,pos:{...p.pos},radius:10,tier:p.tier};
      w.doodads.push(d);w.transientDoodads.push({kind:t.id,owner:p,d,ttl:6,maxTtl:12});w.markDoodadsChanged();
    }
    const inst=equip(SKILLS[doctrine.skill]);
    if(doctrine.meter){
      w.battleDoctrines.hit(p,makeSkillInstance(SKILLS.cleave),enemy,true);
      w.battleDoctrines.hit(ally,makeSkillInstance(SKILLS.cleave),enemy,true);
      const foe=w.createMonster('zombie',1,'enemy');foe.pos={...p.pos};w.actors.push(foe);w.kill(foe,false,p);
    }
    w.executeSkill(p,inst,enemy.pos);watch();w.update(.15);watch();
    measure('life after '+doctrine.name,p.life);measure('ally life after '+doctrine.name,ally.life);
    measure('pending doctrine follow-ups',w.pendingRepeats.length);
  }
  if(has('critChance','critMulti','statusChance')||match(/^apply_/)){
    p.sheet.setSource('repeated-contacts',[mod('accuracy','flat',1e5),mod('critChance','flat',.2),mod('statusChance','flat',.15)]);
    const tags=mods.flatMap(m=>m.tags??[]).filter(t=>!t.startsWith('vs:'));
    const def=definitions.find(s=>s.baseDamage&&s.effects.some(f=>f.type==='damage')&&tags.every(t=>s.tags.includes(t)))??SKILLS.firebolt;
    const inst=makeSkillInstance(def);
    const hp=enemy.life;for(let i=0;i<24&&!enemy.dead;i++){w.resolveHit(p,inst,enemy);watch();}
    measure('damage from repeated '+def.name+' hits',hp-enemy.life);
    measure('ailments after repeated hits',enemy.statuses.reduce((n,s)=>n+s.stacks,0));
  }
}

// An additional paired trial for a grant whose first encounter changed only
// the sheet. Use a fresh party so that the necessary skills remain equipped
// from payment through release, impact, minion upkeep, and retirement.
export function extendedLoadout(w,p,enemy,ally,stats,mods,measure,watch){
  const tags=new Set(mods.flatMap(m=>m.tags??[])),names=[...stats].join(' '),matches=re=>re.test(names);
  p.sheet.setSource('extended-gear',[mod('mana','flat',650),mod('life','flat',200),mod('accuracy','flat',1e5),
    ...[...tags].filter(t=>t.startsWith('vs:')).map(t=>mod('damage','increased',0,[t]))]);
  p.fillResources();p.life*=.7;p.mana*=.6;
  enemy.brain=undefined;enemy.pos={x:p.pos.x+68,y:p.pos.y};enemy.rarity='crowned';
  enemy.sheet.setSource('extended-opponent',[mod('life','flat',20000),mod('poise','flat',75),mod('armor','flat',30),mod('evasion','override',0)]);
  enemy.fillResources();
  for(const s of ['poison','burn','bleed','shock','chill','vulnerable','sundered',...tags,...[...stats].filter(s=>s.startsWith('damageVs_')).map(s=>s.slice(9))].map(s=>s.replace(/^vs:/,''))){
    if(STATUS_DEFS[s])enemy.applyStatus(s,2,3,p.name,{casterId:p.id});
  }
  if(tags.has('vs:lowLife'))enemy.life*=.15;
  if(tags.has('vs:farRing')||tags.has('vs:middleRing'))enemy.pos.x=p.pos.x+(tags.has('vs:farRing')?370:180);
  if(tags.has('vs:grabbed'))enemy.heldBy=p.id;
  if(tags.has('vs:poiseBroken'))enemy.poiseBroken=true;
  ally.pos={x:p.pos.x+18,y:p.pos.y+24};ally.companion=true;
  const secondary=w.createMonster('zombie',1,'enemy');secondary.brain=undefined;secondary.pos={x:enemy.pos.x+34,y:enemy.pos.y+16};w.actors.push(secondary);
  const equip=def=>{
    const inst=makeSkillInstance(def);p.skills.push(inst);w.meta.knownSkills.set(def.id,inst);return inst;
  };
  if(tags.has('mimic')){
    const slot=equip(SKILLS.mimicry);
    p.mimicBank=[{sid:'mocking_refrain',src:'mockthrush',at:w.time}];
    if(w.useSkill(p,slot,enemy.pos,true))measure('wind-up of Mocking Refrain cast through Mimicry',p.casting?.total??0);
    for(let i=0;i<12;i++){w.update(.08);watch();}
  }
  if(matches(/tetherDamage/)){
    const support=Object.values(SUPPORTS).find(s=>s.tether?.dps&&s.tether.link==='target');
    const def=definitions.find(d=>d.tags.includes('targeted')&&d.baseDamage);
    if(support&&def){
      const inst=equip(def);inst.sockets[0]={def:support,level:1};
      w.addTether(p,enemy,support.tether,inst,p);secondary.pos={x:(p.pos.x+enemy.pos.x)/2,y:p.pos.y};
      const before=secondary.life;for(let i=0;i<16;i++){w.update(.08);watch();}
      measure('damage to the enemy crossing '+support.name,before-secondary.life);
    }
  }
  if(matches(/totemPlaceTime|overchargeStages|sparkWindow|durationAuraCap/)){
    if(stats.has('totemPlaceTime')){
      p.sheet.setSource('totem-grant',[mod('castAsTotem','flat',1)]);
      const inst=equip(SKILLS.fireball);
      if(w.useSkill(p,inst,enemy.pos,true))measure('time to plant Fireball as a totem',p.casting?.total??0);
    }
    if(stats.has('overchargeStages')){
      const inst=equip(SKILLS.fireball);inst.sockets[0]={def:SUPPORTS.overcharge,level:1};
      if(w.useSkill(p,inst,enemy.pos,true))for(let i=0;i<80&&p.casting;i++){
        p.casting.held=true;w.update(.08);
        if(p.casting){measure('highest overcharge stage',p.casting.stage??0);measure('spark release window',p.casting.sparkWindow??0);}
      }
      watch();
    }
    if(stats.has('durationAuraCap')){
      const support=Object.values(SUPPORTS).find(s=>s.auraDuration);
      for(const def of definitions.filter(d=>d.delivery.type==='aura'&&d.delivery.mode==='toggle').slice(0,4)){
        const inst=equip(def);inst.sockets[0]={def:support,level:1};w.executeSkill(p,inst,p.pos);watch();
      }
      measure('simultaneous duration auras',Array.from(p.activeAuras.values()).filter(a=>Number.isFinite(a.remaining)).length);
    }
  }
  if(matches(/bondShare/)){
    const bond=equip(SKILLS.guardian_bond);
    w.executeSkill(p,bond,ally.pos,{targetInfo:w.resolveTargeting(p,bond,ally.pos)??undefined});
    ally.life=ally.maxLife()*.25;const before=ally.life;
    w.resolveHit(p,equip(SKILLS.cleave),enemy);measure('life shared with the bonded ally',ally.life-before);watch();
  }
  if(matches(/doomDot|gainAs_cold_lightning/)){
    const def=definitions.find(d=>stats.has('doomDot')
      ? d.innateMods?.some(m=>m.stat==='curseRupture'&&m.value>0)&&d.effects.some(f=>f.type==='status'&&f.status==='doom')
      : d.tags.includes('storm')&&d.baseDamage?.cold);
    if(def){
      const inst=equip(def),before=enemy.life;w.resolveHit(p,inst,enemy);
      measure(def.name+' direct hit',before-enemy.life);
      measure('Doom damage ticking before detonation',enemy.statuses.filter(s=>s.id==='doom').reduce((n,s)=>n+s.dps,0));watch();
    }
  }
  for(const field of CARRIED_FIELDS.filter(f=>stats.has(f.growth?.stat)||stats.has(f.escort?.stat))){
    p.sheet.setSource('carried-field-prerequisite',[mod(carriedFieldStat(field.id),'flat',1)]);
    w.carriedFields.reconcile(p);const inst=equip(SKILLS[field.skill]);w.executeSkill(p,inst,p.pos);
    w.update(.12);watch();
    measure(field.name+' carried radius',Math.max(0,...w.zones.filter(z=>z.caster===p).map(z=>z.radius)));
    measure(field.name+' active sentinels',w.actors.filter(a=>a.owner===p&&a.sourceSkillId===field.escort?.skill&&!a.dead).length);
  }
  for(const stat of stats){
    const graft=parseSlotGraftStat(stat);
    if(!graft)continue;
    const inst=makeSkillInstance(SKILLS.fireball);
    p.skills[graft.slot]=inst;w.meta.knownSkills.set(inst.def.id,inst);w.recalcSeat(w.localSeat);
    measure('active '+graft.gemId+' ranks on Fireball',inst.grafts?.find(g=>g.def.id===graft.gemId)?.level??0);
    const before=p.mana;if(w.useSkill(p,inst,enemy.pos,true))measure('mana spent on the grafted Fireball',before-p.mana);
    for(let i=0;i<8;i++){w.update(.12);watch();}
  }
  if(tags.has('munition')&&stats.has('manaCost')){
    const support=Object.values(SUPPORTS).find(s=>s.mods?.some(m=>m.stat==='addedManaCost'&&m.value>0));
    const bolt=equip(SKILLS.bolt_repeater);
    if(support){
      p.casting=null;p.useLock=0;p.cooldowns.delete(bolt.def.id);
      let before=p.mana;w.useSkill(p,bolt,enemy.pos,true);measure('mana spent on the unsocketed repeater',before-p.mana);
      w.update(.5);p.casting=null;p.useLock=0;p.cooldowns.delete(bolt.def.id);bolt.sockets[0]={def:support,level:1};
      before=p.mana;
      if(w.useSkill(p,bolt,enemy.pos,true))measure('mana spent on the repeater with '+support.name,before-p.mana);
      w.update(.5);watch();
    }
  }
  if(matches(/takenAs_|esDot|damageTaken|insight|direDeferral|enduranceDR|evasionForgone|poiseRegen/)){
    p.sheet.setSource('defense-pools',[mod('insight','flat',65),mod('energyShield','flat',80),mod('poise','flat',60),
      mod('endurance','flat',50),mod('evasion','flat',30),mod('coldRes','flat',.55),mod('blockChance','override',0)]);
    for(const [element,shape] of [['lightning','projectile'],['fire','aoe'],['physical','melee'],['chaos','spell']]){
      p.fillResources();p.insight=25;p.endurance=25;
      p.idleFor=0;
      applyHit(enemy,p,{amounts:{[element]:65},crit:false,assaultGuaranteed:true,tags:new Set([element,shape]),sourceName:'Incoming '+shape});
      measure(shape+' impact life',p.life);measure(shape+' impact ES',p.es);measure(shape+' impact insight',p.insight);
      measure(shape+' deferred damage',p.stagger?.amount??0);
      applyDot(p,18,element);measure(element+' damage over time to shield',p.es);
    }
    p.poise=4;p.insight=2;for(let i=0;i<45;i++){if(i<16)w.moveActor(p,1,0,.1);w.update(.1);}
    measure('insight after moving and standing',p.insight);measure('poise after recovery',p.poise);watch();
    if(stats.has('insightPen')){
      enemy.sheet.setSource('moving-target-insight',[mod('insight','flat',90)]);enemy.insight=60;enemy.idleFor=0;
      const hp=enemy.life;w.resolveHit(p,equip(SKILLS.cleave),enemy);
      measure('life lost behind moving insight',hp-enemy.life);measure('insight retained by moving target',enemy.insight);
    }
  }
  if(matches(/conduitEfficiency/)){
    p.wornConduits=[{from:'mana',to:'life',drainFlat:10,ratio:1}];p.life=p.maxLife()*.3;
    for(let i=0;i<12;i++)w.update(.1);measure('life after a mana conduit feeds it',p.life);
  }
  if(matches(/attune_|terraformFx_/)){
    for(const def of Object.values(ATTUNEMENTS).filter(d=>stats.has('attune_'+d.id))){
      w.doodads.push({kind:def.kinds[0],pos:{...p.pos},radius:24,tier:p.tier});w.markDoodadsChanged();
      for(let i=0;i<Math.ceil((def.attuneTime+1)*5);i++)w.update(.2);
      measure(def.label+' status stacks',p.statuses.filter(s=>s.id===def.status).reduce((n,s)=>n+s.stacks,0));watch();
    }
    for(const def of Object.values(TERRAFORMS).filter(d=>stats.has('terraformFx_'+d.id))){
      p.sheet.setSource('growth-source',[mod('terraform_'+def.id,'flat',6)]);
      for(let i=0;i<100;i++){w.update(.15);watch();}
      measure('active combat growths',w.transientDoodads.filter(g=>g.owner===p&&g.d.effect).length);
    }
  }
  if(matches(/summonPactForm_/)){
    p.sheet.setSource('pact-owner',[mod(LAST_BREATH.stat,'flat',1)]);w.summonPacts.reconcile(p);
    const inst=equip(definitions.find(d=>d.delivery.type==='summon'&&d.delivery.duration>0&&!d.delivery.persistent));
    for(let i=0;i<LAST_BREATH.threshold;i++){const body=w.spawnMinion(p,inst);if(body)w.kill(body,false,enemy);watch();}
    const wraith=w.actors.find(a=>a.owner===p && !a.dead && a.sourceSkillId===LAST_BREATH.reward.skill);
    if(wraith){
      for(const form of LAST_BREATH.reward.forms)for(const id of form.crewSkills??[])
        measure('wraith carries '+(SKILLS[id]?.name??id),Number(wraith.skills.some(s=>s?.def.id===id)));
      measure('equipped wraith skills',wraith.skills.filter(Boolean).length);for(const s of wraith.skills.filter(Boolean)){
      const before=enemy.life;w.executeSkill(wraith,s,enemy.pos);w.update(.3);watch();measure('wraith damage after '+s.def.name,before-enemy.life);}}
  }
  if(matches(/overleech|rivenPower|hitEcho|recentDmgHeal|surplusHitMore|staggerPurge|overkillRadius/)){
    p.sheet.setSource('combat-partners',[mod('lifeLeech','flat',.3),mod('hitEchoFrac','flat',.25),mod('overkillCarry','flat',.25)]);
    p.fillResources();p.stagger={amount:45,perSec:4};enemy.rivenStacks=7;enemy.rivenDecay=8;
    enemy.sheet.setSource('fractured-armor',[mod('armor','flat',160),mod('fireRes','flat',.4)]);
    const strike=equip(SKILLS.cleave),before=enemy.life;
    w.resolveHit(p,strike,enemy);w.resolveHit(p,equip(SKILLS.firebolt),enemy);watch();
    measure('damage to fractured defenses',before-enemy.life);measure('ward from excess leech',p.ward);
    measure('recovery banked while at full life',p.restoreStreams.reduce((sum,x)=>sum+x.remaining,0));
    if(secondary&&!secondary.dead){secondary.life=1;w.resolveHit(p,strike,secondary);watch();}
    measure('remaining stagger after the kill',p.stagger?.amount??0);
    for(let i=0;i<28;i++){w.update(.1);watch();}
    measure('enemy life after delayed debts settle',enemy.life);
  }
  if(matches(/luck|goldenProcAmplify/)){
    const owner=Object.values(PROCS).find(d=>d.trigger==='hit'&&!d.when&&!d.vs&&!d.tags?.length&&!d.requireStatus&&!d.requireBuff);
    if(owner){
      p.sheet.setSource('equipped-proc',[mod('proc_'+owner.id,'flat',.45)]);
      for(const def of [SKILLS.cleave,SKILLS.firebolt]){const inst=equip(def);for(let i=0;i<24&&!enemy.dead;i++){w.time+=.4;w.resolveHit(p,inst,enemy);watch();}}
      measure('ally ward after triggered hits',ally.ward);
    }
  }
  if(matches(/orbRefund_|orbOnKill_/)){
    const inst=equip(SKILLS.cindershell);p.cooldowns.set(inst.def.id,8);
    w.shedOrb('wakeflame',{...p.pos});for(let i=0;i<6;i++)w.update(.08);
    measure('cooldown after collecting Wakeflame',p.cooldowns.get(inst.def.id)??0);
    for(let i=0;i<32;i++){
      const target=w.createMonster('zombie',1,'enemy');target.pos={...enemy.pos};target.brain=undefined;target.life=1;w.actors.push(target);
      w.resolveHit(p,makeSkillInstance(SKILLS.cleave),target);
    }
    measure('Wakeflame shed by defeated enemies',w.orbs.filter(o=>o.kind==='wakeflame').length);watch();
  }
  if(matches(/flaskBeastMode|pourPower_|restorePctMax|restorePower/)){
    p.charges.set('flask_life',3);p.life=p.maxLife()*.4;
    const flask=equip(SKILLS.life_flask);p.reflexLock=0;w.useSkill(p,flask,p.pos);watch();
    p.restoreStreams.forEach((stream,i)=>measure('flask recovery in stream '+(i+1),stream.remaining));
  }
  if([...tags].some(t=>t.startsWith('vs:'))){
    enemy.sheet.setSource('qualifying-hit',[mod('poiseCcAvoid','override',0),mod('evasion','override',0),mod('blockChance','override',0)]);
    if(tags.has('vs:fleeing')||tags.has('vs:hardCC')){
      const status=Object.entries(STATUS_DEFS).find(([,s])=>tags.has('vs:fleeing')?s.panic:s.hardCC);
      if(status)enemy.applyStatus(status[0],0,4,p.name);
    }
    if(tags.has('vs:casting')||tags.has('vs:guarding')){
      const counter=makeSkillInstance(tags.has('vs:guarding')?SKILLS.shield_up:SKILLS.fireball);
      enemy.sheet.setSource('windup-resources',[mod('mana','flat',150),mod('poise','flat',100),mod('guard','flat',100)]);
      enemy.fillResources();enemy.skills=[counter];w.useSkill(enemy,counter,p.pos);
    }
    for(const name of ['snipe','fireball','cleave']){
      const inst=makeSkillInstance(SKILLS[name]),hp=enemy.life;
      w.resolveHit(p,inst,enemy);measure('qualified '+inst.def.name+' hit',hp-enemy.life);watch();
    }
  }
  const bodyTag=[...tags].find(t=>t.startsWith('body:')||t.startsWith('minion:'));
  if(bodyTag){
    const family=bodyTag.slice(bodyTag.indexOf(':')+1),ids=bodyTag.startsWith('body:')?[family]:MINION_FAMILIES[family]??[];
    const def=definitions.find(d=>d.delivery.type==='summon'&&ids.includes(d.delivery.monsterId));
    if(def){
      const inst=makeSkillInstance(def);p.skills=[inst];w.meta.knownSkills.set(def.id,inst);
      const body=w.spawnMinion(p,inst);
      if(body){
        measure(def.name+' deployed life',body.maxLife());measure(def.name+' deployed speed',body.sheet.get('moveSpeed'));
        body.life*=.5;body.pos={x:enemy.pos.x-10,y:enemy.pos.y};
        const hit=body.skills.find(Boolean);
        if(hit){const before=enemy.life;w.resolveHit(body,hit,enemy);measure(def.name+' deployed strike',before-enemy.life);}
        for(let i=0;i<6;i++){w.update(.1);watch();}measure(def.name+' wounded body life',body.life);
      }
    }
  }
  if(matches(/merc/)){
    const template=MERC_TEMPLATES[0],offer={kind:'template',refId:template.id,name:template.name,classId:template.classId,blurb:''};
    measure('price offered by the recruiter',w.mercHireCost(offer));measure('company capacity',w.mercHireCap());
    w.restoreHiredMerc({name:template.name,snapshot:w.templateSnapshot(template,w.mercTargetLevel()),templateId:template.id});
    w.refreshPassiveCompany(w.localSeat);
    const blade=w.hiredMercs.at(-1)?.seat.actor;
    if(blade){measure('retainer life in the field',blade.maxLife());measure('retainer strike strength',blade.sheet.get('damage'));measure('enemy life against the company',enemy.maxLife());}
  }
  const selected=new Set(['cleave','firebolt','venom_bolt','frostbolt','war_cry','teleport','snipe']);
  const add=(...ids)=>ids.forEach(id=>selected.add(id));
  if(tags.has('munition'))for(const def of definitions.filter(d=>d.tags.includes('munition')&&d.manaCost>0))add(def.id);
  if(matches(/throng/i))for(const d of definitions.filter(d=>d.throng).slice(0,3))add(d.id);
  if(matches(/corpseBatch|multiTarget/i))for(const d of definitions.filter(d=>d.delivery.type==='target'||d.targeting?.target==='corpse').slice(0,6))add(d.id);
  if(matches(/gaugeGain|skillChargeRate/i))for(const d of definitions.filter(d=>d.gauge||d.chargeBank).slice(0,5))add(d.id);
  if(matches(/channel|overcharge/i))for(const def of definitions.filter(d=>d.channel&&d.baseDamage).slice(0,3))add(def.id);
  if(matches(/curse|doom|status|ailment|dot|poison|leech|bleed|ignite|sunder|crit|lifeOnKill/i))add('blood_spray','doom_brand','rend','glacial_cascade','blight','hemorrhage','flame_imbuement');
  if(matches(/minion|summon|throng|golem|vigor|bond|companion|swarm|pact|husk|offering/i)){
    add('summon_skeleton','summon_stone_golem','summon_rubblekin','summon_zombie','bone_offering','detonate_minions');
    for(const d of definitions.filter(d=>d.delivery.type==='summon' && [...tags].some(t=>t.startsWith('minion:') && (d.delivery.monsterId??'').includes(t.slice(7)))))add(d.id);
  }
  if(matches(/channel|overcharge|ward|gauge|poise|stagger|guard|reflect|insight|d[ae]mageTaken|esDot|takenAs/))add('shield_up','reclamation','frost_beam','storm_channel');
  if(matches(/trap|construct|fuse|totem|procession|terrain|terraform|attune|tether|field|carried/i))add('flame_totem','torpor_field','strangler_seed','fire_mine','detonate_mines','consecration','orb_of_storms');
  if(matches(/proj|arrow|chain|cast|fork|bounce|recurve|stage|munition|charge|skillCost|surplus/i))add('gyreblade','ball_lightning','bolt_repeater','reload_powder','frost_storm');
  if(matches(/flask|heal|restore|recovery|offering|atonement/i))add('mend','war_cry','life_flask','mana_flask');
  const skills=[...selected].filter(id=>SKILLS[id]).map(id=>makeSkillInstance(SKILLS[id]));
  for(const inst of skills)w.meta.knownSkills.set(inst.def.id,inst);
  const startHp=enemy.life;
  for(const [i,inst] of skills.entries()){
    // Keep the receipt source on an actual seat, including the deployed
    // family during its upkeep. Respect normal mana payment and aim rules.
    p.skills[i%8]=inst;p.casting=null;p.useLock=0;p.cooldowns.delete(inst.def.id);
    const self=inst.def.delivery.type==='self'||inst.def.delivery.type==='aura',heal=inst.def.targeting?.target==='ally'||inst.def.targeting?.target==='minion';
    if(heal)ally.life=ally.maxLife()*.4;
    const target=heal?ally:self?p:enemy;
    if(tags.has('vs:casting')||tags.has('vs:guarding')){enemy.useLock=0;enemy.casting=null;w.useSkill(enemy,makeSkillInstance(SKILLS.shield_up),p.pos,true);}
    const paidAt=p.mana;
    if(w.useSkill(p,inst,target.pos,true)){
      measure('mana spent at the '+inst.def.name+' press',paidAt-p.mana);
      for(let t=0;t<12;t++){
        if(p.casting)p.casting.held=t<8;
        w.update(.09);watch();
      }
      measure('net mana used across the cast and recovery for '+inst.def.name,paidAt-p.mana);
      measure('residual cooldown on '+inst.def.name,p.cooldowns.get(inst.def.id)??0);
    }
    const bodies=w.actors.filter(a=>a.owner===p&&a.summonInst?.def.id===inst.def.id&&!a.dead);
    if(bodies.length){
      const body=bodies[0],weapon=body.skills.find(Boolean);
      measure(inst.def.name+' body life',body.maxLife());measure(inst.def.name+' body speed',body.sheet.get('moveSpeed'));
      if(weapon && !enemy.dead){const hp=enemy.life;w.resolveHit(body,weapon,enemy);measure(inst.def.name+' body damage',hp-enemy.life);}
      if(matches(/death|pact|offering/i)){w.kill(body,false,enemy);watch();}
    }
    if(!p.dead&&!enemy.dead && inst.def.effects.some(f=>f.type==='damage'))w.resolveHit(p,inst,enemy);
    watch();if(p.dead||enemy.dead)break;
  }
  measure('damage in the equipped sequence',startHp-enemy.life);
  measure('remaining ally life after the sequence',ally.life);
  measure('active allied bodies',w.actors.filter(a=>a.owner===p&&!a.dead).length);
  measure('remaining player life',p.life);
  if(matches(/lastGaspLife/)){
    p.sheet.setSource('last-gasp-owner',[mod('lastGasp','override',1)]);p.es=0;p.life=1;
    applyDot(p,p.maxLife()*3,'chaos');measure('life retained after a lethal wound',p.life);w.update(.05);watch();
  }
}
