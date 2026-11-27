// Longer encounters for cues whose owner spans several casts, deaths or zones.
import { arena } from './skillVisualFixture';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { PASSIVE_NODES } from '../src/data/passives';
import { makeSkillInstance, supportFitsInst } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { HARVEST_NODES } from '../src/data/harvest';
import { CARRIED_FIELDS, carriedFieldStat } from '../src/data/carriedFields';
import { World } from '../src/engine/world';
import { classById } from '../src/sim/arena';
import { makeAccount } from '../src/meta/account';
import { PACKAGES } from '../src/packages/registry';
import { buildManifest } from '../src/packages/manifest';
import { CRUSADE_SURGE } from '../src/packages/defs/crusade';
import { FACTIONS, MONSTERS } from '../src/data/monsters';
import { runAIActions } from '../src/engine/aiActions';
import { INCURSION_ARCHETYPES } from '../src/packages/overlays/incursion';
import { WEATHER_DEFS } from '../src/world/weather';
import { WorldBossField } from '../src/packages/overlays/worldboss';
import { MODES } from '../src/meta/modes';
import { applyDot } from '../src/engine/damage';
import { doodadRuleKinds, doodadRuleOf, registerDoodadRule, unregisterDoodadRule } from '../src/engine/levelgen';
import { TERRAFORMS } from '../src/data/attunements';

const skills=Object.values(SKILLS);
function socket(inst,support){
  if(!supportFitsInst(support,inst))return false;
  inst.sockets[0]={def:support,level:1};return true;
}
function grant(w,stat,min=Number.EPSILON){
  const node=Object.values(PASSIVE_NODES).find(n=>n.mods?.some(m=>m.stat===stat && m.value>=min));
  if(!node)return;
  w.meta.allocated.add(node.id);w.recalcSeat(w.localSeat);return node.name;
}
function prepare(){
  const fight=arena(),{p,enemy}=fight;
  p.sheet.setSource('course-loadout',[mod('mana','flat',5000),mod('accuracy','flat',10000)]);p.fillResources();
  enemy.sheet.setSource('course-target',[mod('evasion','override',0),mod('blockChance','override',0)]);
  return fight;
}
export function combinedEncounters({collect,ticks,voices,witness}){
  for(const active of [false,true]){
    const {w,p,enemy}=prepare();
    const name=active?grant(w,'harmonyPower',.05):'Unallocated';
    const attacks=['firebolt','frostbolt'].map(id=>makeSkillInstance(SKILLS[id]));
    p.skills=attacks;
    for(let j=0;j<15;j++){
      const press=attacks[j%2];w.useSkill(p,press,enemy.pos,true);
      ticks(w,16,(name??'Harmony')+' · alternate paid fire and cold casts',.09);
      if(!active&&w.flashes.some(f=>f.fx?.startsWith('mechanic:harmony')))throw Error('Alternation alone released Harmony');
    }
  }
  for(const id of ['snipe','frost_nova']){
    if(!SKILLS[id])continue;
    const {w,p,enemy}=prepare(),name=grant(w,'cadenceFinisher');if(!name)continue;
    const next=w.createMonster('zombie',1,'enemy');next.pos={x:enemy.pos.x+48,y:enemy.pos.y+15};w.actors.push(next);next.brain=undefined;
    const skill=makeSkillInstance(SKILLS[id]);
    for(let j=0;j<12;j++){
      w.resolveHit(p,skill,enemy);collect(w,name+' · fourth '+skill.def.name+' hit beside a second enemy');w.update(.2);
    }
  }
  for(const key of ['eruption_cycle','channeled_tempest','hex_blast','time_fuse','overcharge']){
    const support=SUPPORTS[key];
    const candidates=skills.filter(def=>key==='hex_blast'?def.tags.includes('curse')&&def.delivery.type==='ground':
      key==='time_fuse'?def.delivery.type==='self'&&def.effects.some(f=>f.type==='buff'):
      key==='overcharge'?def.id==='firebolt':def.castMode==='channel'&&(!def.channel?.maxHold||def.channel.maxHold>2.5));
    const def=candidates.find(s=>supportFitsInst(support,makeSkillInstance(s)));if(!def)continue;
    for(const enabled of [false,true]){
      const {w,p,enemy}=prepare(),inst=makeSkillInstance(def);
      if(enabled)socket(inst,support);p.skills=[inst];
      w.useSkill(p,inst,enemy.pos,true);
      for(let j=0;j<120;j++){
        if(p.casting)p.casting.held=true;
        w.update(.06);
        collect(w,def.name+(enabled?' with '+support.name:' alone')+' · held cast and its delayed effects');
      }
    }
  }
  for(const def of CARRIED_FIELDS){
    const {w,p,enemy}=prepare(),stat=carriedFieldStat(def.id);
    // Some maintained fields come from gear. These are controlled grant-level
    // encounters, distinct from the player actually dropping that gear.
    p.sheet.setSource('carried-field-grant',[mod(stat,'flat',1)]);w.update(.05);
    for(const id of def.castSkills){
      const inst=makeSkillInstance(SKILLS[id]);p.skills=[inst];w.useSkill(p,inst,enemy.pos,true);
      for(let i=0;i<50;i++){w.update(.08);collect(w,def.name+' · matching paid '+inst.def.name+' feeds the field',true);}
    }
  }
  {
    const {w,p,enemy}=prepare(),name=grant(w,'fieldCarryMore');
    if(name){
      const field=makeSkillInstance(SKILLS.consecration);
      w.executeSkill(p,field,p.pos);ticks(w,12,name+' · arm allied ground',.1);
      enemy.pos={x:p.pos.x+230,y:p.pos.y};
      w.executeSkill(p,makeSkillInstance(SKILLS.firebolt),enemy.pos);ticks(w,24,name+' · Firebolt crosses allied ground',.04);
    }
  }
  for(const def of skills.filter(s=>s.delivery.healBurst||s.delivery.domeMode==='dissolve')){
    const {w,p,enemy}=prepare(),inst=makeSkillInstance(def);
    if(def.delivery.healBurst){
      w.executeSkill(p,inst,p.pos);
      const tree=w.actors.find(a=>a.construct?.healBurst);if(!tree)continue;
      const blow=makeSkillInstance(SKILLS.cleave);
      for(let i=0;i<12&&!tree.dead;i++){w.resolveHit(p,blow,enemy);collect(w,def.name+' · allies deal damage within the grove');}
      if(!tree.dead)w.kill(tree,false,enemy);collect(w,def.name+' · reservoir heals on destruction');
    }else{
      const reflects=Object.values(SUPPORTS).find(s=>s.domeDeflect||s.mods?.some(m=>/dome.*(reflect|deflect)/i.test(m.stat)));
      if(!reflects || !socket(inst,reflects))continue;
      enemy.pos={x:p.pos.x+170,y:p.pos.y+48};w.executeSkill(enemy,inst,{x:p.pos.x+135,y:p.pos.y});
      w.executeSkill(p,makeSkillInstance(SKILLS.firebolt),{x:p.pos.x+310,y:p.pos.y});
      ticks(w,35,def.name+' with '+reflects.name+' · firebolt enters from outside',.035);
    }
  }
  for(const id of ['offering','escape','procession']){
    const {w,p}=prepare(),home=w.zone.id;
    const zid=w.devMintTileset('grassland',18,4,{seed:369513});if(!zid)continue;
    w.loadZone(home);const zone=w.zoneMap[zid];
    zone.objective=id==='escape'?{kind:id,interval:[2,3]}:{kind:id};
    w.zoneMemory.delete(zid);w.completedObjectives.delete(zid);w.loadZone(zid);
    p.invulnerable=true;
    const procession=w.procession,altar=w.offering&&w.altars[w.offering.altarIdx];
    for(let i=0;i<1100&&!w.objectiveDone;i++){
      if(procession){
        const cart=w.actorById(procession.cartId);if(!cart)break;
        p.pos={...cart.pos};p.tier=cart.tier;
        if(procession.started && i>120)cart.pos={...procession.dest};
        for(const foe of w.enemiesOf(cart))if(!foe.dead&&!foe.invulnerable)w.kill(foe,false,p);
      }else if(altar && i%3===0){
        p.pos={...altar.pos};p.tier=altar.tier??0;
        const foe=w.createMonster('zombie',zone.level,'enemy');foe.tier=p.tier;foe.pos={...p.pos};w.actors.push(foe);w.kill(foe,false,p);
      }else if(id==='escape'&&i>70)break;
      if(id==='escape'){
        if(!w.zone.packs)w.zone.packs={count:[1,2],size:[2,3],table:FACTIONS.undead.table};
        for(const mob of w.countedEnemies().slice(12))w.kill(mob,false,p);
      }
      w.update(.15);collect(w,'Configured '+id+' objective · '+(procession?'escort progress':altar?'enemy dies within the offering radius':'survive reinforcements'),true);
    }
  }
  // Test the harvest extension’s fallback by omitting its optional art on a
  // local copy. All published nodes keep their original registered finish.
  if(HARVEST_NODES.every(def=>def.breakFx)){
    const {w,p}=prepare(),def={...HARVEST_NODES[0],breakFx:undefined};
    const doodad={kind:def.kind,pos:{...p.pos},tier:p.tier,radius:16};
    w.harvestNodes=[{pos:doodad.pos,def,doodad,spent:true}];w.doodads.push(doodad);
    const session={ix:0,held:false,seatId:w.localSeat.id,seq:[0],done:0,misses:1};
    w.harvestSessions=[session];w.harvestSettle(session,'expiry');
    collect(w,'Configured harvest node without break art · all shipped nodes select a material-specific finish',true);
  }
  for(const [id,type] of [['ruptureBank','rupture'],['transfuseStatus','transfuseStatus']]){
    const def=skills.find(s=>s.effects.some(f=>f.type===type));
    const row=voices.get('mechanic:'+id);if(!row||!def)continue;
    const {w,p,enemy}=prepare(),fx=def.effects.find(f=>f.type===type),status=fx.status??'poison',donor=id==='ruptureBank'?enemy:p;
    donor.applyStatus(status,20,1,p.name,{casterId:p.id});w.resolveHit(p,makeSkillInstance(def),enemy);
    const receipt=w.flashes.find(f=>id==='ruptureBank'?f.statusRelease:f.mechanicLink?.kind==='transfusionTransfer');
    if(receipt){const n=witness(w,receipt);if(n>=8 && row.state!=='Combat frame')Object.assign(row,{state:'Superseded combat art',detail:def.name+' produced '+(receipt.fx??receipt.mechanicLink?.kind)+' ('+n+' changed pixels). The released status or transfer link carries the real effect.'});}
  }
  for(const funded of [false,true]){
    const {w,p,enemy}=prepare(),retaliation=makeSkillInstance(SKILLS.pain_hounds);
    p.skills=[retaliation];if(funded)w.executeSkill(p,retaliation,p.pos);
    for(let i=0;i<15;i++){w.resolveHit(enemy,makeSkillInstance(SKILLS.cleave),p);collect(w,'Pain Hounds · incoming hit '+(funded?'after loading shards':'without shards'));w.update(.1);}
  }
  for(const def of skills.filter(s=>s.shatterStatus)){
    const {w,p,enemy}=prepare(),inst=makeSkillInstance(def);
    w.resolveHit(p,inst,enemy);collect(w,def.name+' · unmarked control');
    enemy.applyStatus(def.shatterStatus.statuses[0],1,3,p.name,{casterId:p.id});
    w.resolveHit(p,inst,enemy);collect(w,def.name+' · strike and consume a matching status');
  }
  {
    const {w,p}=prepare(),inst=makeSkillInstance(SKILLS.reclamation);
    p.skills=[inst];w.useSkill(p,inst,p.pos,true);p.mana=p.maxMana()*.5;
    p.sheet.setSource('regen-for-reservoir',[mod('manaRegen','flat',24)]);
    ticks(w,28,'Reclamation · mana regeneration enters the reservoir',.15);
    p.mana=0;w.update(.08);collect(w,'Reclamation · low mana vents the banked regeneration');
  }
  const account=makeAccount();
  for(const pkg of PACKAGES){
    account.packageUnlocks.add(pkg.id);
    account.packageDefaults[pkg.id]={enabled:true,weight:pkg.defaultWeight,startLevel:pkg.defaultStartLevel};
  }
  const w=new World(account,Object.freeze(buildManifest(account,79481)));
  w.createPlayer(classById('warrior'),{startingCompanions:false});const p=w.player;
  p.level=100;p.invulnerable=true;
  const home=w.zone.id;
  const zones=Object.values(w.zoneMap).filter(z=>z.id!==home&&!z.caveDepth&&!z.special&&!z.pocket&&!z.eventOwned&&!z.boundless);
  const view=w.devOverlayView();
  const uf=w.sim.unsealingField;
  if(uf){
    const pocket=zones.find(z=>z.exits.length);
    let seed=0;while(seed<2048&&uf.roleFor(seed).kind!=='tomb')seed++;
    if(pocket && seed<2048){
      w.loadZone(pocket.id);
      const tomb={...w.zone,biome:'sepulcher',caveDepth:1,seed};
      w.materializeUnsealing(tomb,false);
      if(w.unsealingSite){
        uf.devIgnite(pocket.id);p.pos={...w.unsealingSite.doorPos};
        w.materializeUnsealing(tomb,true);collect(w,'Configured sepulcher tomb · last talisman opens the gate and waking-distance starts the boss fight',true);
      }
    }
  }
  const vermin=w.sim.verminfallField;
  if(vermin){
    const z=zones.find(z=>vermin.devIgnite(view,z.id));
    if(z){
      w.loadZone(z.id);w.update(.1);
      for(const nest of w.actors.filter(a=>a.tag==='warren_nest')){w.kill(nest,false,p);collect(w,'The Rat King · break each warren in the infested region');}
    }
  }
  const night=w.sim.longNightField;
  if(night){
    const grounds=[];
    for(const z of zones){
      if(!night.devEstablish(view,z.id))continue;
      grounds.push(z.id);if(grounds.length>=night.surge().countess.courtAt+1)break;
    }
    for(const z of grounds)night.devFeed(z,night.surge().nightsToConvert);
    for(const z of grounds){
      w.loadZone(z);w.update(.1);collect(w,'The Long Night · arrive in a feeding ground');
      const coach=w.actors.find(a=>a.tag==='long_night_coach'),court=w.actors.find(a=>a.tag==='long_night_court');
      if(coach){w.kill(coach,false,p);collect(w,'The Long Night · destroy the gloom coach');}
      if(court){w.kill(court,false,p);collect(w,'The Long Night · defeat the Countess in her court');}
    }
  }
  const df=w.sim.demonField?.surge(),warded=df?.types.find(t=>t.realm?.wards);
  for(const [name,kit,monster,faction,tileset] of [
    ['Demon seal ritual',warded?.realm,df?.portal.champion.monsterId,'demon',warded?.realm?.tileset],
    ['Crusade champion calls',CRUSADE_SURGE.sanctum.arena,w.sim.warlord.bossId('demon')??FACTIONS.demon.table.at(-1).id,'demon',CRUSADE_SURGE.sanctum.tileset],
  ]){
    if(!kit||!monster)continue;
    w.loadZone(home);w.enterRealmArena({caveId:'test_'+faction+'_'+monster+'_'+name.length,tileset,arena:kit,packs:null,returnPos:p.pos,rosterTable:FACTIONS[faction].table,boss:{monsterId:monster,faction}});
    for(const seal of [...(w.arenaWard?.seals??[])]){
      w.breakArenaSeal(seal);collect(w,name+' · successive seal breaks in the authored arena',true);
    }
    const boss=w.actorById(w.arenaCrowd?.bossId);
    if(boss)for(const call of w.arenaCrowd.spec.championCalls??[]){
      boss.life=boss.maxLife()*call.atLifeFrac;w.updateArenaCrowd();collect(w,name+' · assistants leave the stands at the boss life threshold',true);
    }
  }
  const respawnMode=MODES.find(m=>m.stages[0].onDeath==='advance');
  if(respawnMode){
    const fresh=makeAccount(),run=new World(fresh,buildManifest(fresh,79481));run.createPlayer(classById('warrior'),{modeId:respawnMode.id,startingCompanions:false});
    const hero=run.player;run.kill(hero,false);
    for(let i=0;i<120;i++){run.update(.1);collect(run,respawnMode.name+' · stage-crossing death and sanctuary wake');}
    if(run.modeStageDef().corpseSource==='own'){
      const records=run.corpseRecords(),recordIndex=records.length;
      records.push({owner:'p0',zoneId:run.zone.id,mapX:0,mapY:0,loot:{items:[{kind:'support',supportId:'time_fuse',level:1}]}});
      run.playerCorpses.push({pos:{...hero.pos},recordIndex,dwell:0,reclaimed:false,tier:hero.tier});
      ticks(run,40,'Recovery · reclaim a previous-life support from its corpse',.12);
    }
  }
  const variant=w.sim.fractureField?.surge().variants.find(v=>v.capstone);
  if(variant){
    w.loadZone(home);
    w.openFractureRift({id:'encounter-rift',variant:variant.variant,faction:variant.faction,color:FACTIONS[variant.faction].color},variant.capstone);
    collect(w,'Configured '+variant.variant+' fracture · concluding a successful capstone opens its reward portal',true);
  }
  for(const nodes of [[],['iron_shelter','reinforced_plate','broad_shelter','shared_shelter'],['iron_shelter','ready_watch'],
    ['measured_riposte','loaded_bash','unbroken_answer','hollow_counter']]){
    const {w,p,enemy}=prepare(),inst=makeSkillInstance(SKILLS.shield_up,20,3);
    for(const attr of ['strength','dexterity','willpower','intelligence'])w.meta.baseAttrs[attr]=100;
    inst.treeNodes=nodes;p.skills=[inst];w.meta.knownSkills.set(inst.def.id,inst);w.recalcPlayer();
    p.fillResources();w.useSkill(p,inst,enemy.pos,true);
    for(let i=0;i<48;i++){
      if(p.casting?.mode==='guard'){p.casting.held=true;w.guardArts.ram(p,1,0);}
      if(i===2 && p.absorbTotal>0)applyDot(p,p.absorbTotal+2,'chaos');
      w.update(.08);collect(w,'Shield Up · '+(nodes.at(-1)??'unmodified guard')+' while holding, pushing a foe or breaking the shield');
    }
  }
  for(const enabled of [false,true]){
    const {w,p,enemy}=prepare(),name=enabled?grant(w,'burnFeastPower'):'Unallocated control';
    const attack=makeSkillInstance(SKILLS.firebolt);
    for(let i=0;i<40;i++){
      w.resolveHit(p,attack,enemy);w.update(.1);collect(w,name+' · direct hit and subsequent lava pulses');
    }
  }
  for(const type of ['growth_lash','maw_reel']){
    const {w,p,enemy}=prepare(),growth=Object.values(TERRAFORMS).find(d=>d.effect?.id===type);
    const kind=growth?.doodadKind??doodadRuleKinds().find(k=>doodadRuleOf(k).effect?.id===type);if(!kind)continue;
    const effect=growth?{...growth.effect,target:'owner',ownerId:p.id,power:growth.effect.base+growth.effect.perLevel*p.level}:doodadRuleOf(kind).effect;
    const pos={x:enemy.pos.x+67,y:enemy.pos.y};
    w.doodads.push({kind,pos,radius:12,tier:p.tier,effect:{...effect,cd:0}});w.markDoodadsChanged();
    ticks(w,50,kind+' · armed terrain reaches a target beyond the lip',.125);
  }
  {
    const {w,p}=prepare(),kind='encounter_course_brittle',original=doodadRuleKinds().find(k=>doodadRuleOf(k).brittle?.on.includes('hit'));
    if(original){
      const base=doodadRuleOf(original);
      registerDoodadRule(kind,{...base,dissolve:undefined,brittle:{...base.brittle,pop:undefined}});
      try{
        const d={kind,pos:{x:p.pos.x+19,y:p.pos.y},radius:18,tier:p.tier};
        w.doodads.push(d);w.markDoodadsChanged();w.strikeSurfaces(p,d.pos,32);
        collect(w,'Configured breakable with no material finish · struck with a weapon',true);
      }finally{unregisterDoodadRule(kind);}
    }
  }
  {
    const {w,p,enemy}=prepare(),inst=makeSkillInstance(SKILLS.firebolt,20);
    inst.treeNodes=['cinder_lance','white_heat','focused_flame'];p.skills=[inst];w.meta.knownSkills.set(inst.def.id,inst);
    const donor=w.createMonster('zombie',1,'enemy');donor.pos={x:enemy.pos.x+70,y:enemy.pos.y};donor.brain=undefined;w.actors.push(donor);
    donor.applyStatus('burn',20,1,p.name,{casterId:p.id});
    const contact=w.projectileArts.prepare(p,inst,true);w.resolveHit(p,contact,enemy,1,0);w.projectileArts.update(.02);
    collect(w,'Pyreheart · the strongest Firebolt target draws an existing ignite from a second body');
  }
  for(const funded of [false,true]){
    const {w,p,enemy,ally}=prepare(),inst=makeSkillInstance(SKILLS.firebolt);
    if(funded)socket(inst,SUPPORTS.blood_toll);
    ally.pos={x:p.pos.x+22,y:p.pos.y+18};p.skills=[inst];w.executeSkill(p,inst,enemy.pos);collect(w,'Blood Toll · '+(funded?'consume a nearby owned summon':'unsupported control'));
  }
  for(const def of skills.filter(s=>s.delivery.strikeRelease)){
    const {w,p,enemy}=prepare(),inst=makeSkillInstance(def);p.skills=[inst];w.meta.knownSkills.set(def.id,inst);
    w.executeSkill(p,inst,enemy.pos);const summoned=w.actors.filter(a=>a.summonInst===inst);
    for(const a of summoned){a.pos={x:p.pos.x+24,y:p.pos.y};a.tier=p.tier;}
    w.executeSkill(p,makeSkillInstance(SKILLS.cleave),enemy.pos);
    ticks(w,60,def.name+' · hit a receptive companion and wait for it to reform',.1);
  }
  {
    const {w,p,ally,enemy}=prepare(),inst=makeSkillInstance(SKILLS.summon_skeleton,20);
    inst.treeNodes=['grave_phalanx','veteran_watch'];p.skills=[inst];w.meta.knownSkills.set(inst.def.id,inst);w.executeSkill(p,inst,p.pos);
    for(const a of w.actors)if(a.summonInst===inst){a.pos={x:p.pos.x+20,y:p.pos.y};a.tier=p.tier;}
    for(let i=0;i<18;i++){w.update(.1);w.resolveHit(enemy,makeSkillInstance(SKILLS.cleave),i%2?p:ally);collect(w,'Veteran Watch · allied sentinel intercepts damage to a nearby ally');}
  }
  {
    const {w,p,enemy}=prepare(),pad=makeSkillInstance({...SKILLS.temporal_pad,id:'encounter_extension_pad'});
    p.skills=[pad];w.meta.knownSkills.set(pad.def.id,pad);
    w.executeSkill(p,pad,enemy.pos);const body=w.actors.find(a=>a.summonInst===pad);
    if(body){p.pos={...body.pos};p.tier=body.tier;w.updateConstructs(.05);collect(w,'Configured launch pad without a registered presence profile · owner steps onto it',true);}
  }
  {
    const {w,p,enemy}=prepare(),def=skills.find(s=>s.delivery.deathBurst?.damageScale);
    if(def){
      const inst=makeSkillInstance({...def,delivery:{...def.delivery,deathBurst:{...def.delivery.deathBurst,impactFx:undefined}}});
      w.executeSkill(p,inst,enemy.pos);const body=w.actors.find(a=>a.summonInst===inst);
      if(body){w.kill(body,false,enemy);collect(w,'Configured breakable construct · defeat a barrier whose death burst omits its optional art',true);}
    }
  }
  {
    // Stage a saved blockade on a real connected road, then remove the
    // serpent. Both halves run through the normal solid-world materializer.
    const original=w.sim.worldBossFieldFor(),base=original?.surge();
    const roaming=base?.defs.find(d=>d.roam);
    const def=roaming??(base && {...base.defs[0],archetype:'roamer',roam:{passingMonster:base.defs[0].monster,wallKind:'rock',venue:'ground'}});
    const field=roaming?original:def?new WorldBossField({seed:79481,gate:()=>original.gate()},{...base,defs:[def]}):null;
    const z=w.zoneMap[home];
    if(z && def){
      w.loadZone(z.id);const ends=w.exits.filter(e=>w.zoneMap[e.to]).map(e=>e.to);
      if(ends.length){
        const next=ends[1]??Object.keys(w.zoneMap).find(id=>id!==z.id&&id!==ends[0]);
        const saved=field.snapshot(),serpent={id:'course-coils',defId:def.id,path:[ends[0],z.id,next],edgeSealAt:[0,0],phase:'settled'};
        field.restore({...saved,serpents:[serpent]});w.updateWorldBossWalls(field);collect(w,'Configured roaming sovereign · a saved coil blockade seals the roads'+(roaming?'':' using an extension boss because the current roster has no roamer'),true);
        field.restore(saved);w.updateWorldBossWalls(field);collect(w,'Configured roaming sovereign · ending the blockade opens the roads',true);
      }
    }
  }
  {
    const inc=w.sim.incursionField,kind=Object.values(INCURSION_ARCHETYPES).find(a=>a.termination.policy==='hybridCleanseObserver');
    if(inc&&kind){
      w.loadZone(home);inc.ignite(kind.id,w.zone.map,14);
      const req=inc.mintRequests.at(-1),z=zones.find(z=>!z.special);
      if(req&&z){inc.bindEpicenter(req.id,z.id,z.map);w.loadZone(z.id);w.materializeObserver(z);collect(w,'Configured hybrid incursion · enter the observer’s bound epicenter',true);}
    }
    const {w:haunt,enemy}=prepare();enemy.tag='haunt_spawn';haunt.dissipateHauntSpawns('#a8b7cd');
    collect(haunt,'Configured haunt · the cleansing light dissipates its living spawn',true);
  }
  for(const tileset of ['aether','aether_drift']){
    w.loadZone(home);const minted=w.devMintTileset(tileset,16,8,{seed:952869});if(!minted)continue;
    const foe=w.createMonster('zombie',8,'enemy');foe.brain=undefined;w.actors.push(foe);
    if(w.flux){
      const f=w.flux;
      for(let t=0;t<220;t++){
        const frayed=f.pads.find(pad=>f.padPhase(pad).s===3);
        if(frayed){foe.pos={x:frayed.cx,y:frayed.cy};runAIActions(w,foe,[{do:'x_ride_flux'}],p);}
        w.updateFlux(.15);collect(w,'Configured moving cloud shelf · pads disperse and a ledge rider seeks standing ground',true);
      }
    }
    if(w.collapse){
      const cf=w.collapse;
      const i=cf.state.indexOf(0),cell=cf.walk.cell;
      w.updateCollapse(.05);
      if(i>=0){foe.pos={x:(i%cf.walk.cols+.5)*cell,y:(Math.floor(i/cf.walk.cols)+.5)*cell};foe.tier=p.tier;p.pos={...foe.pos};}
      for(let t=0;t<210;t++){w.updateCollapse(.2);collect(w,'Configured cloud causeway · eroding floor collapses',true);}
      if(!foe.dead){w.routeSkyFalls([foe]);collect(w,'Configured cloud causeway · the fall router receives an enemy that lost its footing',true);}
    }
  }
  w.loadZone(home);
  const ship=w.sim.wraithsailField,port=zones.find(z=>z.port)??zones[0];
  if(ship&&port){
    const prior=port.port;port.port=true;
    try{
      const saved=ship.snapshot();
      ship.restore({...saved,ship:{id:'course-sail',coord:port.map,mode:'docked',dockZoneId:port.id,dockSeq:1,dockLeft:90}});
      if(ship.dockedOn(port.id)){
        w.loadZone(port.id);w.updateWraithsailDock();collect(w,'Configured port · the Wraithsail puts its shore party ashore',true);
        if(!w.portDock()){w.doodads.push({kind:'dock',pos:{...p.pos},radius:28});w.markDoodadsChanged();}
        p.pos={...w.portDock().pos};w.objectiveDone=true;
        w.enterSailing();
        if(w.voyage){
          const sailing=ship.snapshot();ship.restore({...sailing,ship:{...sailing.ship,mode:'running',coord:w.nodeFromSea(p.pos),dockZoneId:null,dockLeft:0,holdLeft:0}});
          w.beginWraithsailBoarding();collect(w,'Configured sea encounter · intercept the restored ghost ship while sailing',true);
        }
      }
      ship.restore(saved);
    }finally{port.port=prior;}
  }
  w.loadZone(home);
  const sf=w.sim.swarmingField;
  if(sf){
    const z=zones.find(z=>sf.devIgnite(view,z.id));
    if(z&&sf.devWing(view)){
      w.loadZone(z.id);
      for(let i=0;i<sf.surge().alateGuard;i++){
        const a=w.createMonster(sf.surge().alateId,5,'enemy');a.tag='swarm_alate';a.pos={...p.pos};w.actors.push(a);w.kill(a,false,p);collect(w,'Configured swarm in flight · defeat its alate guard',true);
      }
    }
  }
  for(const [title,trigger] of [
    ['Ice comet weather',(w,at)=>{const def=Object.values(WEATHER_DEFS).find(d=>d.strike?.fx==='comet');if(def)w.fireStrikeAt(def.strike,at);}],
    ['Petrified tree shrapnel',(w,at)=>w.mintHazardCloud(at,doodadRuleOf('petrified_tree').brittle.fume)],
  ]){
    const {w,p,enemy}=prepare();trigger(w,enemy.pos);ticks(w,45,title+' · target stands in the warned footprint',.08);
  }
  for(const id of ['torpor_field','sanctuary','strangler_seed']){
    const {w,p,enemy}=prepare(),inst=makeSkillInstance(SKILLS[id]);
    const support=Object.values(SUPPORTS).find(s=>s.constructFx?.pulse);
    if(id==='strangler_seed'&&support)socket(inst,support);
    p.skills=[inst];w.meta.knownSkills.set(id,inst);
    w.executeSkill(p,inst,p.pos);const body=w.actors.find(a=>a.presenceBadge?.skillId===id);
    if(!body)continue;
    if(id==='strangler_seed'){
      enemy.pos={x:body.pos.x+12,y:body.pos.y};enemy.tier=body.tier;
      for(let i=0;i<25;i++){w.time+=.08;w.updateConstructs(.08);collect(w,'Strangler Seed with '+support?.name+' · a nearby enemy receives a grafted pulse',true);}
    }else{
      enemy.pos={x:body.pos.x-195,y:body.pos.y};w.executeSkill(enemy,makeSkillInstance(SKILLS.firebolt),{x:body.pos.x+155,y:body.pos.y});
      ticks(w,35,inst.def.name+' · hostile Firebolt crosses the occupied field',.045);
      w.executeSkill(enemy,makeSkillInstance(SKILLS.frostbolt),body.pos);
      const shot=w.projectiles.at(-1);
      if(shot){shot.pos={...body.pos};shot.tier=body.tier;w.interceptProjectileDomes(shot);
        collect(w,inst.def.name+' · hostile Frostbolt intercepted on the dome’s floor',true);}
    }
  }
  const orb=voices.get('mechanic:orbZap'),actualOrb=voices.get('skillPresence:pulse:orb_of_storms');
  if(orb?.state!=='Combat frame' && actualOrb?.state==='Combat frame'){
    Object.assign(orb,{state:'Related combat art',detail:'The registered orbZap painter has no identified shipped caller. Orb of Storms pays its own discharge with Spark. Observed source accent: '+actualOrb.detail});
  }
  {
    const {w,p,enemy}=prepare(),inst=makeSkillInstance(SKILLS.orb_of_storms),row=voices.get('mechanic:orbZap');
    p.skills=[inst];w.meta.knownSkills.set(inst.def.id,inst);
    w.executeSkill(p,inst,enemy.pos);
    for(let i=0;row && i<90;i++){
      w.update(.05);
      const accent=w.flashes.find(f=>f.fx==='skillPresence:pulse:orb_of_storms');
      if(accent){const n=witness(w,accent);if(n>=8){Object.assign(row,{state:'Related combat art',detail:'Orb of Storms actually discharged its Spark payload. The construct’s own source pulse changed '+n+' pixels. The separate orbZap painter has no identified shipped caller.'});break;}}
    }
  }
  {
    const {w,p}=prepare(),def=Object.values(MONSTERS).find(d=>d.lite&&d.plies?.count>1);
    if(def){
      w.devLitePour(def.id,6,{x:p.pos.x+86,y:p.pos.y});
      const inst=makeSkillInstance(SKILLS.firebolt);
      for(let i=0;i<12;i++){
        const row=w.lite.alive.findIndex((a,n)=>a&&w.lite.plies[n]>1);if(row<0)break;
        w.executeSkill(p,inst,{x:w.lite.x[row],y:w.lite.y[row]});ticks(w,7,def.name+' · Firebolt strips a ply from the swarm',.04);
      }
    }
  }
  {
    const {w,p,enemy}=prepare();
    w.burstDamage(enemy.pos,60,20,'physical','#d8c2aa',p.team,p.tier);
    collect(w,'Configured physical burst · the damage operation selects its default impact art',true);
  }
  w.loadZone(home);
  const surface=zones.find(z=>z.objective.kind!=='safe')??zones[0];
  if(surface){
    w.loadZone(surface.id);const nest=w.sim.verminfallField,court=w.sim.longNightField;
    if(nest){
      const original=nest.snapshot();
      nest.restore({...original,infestations:[{id:'course-warren',zoneId:surface.id,nestsTotal:2,nestsBroken:1}]});
      w.materializedInfestation.delete(surface.id);w.materializeInfestation(surface);
      const last=w.actors.find(a=>a.tag==='warren_nest'&&!a.dead);
      if(last){w.kill(last,false,p);collect(w,'Configured warren · defeat the last standing nest in a restored infestation',true);}
      nest.restore(original);
    }
    if(court){
      const original=court.snapshot();
      court.restore({...original,grounds:[{id:'course-court',zoneId:surface.id,coord:surface.map,converted:true,fedNights:10,countessHere:true}]});
      w.materializedLongNights.clear();w.updateLongNight(.1);
      const boss=w.actors.find(a=>a.tag==='long_night_court'&&!a.dead);
      if(boss){w.kill(boss,false,p);collect(w,'Configured Long Night finale · defeat the Countess at her converted estate',true);}
      court.restore(original);
    }
  }
  // Exercise the API defaults directly. Their distinct label keeps this out
  // of the set of shipped encounters actually observed requesting this art.
  {
    const {w,p,enemy}=prepare(),at=enemy.pos,shade='#deb16d';
    for(const [id,call] of [
      ['puzzleTouch',()=>w.puzzleHost().flash(at,35,shade)],
      ['trapActuates',()=>w.trapHost().fx(at,35,shade)],
      ['killReward',()=>w.killCtx(enemy,p,true).flash(at,35,shade)],
      ['occurrenceOpens',()=>w.occHost().flash(at.x,at.y,35,shade)],
    ]){
      const key='world:'+id,row=voices.get(key);
      if(!row||['Combat frame','Encounter replay'].includes(row.state))continue;
      const start=w.flashes.length;call();
      const event=w.flashes.slice(start).find(f=>f.fx===key);
      if(event){const n=witness(w,event);if(n>=8)Object.assign(row,{state:'Extension callback',detail:'The production '+id+' callback with no art override changed '+n+' combat-frame pixels. A shipped encounter requesting this default has yet to be observed.'});}
    }
  }
}
