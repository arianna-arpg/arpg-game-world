import '../src/engine/world';
import assert from 'node:assert/strict';
import {clientSetup} from './nativeClientRuntimeFixture';
import {NativeClientRuntime} from '../src/worldmass/nativeClientRuntime';
import {NativeAreaSceneWarlordArrival} from '../src/worldmass/nativeAreaSceneWarlordArrival';
import type {Actor} from '../src/engine/actor';
import {withSeededRandom} from '../src/core/rng';
import {CLASSES} from '../src/data/classes';
import {NullInput} from '../src/net/intent';
import {refuseWorldCombat,combatHash,writeCombatProof} from './probe_nativecombatcycle';
import {newOdyssey} from '../src/world/odyssey';
import {odysseyQuestId} from '../src/data/odyssey';
const tracked:{row:{owner:NativeAreaSceneWarlordArrival;body:Actor;crown:object};set?:Set<unknown>;map?:Map<unknown,unknown>}[]=[];
const originalAdd=Set.prototype.add,originalSet=Map.prototype.set;
function observe(value:unknown){if(!value||typeof value!=='object'||!('owner'in value)||!(value.owner instanceof NativeAreaSceneWarlordArrival)||!('body'in value)||!('crown'in value))return;let found=tracked.find(x=>x.row===value);if(!found){found={row:value as typeof tracked[number]['row']};tracked.push(found);}return found;}
Set.prototype.add=function(value){const found=observe(value);if(found)found.set=this;return originalAdd.call(this,value);};
Map.prototype.set=function(key,value){const found=observe(value);if(found)found.map=this;return originalSet.call(this,key,value);};
function released(body:Actor){const found=tracked.find(x=>x.row.body===body);assert(found?.set&&found.map);assert.equal(found.set.has(found.row),false,'active crown Set releases exact completed row');assert.equal(found.map.get(found.row.crown)===found.row,false,'active crown Map releases exact completed row');}
function course(hosted:boolean){return withSeededRandom(66019,()=>{
 const setup=clientSetup(45927),w=setup.writer,A=setup.definition,B=setup.destination;
 return refuseWorldCombat([w],worldDrivers=>{
  const r=new NativeClientRuntime({writer:w,definition:A,geography:setup.geography.spec});r.install();const c=r.current.combat.input.coordinator;
  const travel=(to:string)=>c.runFrom(r.current,()=>c.loadZone(to));travel(B.id);travel(A.id);
  const field=w.sim.warlord,faction=w.sim.faction;
  const fortify=(id:string,power:number)=>{for(const f of Object.keys((faction.snapshot() as {field:Record<string,Record<string,number>>}).field[id]??{}))faction.bleed(id,f,100);faction.reinforce(id,'goblin',power);};
  const crown=(time=w.time)=>field.update(0,{...w.devOverlayView(),time});
  fortify(A.id,100);fortify(B.id,90);crown();const lord=field.lords.get('goblin')!;assert(lord);assert.equal(lord.capitalId,A.id);const epoch=field.crownOf(lord);assert(epoch);
  travel(B.id);travel(A.id);let area=r.current;const boss=()=>w.actors.filter(a=>a.tag==='warlord'&&a.faction==='goblin'&&!a.dead);const first=boss()[0]!;assert(first);assert.equal(boss().length,1);first.life=first.maxLife()*.37;const wound=first.life;
  travel(B.id);travel(A.id);assert.equal(boss()[0],first);assert.equal(first.life,wound);
  const prior=w.ledger.warlords_killed??0;area.combat.kill(first,false,w.player);assert.equal(w.ledger.warlords_killed,prior+1);assert.equal(lord.alive,false);assert.equal(field.crownOf(lord),undefined);released(first);
  travel(B.id);travel(A.id);assert.equal(boss().length,0);fortify(A.id,100);fortify(B.id,90);crown(lord.suppressUntil+.01);assert.equal(field.lords.get('goblin'),lord);assert.notEqual(field.crownOf(lord),epoch);
  travel(B.id);travel(A.id);const second=boss()[0]!;assert(second);assert.notEqual(second,first);second.life=second.maxLife()*.29;let secondWound=second.life;
  let remote:ReturnType<typeof w.addSeat>|undefined;
  if(hosted){remote=w.addSeat('crown-peer',CLASSES.find(x=>x.id==='warrior')!,new NullInput(),{startingCompanions:false,startingFlasks:false});area=r.current;area.combat.campaignFrame.enableHostedRoads();secondWound=second.life;}
  const moveLocal=(to:string)=>{const from=r.current;if(!hosted){travel(to);return;}c.roadsFor(from.combat).shardWorld!.enqueue({seatId:w.localSeat.id,dest:to});const result=from.combat.campaignFrame.drainShardRoads()[0];if(result.outcome==='failed')throw result.error;assert.equal(result.outcome,'moved');};
  fortify(A.id,80);fortify(B.id,100);const secondEpoch=field.crownOf(lord);crown(lord.suppressUntil+.02);assert.equal(field.crownOf(lord),secondEpoch);assert.equal(lord.capitalId,B.id);
  if(remote){remote.actor.downed=true;remote.actor.dead=true;}
  moveLocal(B.id);
  if(remote){assert.equal(boss().length,0,'occupied old capital prevents a second boss for the same reign');assert(area.combat.scene.actors.includes(second));assert.equal(second.life,secondWound);
   // Actual campaign suppression then real elapsed-time re-crowning reuses its row.
   field.onWarlordKilled('goblin',w.time,w.devOverlayView());fortify(A.id,80);fortify(B.id,100);crown(lord.suppressUntil+.01);const successor=field.crownOf(lord);assert(successor);assert.notEqual(successor,secondEpoch);
   travel('lastlight');travel(B.id);const third=boss()[0]!;assert(third);assert.notEqual(third,second);assert(area.combat.scene.actors.includes(second));
   const state=newOdyssey(w.manifest.seed,w.account.ledger);state.roster=['goblin','bandit','undead','gnoll'];w.odyssey.restore(state);const ledger=w.ledger.warlords_killed??0,xp=remote.meta.xp,defeated=[...w.odyssey.snapshot()!.defeated];
   remote.actor.dead=false;remote.actor.downed=false;area.combat.kill(second,false,remote.actor);
   released(second);assert.equal(field.crownOf(lord),successor);assert.equal(lord.alive,true);assert.equal(w.ledger.warlords_killed??0,ledger);assert(remote.meta.xp>xp,'obsolete occupied body still grants ordinary body XP');assert.deepEqual(w.odyssey.snapshot()!.defeated,defeated);assert(!w.odyssey.snapshot()!.defeated.includes('goblin'));assert(!w.completedObjectives.has('quest_'+odysseyQuestId('goblin','leader')));
  }else{assert.equal(boss().length,1);assert.notEqual(boss()[0],second);assert(!area.combat.scene.actors.includes(second));assert.equal(second.dead,false,'relocation retires without a kill');released(second);assert.equal(w.ledger.warlords_killed,prior+1);}
  const result={hosted,actualCrown:true,repeatedWounds:true,actualKillSuppresses:true,sameRowRecrown:true,capitalMove:true,occupiedDownedPreserved:hosted,obsoleteKillDoesNotCompleteCrown:hosted,ordinaryOldBodyXp:hosted,completedRowsReleased:true,worldDrivers};r.retire();return result;
 });
});}
const rows=[course(false),course(true)];Set.prototype.add=originalAdd;Map.prototype.set=originalSet;const report={scope:'Actual retained births/travel/kills and hosted local-seat tickets. Explicit territory reinforcement through native faction APIs and elapsed overlay time drive deterministic crowns; no lord rows, epoch tokens, warlord bodies or campaign-kill receipts injected. Downed peer is an explicit physical attendance fixture. Read-only observation of actual Set.add/Map.set checks completed active-row removal; this is not a heap-size or garbage-collection claim. Native actual kill and stale kill progression are exercised.',rows};writeCombatProof('native-warlord-lifecycle.json',{...report,receipt:combatHash(JSON.stringify(report))});console.log(JSON.stringify(report));
