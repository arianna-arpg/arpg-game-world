import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {nativeCampaignFixture,birthActualNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,combatHash} from './probe_nativecombatcycle';
import {withSeededRandom} from '../src/core/rng';
const seed=Number(process.argv.find(s=>s.startsWith('--seed='))?.split('=')[1]??20731),retained=process.argv.includes('--retained');
assert(retained && [20731,20734].includes(seed),'Only fixed positive and capstone controls');
const lane=retained?'retained':'ordinary',out=path.resolve('../gameplay'),trace:unknown[]=[];fs.mkdirSync(out,{recursive:true});
let result:unknown;
try{result=withSeededRandom(seed,()=>{const setup=nativeCampaignFixture(seed),w=setup.writer;w.player.level=15;const ff=w.sim.fractureField;assert(ff);const execute=(drivers:string[])=>{const n=retained?birthActualNativeArea(setup):null;
 const area=()=>n?.coordinator.published;
 const identities=new WeakMap<object,number>();let nextIdentity=1;const identity=(v:unknown)=>{if((typeof v!=='object'&&typeof v!=='function')||v===null)return null;const obj=v as object;let id=identities.get(obj);if(!id){id=nextIdentity++;identities.set(obj,id);}return id;};
 const observe=(selected:ReturnType<NonNullable<typeof n>['coordinator']['residentAreas']>[number]|undefined)=>{const state=selected?.combat.input.assembly.input.registry.input.birth.input.state,local=state?.fractureRun;return {zone:selected?.combat.scene.zone.id??null,areaIdentity:identity(selected),stateIdentity:identity(state),guardIdentity:identity(state?.materializedFractures),guard:state?[...state.materializedFractures]:null,runIdentity:identity(local),run:local?{id:local.id,phase:local.phase,origin:{...local.origin},head:{...local.head},chasmsTarget:local.chasmsTarget}:null,fieldIdentity:identity(ff),eventIdentity:identity(Reflect.get(ff,'fracture')),field:ff.peek(),eligible:selected?ff.fractureIn(selected.combat.scene.zone.id):null};};
 const handoffs:unknown[]=[];
 const travel=(id:string)=>{if(n){const from=n.coordinator.published,target=n.coordinator.residentAreas().find(row=>row.combat.scene.zone.id===id),before={from:observe(from),target:observe(target)};n.coordinator.runFrom(from,()=>n.coordinator.loadZone(id,w.zone.id));const record={destination:id,before,after:observe(n.coordinator.published)};handoffs.push(record);trace.push({handoff:record});}else w.loadZone(id,w.zone.id);};
 if(!retained)travel(setup.definition.id);
 const birth=()=>area()?.combat.input.assembly.input.registry.input.birth;
 const run=()=>n?birth()!.input.state.fractureRun:w['fractureRun'];
 const materialize=()=>{if(n)n.coordinator.runFrom(area()!,()=>area()!.combat.framePreActors(0));else w['materializeLiveZoneEvents']();};
 const tick=(dt:number)=>{w.time+=dt;ff.update(dt,w.devOverlayView());if(n)n.coordinator.runFrom(area()!,()=>area()!.combat.framePreActors(dt));else{w['materializeLiveZoneEvents']();w['updateFractures'](dt);}};
 const fullTick=()=>{if(n)area()!.combat.campaignFrame.tick(.01);else w.update(.01);};
 const physical=()=>n?area()!.combat.scene.actors:w.actors;
 const drops=()=>n?area()!.assembly.input.physical.input.state.drops:w['drops'];
 const payout=()=>({level:w.player.level,xp:w.localSeat.meta.xp,xpNeeded:w.localSeat.meta.xpNeeded,chasms:w.ledger.fracture_chasms_cleared??0,sealed:w.ledger.fractures_sealed??0,seen:w.ledger.fractures_seen??0,rifts:w.ledger.fracture_rifts_opened??0,drops:drops().length});
 let ignitionSteps=0;while(!ff.peek()&&ignitionSteps++<20000)ff.update(.5,w.devOverlayView());const first=ff.peek();assert(first,'natural ignition');travel(first.zoneId);materialize();assert(run(),'actual initial fracture');const initial={event:first,ignitionSteps,zone:w.zone.id,run:JSON.parse(JSON.stringify(run())),payout:payout()};
 const legs:any[]=[],arrivals:any[]=[],seen=new Set<string>();let repeat=false,blocked=false;
 for(let leg=0;leg<4&&ff.peek();leg++){
  const current:NonNullable<ReturnType<typeof ff.peek>>=ff.peek()!;assert.equal(current.travelPos,null);assert.equal(w.zone.id,current.zoneId);const returned=seen.has(current.zoneId);seen.add(current.zoneId);materialize();let r=run();const atEntry={leg,zone:w.zone.id,returned,field:current,run:r?{id:r.id,phase:r.phase,origin:{...r.origin},head:{...r.head},chasmsTarget:r.chasmsTarget}:null,guard:n?[...birth()!.input.state.materializedFractures]:[...w['materializedFractures']],payout:payout()};arrivals.push(atEntry);trace.push({arrival:atEntry});
  if(returned)repeat=true;
  if(!r){blocked=true;const before={identity:observe(area()),payout:payout()},updates:unknown[]=[];for(let i=0;i<3;i++){tick(.2);materialize();updates.push({identity:observe(area()),payout:payout()});}trace.push({blockedReturn:{before,updates}});assert.equal(run(),null,'actual materialization remains absent after further native updates');break;}
  const start=payout(),id=r.id,zone=w.zone.id,layout={arena:{...w['arena']},exits:w['exits'].map(e=>({to:e.to,pos:{...e.pos},defIndex:e.defIndex}))};
  if(r.phase==='dormant'){w.player.pos={...r.origin};fullTick();assert.equal(run()?.phase,'fissure','actual run-over road tail starts fissure');}
  let steps=0,kills=0;const seals:any[]=[];let beforeChasms=w.ledger.fracture_chasms_cleared??0;
  while(run()&&ff.fractureIn(zone)&&steps++<2600){r=run()!;w.player.pos={...r.head};tick(.2);for(const foe of [...physical()].filter(a=>!a.dead&&a.tag==='fracture_foe')){if(n)area()!.combat.kill(foe,false,w.player);else w.kill(foe,false,w.player);assert(foe.dead);kills++;}const now=w.ledger.fracture_chasms_cleared??0;if(now!==beforeChasms){seals.push({atStep:steps,total:now,payout:payout(),phase:run()?.phase??null});beforeChasms=now;}}
  assert(steps<2600,'finite actual chasm course');const after=ff.peek(),record={leg,zone,id,layout,steps,kills,seals,before:start,after:payout(),field:after,runCleared:run()===null,notices:w['notices'].slice(-6)};legs.push(record);trace.push({leg:record});fs.writeFileSync(path.join(out,`${lane}-${seed}-progress.json`),JSON.stringify({initial,arrivals,legs},null,2));
  assert.equal(run(),null,'actual seal/divert clears local run');assert.equal(seals.length,atEntry.run!.chasmsTarget,'all actual chasms completed');assert(kills>0);
  if(!after)break;
  assert(after.travelPos,'actual native completion starts transit');let transit=0;while(ff.peek()?.travelPos&&transit++<30)ff.update(.2,w.devOverlayView());assert(!ff.peek()?.travelPos,'native visual transit completes');travel(ff.peek()!.zoneId);materialize();
 }
 const final={lane,seed,scope:'Natural field ignition and actual native Fracture trigger/chase/spawn/kill/seal/divert. Player fixture follows live head each0.2s; clock and actual field advanced explicitly. Retained uses actual combat.framePreActors under coordinator; ordinary uses real World updateFractures. Genuine road-tail trigger/full frame at first activation. No fake host, field restore, guard edit, run-state completion edit, destination override, loot/XP substitute or forced child exit. Not a TCP or full-AI playthrough.',initial,arrivals,legs,handoffs,trace,repeatedZone:repeat,blocked,finalField:ff.peek(),finalPayout:payout(),finalRun:run()?{id:run()!.id,phase:run()!.phase}:null,worldDrivers:drivers};assert(!blocked&&final.finalPayout.sealed===1&&final.finalField===null,'complete actual final seal once');if(seed===20731)assert(repeat,'original natural repeated route');if(seed===20734)assert.equal(final.finalPayout.rifts,1,'original actual capstone draw');const completed=JSON.stringify(payout());for(let i=0;i<3;i++)materialize();assert.equal(JSON.stringify(payout()),completed,'completed run does not pay again');if(n)n.coordinator.retire();return final;};return retained?refuseWorldCombat([w],execute):execute([]);});fs.writeFileSync(path.join(out,`${lane}-${seed}.json`),JSON.stringify({result,receipt:combatHash(JSON.stringify(result))},null,2));console.log(JSON.stringify(result));}
catch(error){fs.writeFileSync(path.join(out,`${lane}-${seed}-failure.json`),JSON.stringify({error:String(error),stack:error instanceof Error?error.stack:null,trace},null,2));throw error;}
