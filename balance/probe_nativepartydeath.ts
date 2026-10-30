import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';import {CLASSES} from '../src/data/classes';import {NullInput} from '../src/net/intent';import {World} from '../src/engine/world';
import {rollItem} from '../src/engine/itemgen';import {START_ZONE} from '../src/data/zones';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';import {refuseWorldCombat,combatHash,writeCombatProof} from './probe_nativecombatcycle';
const oracle=World.prototype.reckonRunEssence;
function course(mode:'mortal'|'immortal',stage:number){return withSeededRandom(45927,()=>{
 const setup=nativeCampaignFixture(45927),defB=mintAdditionalNativeArea(setup),remote=setup.writer.addSeat('death-peer',CLASSES.find(c=>c.id==='warrior')!,new NullInput(),{startingCompanions:false,startingFlasks:false});
 remote.couch={pad:1,side:'right',charId:'death-guest',rosterSlot:11};remote.meta.modeId=mode;remote.meta.modeStage=stage;setup.writer.meta.modeId=mode;setup.writer.meta.modeStage=stage;
 return refuseWorldCombat([setup.writer],calls=>{
 const {writer,ongoing:a,coordinator,authority}=birthActualNativeArea(setup);a.combat.scene.actors.push(remote.actor);remote.actor.pos={...writer.localSeat.actor.pos};a.admit([...a.combat.scene.actors]);a.combat.campaignFrame.enableHostedRoads();const idA=a.combat.scene.zone.id;
 coordinator.runFrom(a,()=>coordinator.loadZone(defB.id,idA));const b=coordinator.published;coordinator.runFrom(b,()=>coordinator.loadZone(idA,defB.id));coordinator.roadsFor(a.combat).shardWorld!.enqueue({seatId:remote.id,dest:defB.id});const drain=a.combat.campaignFrame.drainShardRoads();assert.equal(drain[0].outcome,'moved');assert.equal(authority.selectActors([remote.actor])[0].binding,b.binding);assert.equal(coordinator.published,a);
 const hero=writer.localSeat.actor,localItem=rollItem({ilvl:8})!,peerItem=rollItem({ilvl:8})!;assert(localItem&&peerItem);writer.meta.equipped.chest=localItem;remote.meta.equipped.chest=peerItem;writer.meta.essences.coarse=3;remote.meta.essences.coarse=17;
 const native=Reflect.apply(oracle,writer,[]),retained=a.combat.campaignTransitions.reckonRunEssence();assert.deepEqual(retained,native);assert.deepEqual(writer.reckonRunEssence(),native);
 a.combat.kill(hero);assert.equal(hero.downed,true);assert.equal(hero.dead,false);assert.equal(writer.gameOver,false);
 // Matching coordinates do not provide a physical revival across areas.
 remote.actor.pos={...hero.pos};const life=hero.life;for(let i=0;i<(mode==='mortal'?180:1);i++)a.combat.campaignFrame.tick(1/60);assert.equal(hero.life,life);assert.equal(hero.downed,true);
 const before={hero:{...hero.pos},peer:{...remote.actor.pos}};b.combat.kill(remote.actor);
 const intermediate={gameOver:writer.gameOver,pending:writer.pendingRespawn?.phase,localMode:writer.meta.modeStage,peerMode:remote.meta.modeStage};
 if(mode==='immortal'){
  const localDeath=writer.charDeaths.find(r=>r.loot.items.some(i=>i.kind==='gear'&&i.item.uid===localItem.uid)),peerDeath=remote.couchDeaths?.find(r=>r.loot.items.some(i=>i.kind==='gear'&&i.item.uid===peerItem.uid));
  assert(localDeath&&peerDeath);assert.equal(localDeath.zoneId,idA);assert.deepEqual(localDeath.pos,before.hero);assert.equal(peerDeath.zoneId,defB.id);assert.deepEqual(peerDeath.pos,before.peer);assert.equal(writer.meta.items.length,0);assert.equal(remote.meta.items.length,0);
  if(stage===0){assert.equal(writer.gameOver,false);assert.equal(writer.pendingRespawn?.phase,'out');coordinator.published.combat.campaignFrame.tick(1/60);for(let i=0;i<16&&writer.pendingRespawn;i++)coordinator.published.combat.campaignFrame.updateModeRespawn(.5);assert.equal(writer.pendingRespawn,null);}
  else assert.equal(writer.gameOver,true);
  assert.equal(coordinator.published.combat.scene.zone.id,START_ZONE);const owner=coordinator.published;assert.equal(authority.selectActors([hero])[0].binding,owner.binding);assert.equal(authority.selectActors([remote.actor])[0].binding,owner.binding);assert.equal(owner.combat.scene.player,hero);assert.equal(hero.dead,false);assert.equal(remote.actor.dead,false);assert(hero.life>0&&remote.actor.life>0);
 }else assert.equal(writer.gameOver,true);
 assert.deepEqual(calls,[]);return {mode,stage,native,intermediate,localZone:authority.selectActors([hero])[0].binding.scene.zone.id,remoteZone:authority.selectActors([remote.actor])[0].binding.scene.zone.id,worldDrivers:calls};
 });});}
const results=[];for(const [mode,stage]of [['mortal',0],['immortal',0],['immortal',1]] as const)if(!process.env.PARTY_MODE||process.env.PARTY_MODE===mode+stage)results.push(course(mode,stage));const report={courses:results.length,results,receipt:combatHash(JSON.stringify(results))};writeCombatProof('native-party-death.json',report);console.log(JSON.stringify(report));
