import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import {mod} from '../src/engine/stats';
import {makeSkillInstance} from '../src/engine/skills';
import {SKILLS} from '../src/data/skills';
import {ORB_HIT_RECOVERY} from '../src/data/orbs';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,writeCombatProof,combatHash} from './probe_nativecombatcycle';
const result=withSeededRandom(9183,()=>{const setup=nativeCampaignFixture(9183),dest=mintAdditionalNativeArea(setup);return refuseWorldCombat([setup.writer],drivers=>{
 const all=birthActualNativeArea(setup),{ongoing:a,authority,coordinator,campaign}=all,hero=campaign.localSeat.actor;
 const enemy=(area:typeof a)=>{const e=area.assembly.input.population.createMonster('zombie',1,'enemy');e.pos=area.assembly.input.geometry.clampPos({x:hero.pos.x+70,y:hero.pos.y},e.radius);e.tier=hero.tier;e.sheet.setSource('orb-course',[mod('life','override',1e9),mod('evasion','override',0),mod('blockChance','override',0),mod('armor','override',0)]);e.fillResources();e.skills=[];e.brain=undefined;area.assembly.input.scene.actors.push(e);authority.claim(area.binding,[e]);return e;};
 const install=()=>{hero.skills=[makeSkillInstance(SKILLS.life_flask),makeSkillInstance(SKILLS.mana_flask)];hero.sheet.setSource('orb-course',[mod('critChance','override',0),mod('accuracy','override',100000),mod('orbOnHit_life','flat',1),mod('orbOnHit_mana','flat',1)]);hero.fillResources();hero.charges.clear();};install();
 const prey=enemy(a),skill=makeSkillInstance({...SKILLS.claw,baseDamage:{physical:[10,10]},effects:[{type:'damage'}]}),orbsA=a.assembly.lootController.input.state.orbs,random=Math.random;campaign.time=10;
 try{
  Math.random=()=>.99;a.combat.resolveHit(hero,skill,prey,1,0);assert(prey.life<1e9);assert.equal(orbsA.length,0);
  Math.random=()=>0;for(let i=0;i<20;i++)a.combat.resolveHit(hero,i%2?makeSkillInstance(SKILLS.heavy_strike):skill,prey,1,0);assert.equal(orbsA.length,0,'failed roll consumes its actor/kind cadence');
  // Actual native travel preserves the same actor and cannot buy a new roll.
  coordinator.runFrom(a,()=>coordinator.loadZone(dest.id,a.combat.scene.zone.id));const b=coordinator.current;assert.equal(campaign.localSeat.actor,hero);install();const other=enemy(b),orbsB=b.assembly.lootController.input.state.orbs;
  b.combat.resolveHit(hero,skill,other,1,0);assert.equal(orbsB.length,0,'area crossing and build refresh cannot bypass actor cadence');
  campaign.time+=ORB_HIT_RECOVERY.interval;b.combat.resolveHit(hero,skill,other,1,1);assert.equal(orbsB.length,0,'proc does not spend or shed');b.combat.resolveHit(hero,skill,other,1,0);assert.equal(orbsB.length,2);assert.deepEqual(orbsB.map(o=>o.kind).sort(),['life','mana']);assert.equal(orbsA.length,0,'destination rewards remain in actual destination');
  for(let i=0;i<20;i++)b.combat.resolveHit(hero,skill,other,1,0);assert.equal(orbsB.length,2);authority.assertAdmitted(a.combat.scene);authority.assertAdmitted(b.combat.scene);assert.deepEqual(drivers,[]);
  return {failedAttemptsPaced:true,skillSwapsPaced:true,actualTravelPreservesClock:true,buildRefreshPreservesClock:true,procIsolation:true,destinationLifeAndManaOrbs:orbsB.length,sourceOrbs:orbsA.length,worldDrivers:drivers};
 }finally{Math.random=random;coordinator.retire();}
});});writeCombatProof('native-main-orb-parity.json',{result,receipt:combatHash(JSON.stringify(result))});console.log(JSON.stringify(result));
