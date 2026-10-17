import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import {mod} from '../src/engine/stats';
import {issueCommand} from '../src/engine/ai';
import {nativeCampaignFixture,birthActualNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,writeCombatProof,combatHash} from './probe_nativecombatcycle';
const result=withSeededRandom(7293,()=>{const setup=nativeCampaignFixture(7293);return refuseWorldCombat([setup.writer],drivers=>{
 const all=birthActualNativeArea(setup),{ongoing:a,authority,campaign,coordinator}=all,hero=campaign.localSeat.actor;campaign.time=10;
 try{
  for(const actor of a.combat.scene.actors)if(actor!==hero)actor.passive=true;
  const spawn=(id:string,dx:number,team:'player'|'enemy'='enemy')=>{const actor=a.assembly.input.population.createMonster(id,1,team);actor.pos={x:hero.pos.x+dx,y:hero.pos.y};actor.tier=hero.tier;actor.spawnedAt=-1;actor.untargetable=false;actor.sheet.setSource('minion-course',[mod('life','override',10000),mod('detectability','override',1),mod('detectionRange','override',1500)]);actor.fillResources();a.combat.scene.actors.push(actor);authority.claim(a.binding,[actor]);a.combat.springAmbush(actor,true);return actor;};
  const pet=spawn('plains_wolf',20,'player');pet.owner=hero;pet.brain={type:'basic',perception:{arcDeg:360,rearMul:1,xray:true},skillUse:{mode:'priority',order:[]}};
  const hare=spawn('meadow_hare',240),danger=spawn('zombie',210);danger.passive=true;
  const think=(rescan=true)=>{if(rescan)pet.aiRescanAt=0;pet.casting=null;pet.useLock=0;a.combat.updateAIActor(pet,0);return pet.aiTargetId;};
  assert.equal(think(),undefined,'retained pet ignores distant harmless prey');hare.pos.x=hero.pos.x+50;assert.equal(think(),hare.id,'idle contact remains available');
  danger.passive=false;pet.brain={...pet.brain,target:{prefer:'nearest',stickiness:100}};pet.threat.set(hare.id,10000);assert.equal(think(),danger.id,'real danger outranks held prey');danger.passive=true;
  assert.equal(think(),hare.id);hare.pos.x=hero.pos.x+190;pet.aiRescanAt=100;assert.equal(think(false),undefined,'cached chase drops before next scan');
  issueCommand(pet,{kind:'assault',pos:{...hare.pos},targetId:hare.id,until:20});assert.equal(think(),hare.id,'explicit native assault preserves player intent');authority.assertAdmitted(a.combat.scene);assert.deepEqual(drivers,[]);
  return {actualRetainedAI:true,distantPreyIgnored:true,idleContactAllowed:true,threatOverridesHeldPrey:true,cachedChaseExpires:true,explicitAssaultObeyed:true,worldDrivers:drivers};
 }finally{coordinator.retire();}
});});writeCombatProof('native-main-minion-parity.json',{result,receipt:combatHash(JSON.stringify(result))});console.log(JSON.stringify(result));
