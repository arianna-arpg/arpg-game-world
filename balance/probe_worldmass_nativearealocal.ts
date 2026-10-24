import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { makeSimWorld } from '../src/sim/arena';
import { mulberry32 } from '../src/sim/rng';
import { Rng, withSeededRandom } from '../src/core/rng';
import { resetActorIdCounter, type Actor } from '../src/engine/actor';
import { NAV_CFG } from '../src/engine/world';
import { WALK_CFG, GridWalkField } from '../src/world/gridWalk';
import { PIT_CFG } from '../src/engine/pitfall';
import { RARITY_DEFS } from '../src/engine/rarity';
import { isDoodadGround } from '../src/world/regions';
import { hullOf, type Bounds } from '../src/world/shape';
import type { ZoneDef } from '../src/data/zones';
import { generateLayout,doodadRuleOf } from '../src/engine/levelgen';
import { captureNativeGeneration } from '../src/worldmass/nativeGeneration';
import { captureNativeAreaGeometry } from '../src/worldmass/nativeAreaGeometryCapture';
import { serializeNativeAreaData } from '../src/worldmass/nativeAreaGeometry';
import { NativeAreaLocal, type NativeAreaAmbientServices } from '../src/worldmass/nativeAreaLocal';
import { nativePlacementClamp,nativeFindFreeSpot,nativeFarPoint } from '../src/engine/nativePlacement';
import { spawnNativePacks,spawnNativeWildlife } from '../src/engine/nativeAmbient';
import { captureNativeActorState } from '../src/worldmass/dormancy';
// Same pre-extraction full-load input archive used by nativeareacompiler. These
// comparisons start at explicit placement/ambient stage boundaries; they do not
// claim the intervening objective/controllers or full-load RNG continuation.
const fixtures=JSON.parse(gunzipSync(Buffer.from('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','base64')).toString('utf8')) as {seed:number;zone:ZoneDef;arena:Bounds;entry:{x:number;y:number};exits:{x:number;y:number}[];doodads:number}[];
let queries=0,bodies=0,attempts=0,drawCount=0;
const weights=Object.entries(RARITY_DEFS).map(([key,row])=>[key,row.weight] as const);
// A normal-rarity branch control avoids claiming detached magic refresh. The
// complete rarity methods themselves remain covered by nativeambient's oracle.
for(const [key,row]of Object.entries(RARITY_DEFS))row.weight=key==='normal'?1:0;
try { for(const f of fixtures) {
 const world=withSeededRandom(f.seed,()=>makeSimWorld('warrior',f.seed)) as any;
 const foreign=withSeededRandom(37,()=>makeSimWorld('warrior',37)) as any;
 const zone=structuredClone(f.zone);zone.exitBoundaries=zone.exitBoundaries?.map(v=>v??undefined);zone.exitRoads=zone.exitRoads?.map(v=>v??undefined);zone.exitMelds=zone.exitMelds?.map(v=>v??undefined);
 const layout=withSeededRandom(zone.seed!,()=>captureNativeGeneration(zone,()=>generateLayout(zone,structuredClone(f.arena),new Rng(zone.seed!),structuredClone(f.entry),structuredClone(f.exits),[]))).value;
 assert.equal(layout.doodads.length,f.doodads);
 const geometry=captureNativeAreaGeometry({sourceIdentity:'archived-full-native-area/'+zone.id,bounds:f.arena,layout});
 const input={zone,geometry,entry:f.entry,playerPosition:f.entry,config:{navigationPad:NAV_CFG.pad,eventSpacing:240,ledgeGrasp:WALK_CFG.ledgeGrasp,pitSweepGran:PIT_CFG.sweepGran}};
 const saved=serializeNativeAreaData(input),local=new NativeAreaLocal(input),cold=new NativeAreaLocal(structuredClone(input));
 if(f===fixtures[0]) {
  let refusals=0;
  const reject=(change:(v:any)=>void)=>{const bad=structuredClone(input);change(bad);assert.throws(()=>new NativeAreaLocal(bad));refusals++;};
  for(const key of ['zone','geometry','entry','playerPosition','config'])reject(v=>delete v[key]);
  for(const key of ['navigationPad','eventSpacing','ledgeGrasp','pitSweepGran'])reject(v=>delete v.config[key]);
  for(const key of ['x','y']){reject(v=>delete v.entry[key]);reject(v=>delete v.playerPosition[key]);}
  for(const levels of [0,-1,1.5,7,Number.MAX_SAFE_INTEGER])reject(v=>v.zone.tiers={levels});
  reject(v=>v.config.pitSweepGran=0);reject(v=>v.config.navigationPad=-1);
  let getterReads=0;reject(v=>Object.defineProperty(v.config,'navigationPad',{enumerable:true,get(){getterReads++;return 0;}}));assert.equal(getterReads,0);
  const before=(local.pathField() as any)?.pack?.();
  const tierDescriptor=Object.getOwnPropertyDescriptor(Object.prototype,'tiers');
  try {
   Object.defineProperty(Object.prototype,'tiers',{value:{levels:6},configurable:true});
   const fresh=new NativeAreaLocal(input);
   assert.deepEqual((fresh.pathField() as any)?.pack?.(),before,'inherited optional tiers cannot alter local navigation');
   const bad=structuredClone(input);delete (bad.config as any).navigationPad;
   const padDescriptor=Object.getOwnPropertyDescriptor(Object.prototype,'navigationPad');
   try{Object.defineProperty(Object.prototype,'navigationPad',{value:0,configurable:true});assert.throws(()=>new NativeAreaLocal(bad));refusals++;}
   finally{if(padDescriptor)Object.defineProperty(Object.prototype,'navigationPad',padDescriptor);else delete (Object.prototype as any).navigationPad;}
  } finally {if(tierDescriptor)Object.defineProperty(Object.prototype,'tiers',tierDescriptor);else delete (Object.prototype as any).tiers;}
  console.log('PASS local context own-data, tier budget and accessor refusals',refusals);
 }

 world.zone=zone;world.arena=structuredClone(f.arena);world.arenaHull=hullOf(f.arena);world.zoneEntry={...f.entry};world.player.pos={...f.entry};world.player.level=zone.level;
 world.walk=layout.walk??null;world.tierViews=local.tierViews;world.doodads=structuredClone(layout.doodads);world.grounds=world.doodads.filter((d:any)=>isDoodadGround(d.kind));world.bridges=world.doodads.filter((d:any)=>doodadRuleOf(d.kind).spans);world.structures=structuredClone(layout.structures??[]);world.doodadsRev++;world.convexNav=null;world.tierNavs.clear();
 const nativePlacement=world.nativePlacementHost(),host=local.placement(nativePlacement.rand),coldHost=cold.placement(nativePlacement.rand);
 for(const tier of [0,1,3])for(let y=45;y<f.arena.h;y+=337)for(let x=45;x<f.arena.w;x+=419){
  const p={x,y};assert.deepEqual(nativePlacementClamp(host,p,17,tier),world.clampPos(p,17,undefined,{tier}));
  assert.deepEqual(nativeFindFreeSpot(host,p,17,tier),world.findFreeSpot(p,17,tier));
  assert.deepEqual(nativeFindFreeSpot(coldHost,p,17,tier),nativeFindFreeSpot(host,p,17,tier));queries++;
 }
 for(const seed of [1,713,0xffffffff]) {
  const a=withSeededRandom(seed,()=>world.farPoint(840)),b=withSeededRandom(seed,()=>nativeFarPoint(host,840));assert.deepEqual(b,a);queries++;
 }
 for(const tier of [0,1,3]) { const a=world.pathField(tier),b=local.pathField(tier);assert.deepEqual(a?.pack?.(),(b as any)?.pack?.()); }
 const run=(isolated:boolean,seed:number)=>{
  const draws:number[]=[],rng=mulberry32(seed),old=Math.random;Math.random=()=>{const value=rng();draws.push(value);return value;};resetActorIdCounter(800000);
  const factoryWorld=isolated?foreign:world;factoryWorld.player.level=zone.level;factoryWorld.squadSeq=900;factoryWorld.zoneGenTagging=true;
  const created:Actor[]=[];const originalFactory=factoryWorld.createMonster;
  factoryWorld.createMonster=function(...args:any[]){const a=originalFactory.apply(factoryWorld,args);created.push(a);return a;};
  const actors:Actor[]=[];world.actors=[world.player];
  try {
   if(isolated){
    const base=foreign.nativeAmbientHost(),groups=foreign.nativeEncounterGroupHost();
    const services:NativeAreaAmbientServices={ambient:base,groups,player:world.player,actors};
    const bound=local.ambient(services);spawnNativePacks(bound,zone);const afterPacks=actors.length;spawnNativeWildlife(bound,zone);
    return {states:actors.map(a=>captureNativeActorState(a)),attempts:created.map(a=>captureNativeActorState(a)),draws,next:Math.random(),afterPacks};
   }
   world.spawnPacks(zone);const afterPacks=world.actors.length-1;world.spawnWildlife(zone);const resident=world.actors.filter((a:Actor)=>a!==world.player);
   return {states:resident.map((a:Actor)=>captureNativeActorState(a)),attempts:created.map(a=>captureNativeActorState(a)),draws,next:Math.random(),afterPacks};
  } finally {factoryWorld.createMonster=originalFactory;Math.random=old;}
 };
 // Prohibit every foreign placement path. Only the explicit factory/resolution
 // services may touch that unrelated World; its living actor list is unchanged.
 const foreignActors=foreign.actors.slice();for(const key of ['farPoint','findFreeSpot','pointInSolid','placeInHabitat','spawnEncounterGroup','pathField'])foreign[key]=()=>{throw Error('foreign area placement: '+key);};
 for(const seed of [713,991]){const a=run(false,seed),b=run(true,seed),a2=run(true,seed);assert.ok(a.states.every(Boolean)&&a.attempts.every(Boolean));assert.deepEqual(b,a,zone.id+' local native body stage');assert.deepEqual(a2,b,'A/B/A local preparation');bodies+=a.states.length;attempts+=a.attempts.length;drawCount+=a.draws.length;}
 assert.deepEqual(foreign.actors,foreignActors);assert.equal(serializeNativeAreaData(input),saved);console.log('PASS full retained local area placement and normal ambient stage',zone.id,layout.doodads.length);
} } finally {for(const [key,weight]of weights)RARITY_DEFS[key as keyof typeof RARITY_DEFS].weight=weight;}
// Independent review regressions: construction must not normalize against
// inherited hitboxes, accept an impossible grid, or capture a pre-scope RNG.
{
 const bounds={w:1200,h:900,shape:'rect' as const};
 const layout={doodads:[{kind:'hollow_log' as const,pos:{x:600,y:450},radius:300,seed:1,rot:0}],pois:[],camps:[],breakables:[],npcs:[],garrisons:[],caveSeeds:[]};
 const geometry=captureNativeAreaGeometry({sourceIdentity:'local-isolation-regressions',bounds,layout});
 const input={zone:{...structuredClone(fixtures[0].zone),size:{w:1200,h:900},shape:'rect' as const},geometry,entry:{x:120,y:120},playerPosition:{x:120,y:120},config:{navigationPad:10,eventSpacing:240,ledgeGrasp:.4,pitSweepGran:8}};
 const clean=new NativeAreaLocal(input),prior=Object.getOwnPropertyDescriptor(Object.prototype,'hitbox');let polluted:NativeAreaLocal;
 try{Object.defineProperty(Object.prototype,'hitbox',{value:{kind:'circle',r:1},writable:true,configurable:true});polluted=new NativeAreaLocal(input);}
 finally{if(prior)Object.defineProperty(Object.prototype,'hitbox',prior);else delete(Object.prototype as any).hitbox;}
 assert.ok(clean.pointInSolid(1080,450));assert.ok(polluted!.pointInSolid(1080,450));assert.equal(polluted!.doodads[0].boundR,clean.doodads[0].boundR);
 const large=structuredClone(input);large.geometry.bounds.w=large.zone.size.w=1e7;large.geometry.bounds.h=large.zone.size.h=1e7;large.geometry.layout.doodads=[];large.geometry.bodies=[];
 assert.throws(()=>new NativeAreaLocal(large),/navigation exceeds cell budget/);
 const hugeAnnex=structuredClone(input);hugeAnnex.geometry.bounds.pieces=[{id:'huge-annex',x:0,y:0,w:1e7,h:1e7,active:true}];
 assert.throws(()=>new NativeAreaLocal(hugeAnnex),/navigation exceeds cell budget/);
 const thin=structuredClone(input);thin.geometry.bounds.w=thin.zone.size.w=9999990;thin.geometry.bounds.h=thin.zone.size.h=30;
 thin.geometry.layout.doodads=[];thin.geometry.bodies=[];thin.geometry.walk={kind:'grid',packed:new GridWalkField(9999990,30).pack()};
 assert.throws(()=>new NativeAreaLocal(thin),/grid axis budget/);
 const padded=structuredClone(input);padded.config.navigationPad=1e20;assert.throws(()=>new NativeAreaLocal(padded),/stamp work budget/);
 const world=withSeededRandom(991,()=>makeSimWorld('warrior',991)) as any,base=world.nativeAmbientHost();
 let active=()=>.125,randomReads=0;Object.defineProperty(base,'random',{enumerable:true,get(){randomReads++;return active;}});
 const bound=clean.ambient({ambient:base,groups:world.nativeEncounterGroupHost(),player:world.player,actors:[]});
 assert.equal(randomReads,0,'binding must not read native random provider');active=()=>.875;
 assert.equal(bound.random(),.875);assert.equal(randomReads,1);active=()=>.25;assert.equal(bound.random(),.25);
 console.log('PASS local normalization, analytic work envelope and lazy random provider regressions');
}
console.log('PASS local native area preparation',JSON.stringify({areas:fixtures.length,queries,bodies,attempts,draws:drawCount}));
