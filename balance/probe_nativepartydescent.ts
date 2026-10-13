import assert from 'node:assert/strict';
import {Rng} from '../src/core/rng';
import {delverMulAt} from '../src/world/strata';
import {mintCave} from '../src/engine/worldgen';
import {withSplitParty} from './nativePartyDeathFixture';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
const results:unknown[]=[];
for(const order of ['remote-last','local-last','local-away-climb'] as const)results.push(withSplitParty(({writer,a,b,coordinator,authority,remote,calls})=>{
 const hero=writer.localSeat.actor;hero.level=39;writer.sim.gatesFor(39);const parent=mintCave(a.combat.scene.zone,4243,'probe_party_delver','cavern');assert(new Rng(((parent.seed??0)^0xde17e2)>>>0).chance(writer.sim.descentField!.delverChanceNow()*delverMulAt(parent.caveDepth??0)));writer.caveMap[parent.id]=parent;
 coordinator.runFrom(a,()=>coordinator.loadZone(parent.id,a.combat.scene.zone.id));const cave=coordinator.published,site=cave.assembly.input.geometry.descentSite;
 assert.ok(site);assert(cave.combat.scene.actors.some(actor=>actor.id===site.delverId&&actor.tag==='descent_delver'));assert(coordinator.roadsFor(cave.combat).shardWorld);
 hero.pos={...site.platform};cave.combat.campaignFrame.updateDelver(2);
 const run=writer['descentRun'];assert.ok(run);const dive=coordinator.published;assert.equal(dive.combat.scene.zone.id,run.caveId);assert.equal(run.parentCaveId,parent.id);
 const base=run.baseLevel,bLevel=b.combat.scene.zone.level;assert(base>0);dive.combat.scene.zone.level=base+19;run.haul.coarse=7;
 const localWallet=writer.meta.essences.coarse??0,remoteWallet=remote.meta.essences.coarse??0;assert(hero.survival?.has('light'));remote.actor.survival??=new Map();remote.actor.survival.set('light',73);
 if(order==='remote-last'){hero.life=0;dive.combat.kill(hero);assert(hero.downed&&!hero.dead);assert.equal(writer.gameOver,false);remote.actor.life=0;b.combat.kill(remote.actor);}
 else if(order==='local-last'){remote.actor.life=0;b.combat.kill(remote.actor);assert(remote.actor.downed&&!remote.actor.dead);hero.life=0;dive.combat.kill(hero);}
 else{coordinator.runFrom(dive,()=>coordinator.loadZone(a.combat.scene.zone.id,dive.combat.scene.zone.id));assert.equal(authority.selectActors([hero])[0].binding,a.binding);b.combat.campaignTransitions.resurfaceFromDescent('climb');}
 assert.equal(writer['descentRun'],null);assert.equal(writer.gameOver,false);assert.equal(writer.pendingRespawn,null);assert.equal(coordinator.published.combat.scene.zone.id,parent.id);assert.equal(dive.combat.scene.zone.level,base);assert.equal(b.combat.scene.zone.level,bLevel);
 assert.equal(hero.survival?.has('light'),false);assert.equal(remote.actor.survival.get('light'),73);assert(!hero.dead&&!hero.downed&&!remote.actor.dead&&!remote.actor.downed);assert(hero.life>0&&remote.actor.life>0);
 assert.equal(authority.selectActors([hero])[0].binding,cave.binding);assert.equal(authority.selectActors([remote.actor])[0].binding,cave.binding);assert.equal(cave.combat.scene.player,hero);assert.equal(coordinator.roadsFor(cave.combat).caveExitGrace,true);
 const kept=order==='local-away-climb'?7:Math.round(7*writer.sim.descentField!.surge().payoutKeptOnDeath);assert.equal(writer.meta.essences.coarse,localWallet+kept);assert.equal(remote.meta.essences.coarse,remoteWallet+kept);assert.deepEqual(calls,[]);
 return{order,nativeDelver:true,hostedDwellReached:true,selectedCave:run.caveId,parent:parent.id,seed:parent.seed,kept,restoredAbyssLevel:base,foreignLevelUnchanged:true,localLightRemoved:true,peerLightRetained:true,bothAtParent:true,worldDrivers:calls};
}));
const report={scope:'Genuine native cave mint, Delver birth and hosted shaft dwell, then real split party recovery. Native sceneResurfaceFromDescent body is unchanged.',courses:results.length,results,receipt:combatHash(JSON.stringify(results))};writeCombatProof('native-party-descent.json',report);console.log(JSON.stringify(report));
