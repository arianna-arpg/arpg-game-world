/** Successor-only visit assertions: historical difference diagnostic is immutable.
 * Authentic natural field update uses an explicitly isolated clock. The decisive
 * live pass is actual World.update / NativeClientRuntime.dispatch. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {bootSimEngine} from '../src/sim/arena';
import {World} from '../src/engine/world';
import {makeAccount} from '../src/meta/account';
import {buildManifest} from '../src/packages/manifest';
import {CLASSES} from '../src/data/classes';
import {START_ZONE} from '../src/data/zones';
import {placeZoneAt} from '../src/engine/worldgen';
import {NativeClientStart} from '../src/worldmass/nativeClientStart';
import {withSeededRandom} from '../src/core/rng';
import {refuseWorldStartup} from './nativeClientStartFixture';

const output=process.argv[2]??path.join(fs.mkdtempSync(path.join(tmpdir(),'hollow-wake-verminfall-visits-')),'result.json');
assert(output&&path.isAbsolute(output),'Runner must provide an absent absolute result file in its fresh owned run directory');
const fd=fs.openSync(output,'wx'); // Preserve every earlier receipt.
console.log(JSON.stringify({receiptPath:output}));
const report:any={kind:'VERMINFALL-VISIT-SUCCESSOR',sourceParent:'172be2a0cb819f5ee8ca0c4b119f92e00a5fc188',seed:1211,globalSeed:55501,
 limits:{firstIgnitionSteps:2000,successorIgnitionSteps:2000,isolatedFieldDt:0.5,decisiveFrameDt:1/60,decisiveWallSeconds:1/60},
 shortcuts:['skipped prologue','level 5 and invulnerability staged','bounded actual farmland mint','direct native travel and actual native kill entry','isolated authentic overlay clock for natural ignition'],
 claim:'Paired consumed-visit stay, empty retained frame, synchronous genuine return and same-event warm preservation. Isolated field ignition remains disclosed; not hosted/browser/performance or stale-body-policy acceptance',cleanupErrors:[]};
type EventRow={id:string;zoneId:string;nestsTotal:number;nestsBroken:number;age:number;seen:boolean;dead:boolean};
function course(retained:boolean){return withSeededRandom(55501,()=>{
 const run=(worldDrivers:string[])=>{
  localStorage.clear();const account=makeAccount(),manifest=buildManifest(account,1211),cls=CLASSES.find(c=>c.id==='warrior')!;
  const start=retained?new NativeClientStart(account):undefined;
  let failed=false;
  try{
   const made=start?.begin({kind:'run',classDef:cls,manifest,prologue:'skip'});
   if(retained)assert(made,'Actual retained startup must succeed');
   const w=made?.writer??new World(account,Object.freeze(manifest));
   if(!made){w.createPlayer(cls);w.loadZone(START_ZONE);}
   const runtime=made?.runtime;w.player.level=5;w.player.invulnerable=true;
   const vf=w.sim.verminfallField;assert(vf);
   let target:{x:number;y:number}|undefined;
   for(let radius=180;radius<=540&&!target;radius+=30)for(let step=0;step<24;step++){
    const at={x:Math.round(Math.cos(step*Math.PI/12)*radius),y:Math.round(Math.sin(step*Math.PI/12)*radius)};
    if(w['biomeFor'](at)==='farmland'&&w['continentFor'](at).kind!=='ocean'&&w['levelFor'](at)<=vf.surge().levelMax){target=at;break;}
   }
   assert(target,'Bounded installed geography provides eligible farmland');
   const minted=placeZoneAt(target,null,w.zoneMap,w['nextGenId']++,{seed:1211^0x9da0,fieldBiome:true,biomeFor:w['biomeFor'],biomeDepthFor:w['biomeDepthFor'],climateFor:w['climateFor'],levelFor:w['levelFor'],courseFor:w['courseMintFor']('surface')});
   assert.equal(minted.biome,'farmland');assert(minted.level<=vf.surge().levelMax);
   w.zoneMap[minted.id]=minted;w.sim.onNodeCharted(minted,w.devOverlayView());w.sim.update(0,w.devOverlayView());
   const active=()=>((vf.snapshot() as {infestations:EventRow[]}).infestations).find(row=>!row.dead);
   let firstSteps=0;while(!active()&&firstSteps<2000){vf.update(.5,w.devOverlayView());firstSteps++;}
   const first={...active()!};assert(first.id,'Bounded natural first ignition');assert.equal(first.zoneId,minted.id);
   if(runtime){const from=runtime.current,c=from.combat.input.coordinator;c.runFrom(from,()=>c.loadZone(first.zoneId,w.zone.id));}else w.loadZone(first.zoneId,w.zone.id);
   const area=runtime?.current,zone=w.zone,player=w.player;
   // Native late retirement may replace its actor array during a genuine frame.
   const actors=()=>w.actors;
   const actorFacts=()=>actors().map(body=>({id:body.id,defId:body.defId,tag:body.tag,dead:body.dead,life:body.life,pos:{x:body.pos.x,y:body.pos.y}}));
   const current=()=>{assert.equal(w.zone,zone,'No visit transition');assert.equal(w.player,player);if(runtime)assert.equal(runtime.current,area);};
   const nests=()=>actors().filter(body=>!body.dead&&body.tag==='warren_nest');
   const kings=()=>actors().filter(body=>!body.dead&&body.tag==='rat_king_manifest');
   const marker=runtime?area!.assembly.input.registry.input.birth.input.state.materializedInfestation:w['materializedInfestation'];
   const tick=()=>{current();if(runtime){const result=runtime.dispatch({dt:1/60,wallSeconds:1/60,inputs:new Map()});assert(result.ready);assert(result.aiAreas.includes(zone.id));}else w.update(1/60);current();};
   tick();const firstNests=nests();assert.equal(firstNests.length,first.nestsTotal);assert(marker.has(zone.id));
   const kill=(body:typeof player)=>runtime?area!.combat.kill(body,false,player):w.kill(body,false,player);
   const cleared=w.ledger.infestations_cleared??0;
   for(const body of firstNests){kill(body);assert(body.dead);}
   assert.equal(kings().length,1);const firstKing=kings()[0];kill(firstKing);assert(firstKing.dead);
   current();assert.equal(w.ledger.infestations_cleared,cleared+1);assert.equal(vf.infestOn(zone.id),null);assert.equal(nests().length,0);assert.equal(kings().length,0);
   const afterClear={actors:actorFacts(),firstNestIds:firstNests.map(body=>body.id),firstKingId:firstKing.id,markerValues:[...marker],marker:marker.has(zone.id),seen:w.ledger.infestation_seen??0,cleared:w.ledger.infestations_cleared??0,liveVermin:actors().filter(body=>!body.dead&&body.tag==='vermin').length};
   assert(afterClear.marker,'The ordinary once-per-visit marker has not been reset');
   let successorSteps=0;while(!active()&&successorSteps<2000){vf.update(.5,w.devOverlayView());successorSteps++;current();}
   const second={...active()!};assert(second.id,'Bounded natural successor ignition');assert.notEqual(second.id,first.id);assert.equal(second.zoneId,zone.id,'Natural successor must select the standing zone');
   assert.equal(second.nestsBroken,0);assert.equal(second.seen,false);assert.equal(nests().length,0);assert(marker.has(zone.id));
   const beforeFrame={actors:actorFacts(),markerValues:[...marker],event:second,nests:nests().length,seen:w.ledger.infestation_seen??0,marker:marker.has(zone.id),actorCount:actors().length};
   const priorBodies=new Set(actors());tick();
   const born=nests();const afterFrame={actors:actorFacts(),markerValues:[...marker],event:{...active()!},nests:born.length,seen:w.ledger.infestation_seen??0,marker:marker.has(zone.id),actorCount:actors().length,allNestsFresh:born.every(body=>!priorBodies.has(body)),newNests:born.map(body=>({defId:body.defId,life:body.life})),kingCount:kings().length};
   assert.equal(afterFrame.event.id,second.id);assert.equal(afterFrame.event.nestsTotal,second.nestsTotal);assert.equal(afterFrame.kingCount,0);
   assert.equal(afterFrame.nests,0,'Both lanes keep the consumed visit after natural replacement');
   assert.equal(afterFrame.seen-beforeFrame.seen,0,'No repeated placement or discovery during the visit');
   assert.equal(afterFrame.event.seen,false);assert(afterFrame.allNestsFresh);
   for(let i=0;i<3;i++){tick();assert.equal(nests().length,0);assert.equal(w.ledger.infestation_seen??0,beforeFrame.seen);}
   const travel=(id:string)=>{if(runtime){const from=runtime.current,c=from.combat.input.coordinator;c.runFrom(from,()=>c.loadZone(id,w.zone.id));}else w.loadZone(id,w.zone.id);};
   travel(START_ZONE);
   if(runtime){const frame=runtime.dispatch({dt:1/60,wallSeconds:1/60,inputs:new Map()});assert(frame.ready);assert(frame.aiAreas.includes(zone.id));}
   else w.update(1/60);
   const emptyNests=area?.assembly.input.scene.actors.filter(body=>!body.dead&&body.tag==='warren_nest').length??0;
   assert.equal(emptyNests,0,'Consumed empty resident cannot materialize its successor');assert.equal(w.ledger.infestation_seen??0,beforeFrame.seen);
   travel(zone.id);
   const synchronous=nests();assert.equal(synchronous.length,second.nestsTotal,'Genuine return births synchronously before a new frame');
   if(runtime)assert.equal(runtime.current,area);
   assert.equal(w.ledger.infestation_seen??0,beforeFrame.seen+1);assert.equal(active()?.id,second.id);
   const afterReturn={nests:synchronous.length,seen:w.ledger.infestation_seen??0,event:{...active()!},bodyIds:synchronous.map(body=>body.id),sameRetainedArea:runtime?runtime.current===area:null,synchronous:true};
   const wound=synchronous[0].life=Math.max(1,synchronous[0].life*.37);
   travel(START_ZONE);travel(zone.id);
   if(runtime){assert.deepEqual(nests(),synchronous);assert.equal(synchronous[0].life,wound);}
   const warm={nests:nests().length,seen:w.ledger.infestation_seen??0,sameBodies:runtime?synchronous.every(body=>nests().includes(body)):null,wound:runtime?synchronous[0].life:null};
   assert.equal(warm.nests,second.nestsTotal);assert.equal(warm.seen,afterReturn.seen);
   for(let i=0;i<3;i++){tick();assert.equal(nests().length,second.nestsTotal);assert.equal(w.ledger.infestation_seen??0,afterReturn.seen);}

   return{retained,firstSteps,successorSteps,first,second,zone:{id:zone.id,biome:zone.biome,level:zone.level,map:zone.map},afterClear,beforeFrame,afterFrame,emptyNests,afterReturn,warm,worldDrivers};
  }catch(error){failed=true;throw error;}
  finally{try{start?.cancel();}catch(error){report.cleanupErrors.push(String(error));if(!failed)throw error;}}
 };
 return retained?refuseWorldStartup([],run):run([]);
});}
try{
 bootSimEngine();report.ordinary=course(false);report.retained=course(true);
 assert.deepEqual(report.retained.zone,report.ordinary.zone);assert.deepEqual(report.retained.first,report.ordinary.first);
 assert.deepEqual(report.retained.second,report.ordinary.second);assert.equal(report.retained.firstSteps,report.ordinary.firstSteps);
 assert.equal(report.retained.successorSteps,report.ordinary.successorSteps);
 assert.equal(report.ordinary.afterFrame.nests,0);assert.equal(report.retained.afterFrame.nests,0);
 assert.equal(report.retained.afterReturn.nests,report.ordinary.afterReturn.nests);assert.equal(report.retained.afterReturn.seen,report.ordinary.afterReturn.seen);
 report.visitParity=true;report.status='PASS';report.verdict='Consumed visit remains closed; genuine unoccupied return renews synchronously';
}catch(error){report.error=String(error);report.stack=error instanceof Error?error.stack:undefined;process.exitCode=1;}
finally{try{fs.writeFileSync(fd,JSON.stringify(report,null,2));}finally{fs.closeSync(fd);}console.log(JSON.stringify(report));}