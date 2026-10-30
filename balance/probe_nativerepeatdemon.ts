import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat} from './probe_nativecombatcycle';
function course(retained:boolean){return withSeededRandom(991,()=>{
 const setup=nativeCampaignFixture(991),w=setup.writer,other=mintAdditionalNativeArea(setup);w.loadZone(setup.definition.id);
 const run=(drivers:string[])=>{
  const n=retained?birthActualNativeArea(setup):null,source=n?.ongoing;
  const travel=(id:string)=>n?n.coordinator.runFrom(n.coordinator.published,()=>n.coordinator.loadZone(id,w.zone.id)):w.loadZone(id,w.zone.id);
  const tick=()=>n?n.coordinator.published.combat.campaignFrame.tick(1/60):w.update(1/60);
  const rows=()=>source?source.assembly.input.geometry.demonPortals:w['demonPortals'];
  const cf=w.sim.demonFieldFor(setup.definition.dimension)!;assert(cf);
  const ignite=()=>{const view=w.devOverlayView();assert(cf.devIgnite(view,setup.definition.id));cf.update(0,view);const info=cf.invasionOn(setup.definition.id);assert(info?.isEpicenter);assert(info.portalReady||cf.surge().portal.openAt==='epicenter');return info;};
  const first=ignite();tick();assert(rows().some(p=>p.invId===first.id),'first actual gate materializes');
  const firstRows=rows().map(p=>({...p,pos:{...p.pos}}));
  if(n)n.coordinator.runFrom(source!,()=>{const gate=source!.combat.campaignFrame.realmGates().find(g=>g.key==='demon:'+first.id);assert(gate);gate.enter();});else{const gate=w['realmGates']().find(g=>g.key==='demon:'+first.id);assert(gate);gate.enter();}
  const realm=n?.coordinator.published,realmId=w.zone.id,context=realm?.combat.campaignOwner.state??w;assert.notEqual(realmId,setup.definition.id);
  let ward=realm?.combat.runtimeState.frame.arenaWard??w['arenaWard'],wardTicks=0;while(ward&&wardTicks++<250){w.player.pos={...ward.seals[0].pos};w.player.push=null;if(realm)realm.combat.campaignFrame.tick(.1);else w.update(.1);ward=realm?realm.combat.runtimeState.frame.arenaWard:w['arenaWard'];}assert(!ward);
  const boss=w.actors.find(a=>a.tag==='balor_realm');assert(boss);const xpBefore=w.localSeat.meta.xp,dropsBefore=w.drops.length;withSeededRandom(99881,()=>{if(realm)realm.combat.kill(boss,false,w.player);else w.kill(boss,false,w.player);});
  const rewardMultiplier={realmId,boss:boss.defId,wardTicks,xpBefore,xpAfter:w.localSeat.meta.xp,dropDelta:w.drops.length-dropsBefore,contextConsumed:Reflect.get(context,'realmContext')===null};assert(rewardMultiplier.contextConsumed);assert.equal(cf.peek().find(x=>x.id===first.id),undefined);
  for(const a of [...w.actors])if(a.team==='enemy'&&!a.dead){if(realm)realm.combat.kill(a,true);else w.kill(a,true);}if(realm)realm.combat.updateObjective(1/60);else w['updateObjective'](1/60);
  const exit=w.exits.find(e=>e.to===setup.definition.id);assert(exit);if(realm)realm.combat.campaignFrame.travelThrough(exit);else w['travelThrough'](exit);assert.equal(w.zone.id,setup.definition.id);
  travel(other.id);const second=ignite();assert.notEqual(first.id,second.id);
  travel(setup.definition.id);tick();
  const finalRows=rows().map(p=>({...p,pos:{...p.pos}}));
  const gates=n?n.coordinator.runFrom(source!,()=>source!.combat.campaignFrame.realmGates().filter(g=>g.kind==='demon').map(g=>g.key)):w['realmGates']().filter(g=>g.kind==='demon').map(g=>g.key);
  const plan=n?n.coordinator.runFrom(source!,()=>source!.combat.campaignFrame.realmGates().find(g=>g.key===`demon:${second.id}`)):w['demonRealmPlan'](second.id,w.player.pos);
  assert(plan,'successor gate or original plan is available');
  if(n)n.coordinator.runFrom(source!,()=>{const next=source!.combat.campaignFrame.realmGates().find(g=>g.key==='demon:'+second.id);assert(next);next.enter();});else{const next=w['realmGates']().find(g=>g.key==='demon:'+second.id);assert(next);next.enter();}
  const successor=n?.coordinator.published,successorId=w.zone.id;assert.notEqual(successorId,realmId);const nextBoss=w.actors.find(a=>a.tag==='balor_realm');assert(nextBoss);const nextBefore=w.drops.length;
  withSeededRandom(88119,()=>{if(successor)successor.combat.kill(nextBoss,false,w.player);else w.kill(nextBoss,false,w.player);});
  const successorReward={realmId:successorId,boss:nextBoss.defId,dropDelta:w.drops.length-nextBefore,contextConsumed:Reflect.get(successor?.combat.campaignOwner.state??w,'realmContext')===null};assert(successorReward.contextConsumed);assert(successorReward.dropDelta>0);const paidDrops=w.drops.length,paidXp=w.localSeat.meta.xp;
  if(successor)successor.combat.kill(nextBoss,false,w.player);else w.kill(nextBoss,false,w.player);assert.equal(w.drops.length,paidDrops);assert.equal(w.localSeat.meta.xp,paidXp);
  for(const a of [...w.actors])if(a.team==='enemy'&&!a.dead){if(successor)successor.combat.kill(a,true);else w.kill(a,true);}if(successor)successor.combat.updateObjective(1/60);else w['updateObjective'](1/60);const back=w.exits.find(e=>e.to===setup.definition.id);assert(back);if(successor)successor.combat.campaignFrame.travelThrough(back);else w['travelThrough'](back);assert.equal(w.zone.id,setup.definition.id);
  return{successorReward,retained,zone:setup.definition.id,first,second,firstRows,finalRows,gates,rewardMultiplier,secondReachable:!!plan,sourceIdentityRetained:source?n.coordinator.published===source:null,worldDrivers:drivers};
 };return retained?refuseWorldCombat([w],run):run([]);
});}
const report={scope:'Actual generated areas, real first gate, actual realm gate entry, natural ward dwell, real boss kill/reward/context consumption, objective completion and return, genuine departure and return, fresh distinct Demon invasion through supported dev staging, actual full frame and realm gate publication. Original lane uses current original World driver, retained lane refuses all World combat drivers. Seed fixes random setup; no portal injection, array filtering or forged bodies.',original:course(false),retained:course(true)};
console.log(JSON.stringify(report));
assert(report.original.secondReachable);assert(report.retained.secondReachable);assert(report.retained.finalRows.every(p=>p.invId===report.retained.second.id));assert.deepEqual(report.retained.worldDrivers,[]);
