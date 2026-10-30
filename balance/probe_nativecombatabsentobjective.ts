/** Actual empty-source clear and native physical-seat XP law. */
import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import {vec} from '../src/core/math';
import {makeSimWorld} from '../src/sim/arena';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,writeCombatProof,combatHash} from './probe_nativecombatcycle';
const result=withSeededRandom(44781,()=>{const setup=nativeCampaignFixture(),definitionB=mintAdditionalNativeArea(setup);setup.definition.objective={kind:'clear'};return refuseWorldCombat([setup.writer],calls=>{
 const {ongoing:a,authority,campaign,coordinator}=birthActualNativeArea(setup),hero=a.assembly.input.scene.player,scene=a.assembly.input.scene;
 const caster=a.assembly.input.population.createMonster('skeleton_warrior',12,'player'),target=a.assembly.input.population.createMonster('skeleton_warrior',12,'enemy');
 caster.pos=a.assembly.input.geometry.clampPos(vec(2000,1700),caster.radius);target.pos=a.assembly.input.geometry.clampPos(vec(2030,1700),target.radius);scene.actors.push(caster,target);authority.claim(a.binding,[caster,target]);
 for(const body of [...scene.actors])if(body!==target&&body.team==='enemy'&&!body.dead)a.combat.kill(body,false,caster);
 assert.equal(scene.actors.filter(body=>body.team==='enemy'&&!body.dead).length,1);assert.equal(a.assembly.input.objectives.objectiveDone,false);
 coordinator.runFrom(a,()=>coordinator.loadZone(definitionB.id,scene.zone.id));const b=coordinator.current;
 assert.notEqual(b,a);assert.equal(scene.actors.includes(hero),false);assert.equal(a.assembly.scenePresence.seats.length,0);assert.equal(a.combat.isPresentLocalPlayer(),false);assert.equal(b.combat.isPresentLocalPlayer(),true);
 const xp=campaign.localSeat.meta.xp,level=hero.level,relay=hero.statusRelay,life=hero.life,bDone=b.assembly.input.objectives.objectiveDone,bTexts=b.assembly.objectiveController.input.state.texts.length;
 a.combat.kill(target,false,caster);assert.equal(target.dead,true);const afterKill=campaign.localSeat.meta.xp;
 a.updateObjective(1/60);assert.equal(a.assembly.input.objectives.objectiveDone,true);assert.ok(campaign.completedObjectives.has(scene.zone.id));assert.equal(b.assembly.input.objectives.objectiveDone,bDone);assert.equal(b.assembly.objectiveController.input.state.texts.length,bTexts);
 // XP is native physical-seat policy: A has no recipients, so do not invent B payout.
 assert.equal(campaign.localSeat.meta.xp,afterKill);assert.equal(hero.level,level);assert.equal(hero.statusRelay,relay);assert.equal(hero.life,life);assert.equal(authority.require(hero).combat,b.combat);
 const textCount=a.assembly.objectiveController.input.state.texts.length,completed=[...campaign.completedObjectives];a.updateObjective(1/60);assert.equal(a.assembly.objectiveController.input.state.texts.length,textCount);assert.deepEqual([...campaign.completedObjectives],completed);
 authority.assertAdmitted(scene);authority.assertAdmitted(b.assembly.input.scene);
 return{source:scene.zone.id,destination:definitionB.id,sourceComplete:true,sourceSeats:a.assembly.scenePresence.seats.length,killXp:afterKill-xp,objectiveXp:campaign.localSeat.meta.xp-afterKill,sourceTexts:a.assembly.objectiveController.input.state.texts.slice(-2).map(t=>({text:t.text,pos:t.pos})),worldDrivers:calls};
 });});
const ordinary=withSeededRandom(44782,()=>{const w=makeSimWorld('warrior',991),hero=w.player,seat=w.localSeat,xp=seat.meta.xp;w.zone.objective={kind:'clear'};w.objectiveDone=false;w.seats=[];Reflect.apply(Reflect.get(w,'completeObjective'),w,['Area cleared']);assert.equal(w.objectiveDone,true);assert.equal(seat.meta.xp,xp);assert.equal(hero,w.player);return{physicalSeats:w.seats.length,objectiveXp:seat.meta.xp-xp,complete:w.objectiveDone};});
assert.equal(result.objectiveXp,ordinary.objectiveXp);
const report={mode:'Actual A→B first visit, retained A last enemy death and watcher completion with no physical avatar; native physical-seat XP selection compared separately with ordinary World empty-seat completion. No detached objective recipient policy added.',result,ordinary,receipt:combatHash(JSON.stringify({result,ordinary}))};writeCombatProof('native-combat-absent-objective.json',report);console.log(JSON.stringify(report));
