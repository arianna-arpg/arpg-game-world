/** Natural ordinary/retained successor differential. The original negative reproduction and receipts remain unchanged. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {observeVerminfallKingReward,verminfallOutputPath} from './nativeVerminfallFixture';
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
bootSimEngine();
const seed=1211;
function course(retained:boolean){return withSeededRandom(55501,()=>{
 const lane=(worldDrivers:string[])=>{
 localStorage.clear();const account=makeAccount(),manifest=buildManifest(account,seed),cls=CLASSES.find(c=>c.id==='warrior')!;
 const start=retained?new NativeClientStart(account):null;
 const made=start?.begin({kind:'run',classDef:cls,manifest,prologue:'skip'});
 const w=made?.writer??new World(account,Object.freeze(manifest));
 if(!made){w.createPlayer(cls);w.loadZone(START_ZONE);}
 const runtime=made?.runtime;
 w.player.level=5;w.player.invulnerable=true;
 const vf=w.sim.verminfallField;assert(vf);
 let target:{x:number;y:number}|undefined;
 for(let radius=180;radius<=540&&!target;radius+=30)for(let step=0;step<24;step++){
  const at={x:Math.round(Math.cos(step*Math.PI/12)*radius),y:Math.round(Math.sin(step*Math.PI/12)*radius)};
  if(w['biomeFor'](at)==='farmland'&&w['continentFor'](at).kind!=='ocean'&&w['levelFor'](at)<=vf.surge().levelMax){target=at;break;}
 }
 assert(target,'bounded installed geography search found real eligible farmland');
 const minted=placeZoneAt(target,null,w.zoneMap,w['nextGenId']++,{seed:seed^0x9da0,fieldBiome:true,biomeFor:w['biomeFor'],biomeDepthFor:w['biomeDepthFor'],climateFor:w['climateFor'],levelFor:w['levelFor'],courseFor:w['courseMintFor']('surface')});
 w.zoneMap[minted.id]=minted;w.sim.onNodeCharted(minted,w.devOverlayView());
 assert.equal(minted.biome,'farmland','actual native mint retains farmland');assert(minted.level<=vf.surge().levelMax);
 const view=w.devOverlayView();w.sim.update(0,view);
 const eligible=Object.values(w.zoneMap).filter(z=>z.biome==='farmland'&&z.level<=vf.surge().levelMax&&!z.special);
 const event=()=>((vf.snapshot() as any).infestations as any[]).find(i=>!i.dead);
 let steps=0;while(!event()&&steps<2000){vf.update(.5,w.devOverlayView());steps++;}
 assert(event(),JSON.stringify({message:'No bounded natural ignition',retained,eligible:eligible.map(z=>({id:z.id,level:z.level,map:z.map})),steps,gate:w.sim.gatesFor(w.player.level).get('verminfall')}));
 const first={...event()},a=first.zoneId;
 const run=()=>{
  const travel=(id:string)=>{if(runtime){const area=runtime.current,c=area.combat.input.coordinator;c.runFrom(area,()=>c.loadZone(id,w.zone.id));}else w.loadZone(id,w.zone.id);};
  const area=()=>runtime?.current;
  const kill=(body:typeof w.player)=>runtime?runtime.current.combat.kill(body,false,w.player):w.kill(body,false,w.player);
  const nests=()=>w.actors.filter(x=>x.tag==='warren_nest'&&!x.dead);
  const tick=()=>runtime?runtime.dispatch({dt:1/60,wallSeconds:1/60,inputs:new Map()}):w.update(1/60);
  travel(a);const originalArea=area();tick();
  const firstNests=nests();assert.equal(firstNests.length,first.nestsTotal,'first native infestation has exactly its nests');
  const wounded=firstNests[0];wounded.life=Math.max(1,wounded.life/2);const wound=wounded.life;
  travel(START_ZONE);travel(a);
  const warm={sameArea:runtime?area()===originalArea:null,sameBodies:firstNests.every(x=>nests().includes(x)),woundedLife:nests().find(x=>x===wounded)?.life??null,expectedWound:wound,nests:nests().length,field:vf.infestOn(a)};
  if(runtime){assert(warm.sameArea&&warm.sameBodies);assert.equal(warm.woundedLife,wound);}
  const clearedBefore=w.ledger.infestations_cleared??0;
  for(const body of nests())kill(body);
  const king=w.actors.find(x=>x.tag==='rat_king_manifest'&&!x.dead);assert(king,'native last-nest kill births king');const firstReward=observeVerminfallKingReward(w,king,kill,retained);
  assert.equal(w.ledger.infestations_cleared,clearedBefore+1,'actual king kill clears first event');assert.equal(vf.infestOn(a),null);
  vf.update(0,w.devOverlayView());travel(START_ZONE);
  let successorSteps=0;while(!event()&&successorSteps<2000){vf.update(.5,w.devOverlayView());successorSteps++;}
  assert(event(), 'bounded natural successor ignition');assert.equal(event().zoneId,a,JSON.stringify({reason:'natural successor selected different ground',firstZone:a,successor:event(),successorSteps}));
  const second={...event()};assert.notEqual(second.id,first.id);vf.update(vf.surge().graceSeconds+1,w.devOverlayView());
  const beforeReturn={event:second,activity:vf.activityAt(a),pressure:vf.townPressure(),info:vf.infestOn(a)};
  travel(a);tick();if(runtime)assert.equal(area(),originalArea,'Natural successor reuses the actual retained area');
  const successorNests=nests();assert.equal(successorNests.length,second.nestsTotal,'successor materializes its native nest count');for(const body of successorNests)kill(body);const successorKing=w.actors.find(x=>x.tag==='rat_king_manifest'&&!x.dead);assert(successorKing);const successorReward=observeVerminfallKingReward(w,successorKing,kill,retained);assert.equal(w.ledger.infestations_cleared,clearedBefore+2);assert.equal(vf.infestOn(a),null);assert.equal(vf.townPressure(),1);const result={retained,seed,firstReward,successorReward,naturalSuccessorIgnitionSteps:successorSteps,minted:{id:minted.id,requested:target,map:minted.map,level:minted.level,biome:minted.biome},initialEligible:eligible.length,naturalFirstIgnitionSteps:steps,first,warm,clearDelta:(w.ledger.infestations_cleared??0)-clearedBefore,beforeReturn,successorNests:successorNests.map(x=>({id:x.id,life:x.life,def:x.defId})),secondStillClaimed:vf.infestOn(a),sameRetainedArea:runtime?area()===originalArea:null,marker:runtime?area()!.assembly.input.registry.input.birth.input.state.materializedInfestation.has(a):w['materializedInfestation'].has(a),worldDrivers};
  start?.cancel();return result;
 };
 return run();
 };
 return retained?refuseWorldStartup([],lane):lane([]);
});}
const report:any={baseline:'e7320eca08ab7bf74219f0cba2ed493e9ab4c8e8',scope:'Actual NativeClientStart, recorded default geography/catalog, installed Verminfall first ignition, genuine A-town-A retained travel, actual native nest and king kill handlers. Fixture shortcuts: one actual farmland definition minted through placeZoneAt after bounded installed-geography sampling (no biome/level override), prologue skipped, hero staged level5/invulnerable, first nest life halved directly to test warm preservation, direct native travel and kill instead of UI/damage, isolated overlay clock advanced, bounded natural field ignition for the same-zone successor (no dev event trigger); no fake events, actor insertion, production changes, or lowered assertions. Headless memory storage only. Reward instrumentation observes the registered original package row with the genuine KillCtx; only the package row RNG is reset to44711 in each lane, and normalized payload excludes item uid and drop placement.'};
try{report.ordinary=course(false);report.retained=course(true);report.successorFixed=report.ordinary.successorNests.length===report.ordinary.beforeReturn.event.nestsTotal&&report.retained.successorNests.length===report.retained.beforeReturn.event.nestsTotal;assert(report.successorFixed,'both lanes must materialize and clear the successor');for(const name of ['firstReward','successorReward']){const {retainedContext:ordinaryContext,...ordinary}=report.ordinary[name],{retainedContext:nativeContext,...native}=report.retained[name];assert.equal(ordinaryContext,false);assert.equal(nativeContext,true);assert.deepEqual(native,ordinary,'Exact package XP and normalized real minted reward payload differential: '+name);}}catch(error){report.error=String(error);report.stack=(error as Error).stack;process.exitCode=1;}finally{fs.writeFileSync(verminfallOutputPath('natural-result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
