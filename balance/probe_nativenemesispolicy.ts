import '../src/engine/world';
import assert from 'node:assert/strict';
import {clientSetup} from './nativeClientRuntimeFixture';
import {NativeClientRuntime} from '../src/worldmass/nativeClientRuntime';
import {withSeededRandom} from '../src/core/rng';
import {formNemesis,touchSaga,sagaKey,NEMESIS_CFG} from '../src/meta/nemesis';
import {MONSTERS} from '../src/data/monsters';
import {refuseWorldCombat,combatHash,writeCombatProof} from './probe_nativecombatcycle';
const results:Record<string,unknown>[]=[];
for(const kind of ['ordinary','game-over','inactive-policy','dead','event-failure'] as const)for(const lane of ['native','retained'] as const)results.push(withSeededRandom(585911,()=>{
 const {writer:w,definition,destination,geography}=clientSetup(45927);let runtime:NativeClientRuntime|undefined;
 const execute=(calls:string[])=>{if(lane==='native')w.loadZone(definition.id);else{runtime=new NativeClientRuntime({writer:w,definition,geography:geography.spec});runtime.install();}
  const eligible=w.actors.filter(a=>!a.dead&&a.team==='enemy'&&!a.passive&&!a.untargetable&&!a.owner&&!a.doorId&&a.defId&&!MONSTERS[a.defId].noNemesis);assert(eligible.length>=2);const body=eligible[0],saga=touchSaga(w.account,w.meta.name);let rec:ReturnType<typeof formNemesis>|undefined;
  if(kind==='ordinary'){for(const a of eligible)a.grudgeMark=true;}else{rec=formNemesis(saga,body.defId!,body.faction??'','escaped',Math.random);body.nemesis={sagaKey:sagaKey(w.meta.name),id:rec.id,tint:'#ffffff'};w['manifestedThisRun'].add(rec.id);}
  const before=rec?.encounters??0,nemesesBefore=saga.nemeses.length,source=runtime?.current,coordinator=source?.combat.input.coordinator,memoryOwner=source?coordinator!.departureFor(source.combat):undefined;const originalCapture=memoryOwner?.captureConclaveDeparture??w['captureZoneMemory'];let memories=0;const capture=()=>{memories++;if(rec&&kind==='event-failure')assert(rec.encounters>before,'native survivor mutation precedes memory');return Reflect.apply(originalCapture,memoryOwner??w,[]);};if(memoryOwner)memoryOwner.captureConclaveDeparture=capture;else w['captureZoneMemory']=capture;
  const originalEmit=w.events.emit,sentinel=Error('selected native Nemesis promotion event failure');let promoted=0;
  w.events.emit=((type:unknown,payload:unknown)=>{if(type==='nemesis/promoted'){promoted++;if(kind==='event-failure')throw sentinel;}return Reflect.apply(originalEmit,w.events,[type,payload]);}) as typeof originalEmit;
  const history=source?.assembly.input.history,active=history?.nemesisActive??w['nemesisActive'];if(kind==='inactive-policy'){if(history)history.nemesisActive=()=>false;else w['nemesisActive']=()=>false;}if(kind==='game-over')w.gameOver=true;if(kind==='dead')body.dead=true;
  const travel=()=>{if(runtime){const from=runtime.current;coordinator!.runFrom(from,()=>coordinator!.loadZone(destination.id));}else w.loadZone(destination.id);};const originalRandom=Math.random;Math.random=()=>0;let error:unknown;try{travel();}catch(e){error=e;}finally{Math.random=originalRandom;w.events.emit=originalEmit;if(history)history.nemesisActive=active;else w['nemesisActive']=active;}
  let facts:object;if(kind==='event-failure'){assert.equal(error,sentinel);assert.equal(memories,0);assert.equal(rec!.encounters,before+1);if(runtime){assert.equal(runtime.current,source);assert.equal(source!.authority.require(body).combat,source!.combat);assert.throws(()=>source!.combat.campaignTransitions.scanNemesisSurvivors(),/selected departure/);}const first=rec!.encounters,random=Math.random;Math.random=()=>.99;try{travel();}finally{Math.random=random;}assert.equal(rec!.encounters,first+1,'retry preserves earlier native encounter and records another escape');assert.equal(memories,1);facts={encounters:rec!.encounters-before,memories,promoted,error:'exact selected event',retry:'native additional escape'};}
  else {if(error)throw error;assert.equal(memories,1);if(kind==='ordinary'){assert.equal(saga.nemeses.length-nemesesBefore,NEMESIS_CFG.survivorPerZone);facts={eligible:eligible.length,formed:saga.nemeses.length-nemesesBefore,memories};}else{assert.equal(rec!.encounters,before);facts={encounters:0,memories,promoted};}}
  return{kind,lane,...facts,worldDrivers:calls};
 };return lane==='native'?execute([]):refuseWorldCombat([w],execute);
}));
for(let i=0;i<results.length;i+=2){const {lane:an,...a}=results[i],{lane:bn,...b}=results[i+1];assert.equal(an,'native');assert.equal(bn,'retained');assert.deepEqual(a,b);}
const report={scope:'Actual generated enemy cohort and native departure with explicit tagged/grudge policy boundary fixtures; ordinary cap, native game-over/dead/inactive gates, exact selected event failure before memory, and nontransactional retry. Math.random is fixed only at the native departure boundary to compare unchanged native rules; not a natural-roll distribution claim.',results,receipt:combatHash(JSON.stringify(results))};writeCombatProof('native-nemesis-policy.json',report);console.log(JSON.stringify(report));
