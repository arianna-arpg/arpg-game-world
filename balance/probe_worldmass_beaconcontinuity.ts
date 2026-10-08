import assert from 'node:assert/strict';
import { massAdventure } from '../src/worldmass/preset';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import type { World } from '../src/engine/world';
import type { HoldFixture } from '../src/engine/holdObjectives';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { address, localOffset, moveAddress } from '../src/worldmass/address';
import { MassHierarchy } from '../src/worldmass/hierarchy';
import { MassObjectives } from '../src/worldmass/objectives';
import type { GeographicPlan } from '../src/worldmass/geographicPlan';
import type { MassObjectiveBodiesSave } from '../src/worldmass/objectiveBodies';
import { canonical } from '../src/worldmass/random';
import { MassNativeResidency } from '../src/worldmass/nativeResidency';
import { compileNativeFeature, resolveNativeFeature } from '../src/worldmass/nativeFeatures';
import { nativeWorldCapabilities } from '../src/worldmass/nativeHost';
const point=(x:number,y:number)=>address('surface','0','0',x*5400+2700,y*5400+2700,960);
function naturalBeacon(w:World,alias='beacon',accept:(p:Readonly<GeographicPlan>)=>boolean=()=>true):Readonly<GeographicPlan>{
 const g=w.massRuntime!.geography!;
 for(let r=0;r<=16;r++)for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){
  if(Math.max(Math.abs(x),Math.abs(y))!==r)continue;
  const p=g.plannedAt(point(x,y));
  if(p?.access&&p.context.zone.objective.kind==='beacon'&&(p.context.recipe?.alias??'beacon')===alias&&accept(p as GeographicPlan)){
   const it=(g as unknown as {checkIntelAccess(p:Readonly<GeographicPlan>,world:World):Generator<void,boolean>}).checkIntelAccess(p as GeographicPlan,w);
   let next=it.next();while(!next.done)next=it.next();if(next.value)return p as GeographicPlan;
  }
 }
 throw Error('No current natural '+alias+' source found');
}
function historicalWorld(){
 // Preserve the pre-patch terrain descriptor for this historical regression.
 // The exact old plan/hash remains the oracle; fresh sources are exercised separately.
 const config=structuredClone(massAdventure());delete config.terrain.patches;delete config.terrain.landforms;delete config.terrain.regionalDiscoveries;config.terrain.version=7;
 config.terrain.surfaces=config.terrain.surfaces.map(s=>s.id==='marsh'?{...s,region:'mud'}:s);
 config.terrain.surfaces=[...config.terrain.surfaces.slice(0,4),{id:'wetland-pools',source:'regions/swamp',priority:25,
  when:[{field:'temperature',min:-.35},{field:'moisture',min:.35},{field:'elevation',max:.22},{field:'rock',max:-.18}],
  region:'swamp',color:'#30483d',biome:'marsh'},...config.terrain.surfaces.slice(4)];

 const w=makeSimWorld('warrior',901743);new WorldMassRuntime(901743,'expedition:901743',config).attach(w);return w;
}
const rows=(w:World,id:string)=>(w as unknown as {spires:HoldFixture[]}).spires.filter(s=>s.owner===id);
const state=(w:World,id:string)=>{const g=w.massRuntime!.geography!;g.snapshot();return g.hierarchy.controller(id,'objective:beacon')!;};
const body=(w:World,id:string)=>w.massRuntime!.geography!.hierarchy.controller(id,'objective:beacon:population')!.state as MassObjectiveBodiesSave;
const local=(w:World,a:GeographicPlan['owner']['center'])=>localOffset(a,{...w.massRuntime!.origin,x:0,y:0},960);
function restore(w:World){const s=serializeCharacter(w),next=makeSimWorld('warrior',84234);assert.ok(applySavedCharacter(next,s));assert.ok(next.adoptWorldState(s.world));next.startWorldMass(901743,s.world!.worldmass);return next;}
function seat(w:World,p:Readonly<GeographicPlan>){const m=w.massRuntime!,g=m.geography!,q=local(w,p.owner.center);w.landPartyAt(q);m.update(w,true);for(let i=0;i<20000&&!g.objectives.has(p.owner.id);i++){g.sync(w);g.update(w,0);}assert.ok(g.objectives.has(p.owner.id),'native beacon must finish checked physical manifest before mounting '+JSON.stringify({stats:g.intelPreparationStats,positions:p.positions.map(a=>{const v=local(w,a);return {v,distance:Math.hypot(v.x-w.player.pos.x,v.y-w.player.pos.y),walk:m.walk.isWalkable(v.x,v.y),solid:!!w.pointInSolid(v.x,v.y,g.objectives.fixtureRadius(p.owner,p.context)+12),doors:w.massObjectiveStandClear(v,'beacon'),cold:m.nativeFeatures?.intersects(a,130)};})}));}
const undo=seedGlobalRandom(901743);
try{
 for(const alias of ['beacon','circuit'] as const){
  let w=makeSimWorld('warrior',901743);w.startWorldMass(901743);let g=w.massRuntime!.geography!;const p=naturalBeacon(w,alias);assert.equal(p.context.recipe?.alias??'beacon',alias);
  seat(w,p);const manifest=g.intel.manifest(p.owner.id)!;assert.ok(manifest.candidates.length>0);assert.ok(manifest.candidates.every(t=>!g.intel.visited(t.id)));
  const firstSeat=local(w,p.positions[0]);w.player.pos={x:firstSeat.x+70,y:firstSeat.y};assert.equal(rows(w,p.owner.id).length,alias==='beacon'?1:4);w.time+=.5;g.update(w,.5);const before=state(w,p.owner.id);assert.equal((before.state as {fixtures:{charge:number}[]}).fixtures[0].charge,.5);
  const frozen=canonical(manifest),clock=w.time,bank=canonical(before.state),lures=body(w,p.owner.id).lures;assert.ok(lures?.length);
  w=restore(w);g=w.massRuntime!.geography!;assert.equal(w.time,clock);assert.equal(canonical(state(w,p.owner.id).state),bank);assert.equal(canonical(g.intel.manifest(p.owner.id)),frozen);assert.deepEqual(body(w,p.owner.id).lures,lures);
  // Native pressure executes from its saved remaining deadline; a second zero
  // step cannot duplicate the batch. It uses the actual frozen source roster.
  const left=(state(w,p.owner.id).state as {reinforceRemaining:number}).reinforceRemaining;assert.ok(left>0);
  w.player.pos={x:p.positions[0].x-50000,y:-50000};w.time+=left+.001;g.update(w,left+.001);state(w,p.owner.id);const born=body(w,p.owner.id);assert.ok(born.births.length>0);const sequence=born.sequence;g.update(w,0);state(w,p.owner.id);assert.equal(body(w,p.owner.id).sequence,sequence);
  const original=born.births.flatMap(b=>b.bodies).filter(a=>!a.dead);const first=w.actors.find(a=>a.id===original[0].actorId)!;first.life*=.7;const wound=first.life;
  w=restore(w);g=w.massRuntime!.geography!;seat(w,p);state(w,p.owner.id);const savedBodies=body(w,p.owner.id).births.flatMap(b=>b.bodies);assert.equal(savedBodies.find(b=>b.key===original[0].key)!.life,wound);assert.deepEqual(savedBodies.map(b=>b.monster),original.map(b=>b.monster));
  // This probe isolates controller completion by using native kill() for its
  // spawned pressure bodies. Actual combat/movement acceptance lives in UI rig.
  for(const s of rows(w,p.owner.id)){
   for(const a of [...w.actors])if(!a.dead&&a.team==='enemy'&&!a.passive)w.kill(a,false,w.player);
   w.player.pos={x:s.pos.x+70,y:s.pos.y};w.time+=30;g.update(w,30);
  }
  const complete=state(w,p.owner.id);assert.equal(complete.phase,'complete');assert.deepEqual(complete.receipts.map(r=>r.id),['native-beacon-reveal','native-objective-payout']);
  const discoveries=g.intel.knownTargets().filter(t=>manifest.candidates.some(c=>c.id===t.id));assert.ok(discoveries.length>0&&discoveries.length<=manifest.policy.count);assert.ok(discoveries.every(t=>!g.intel.visited(t.id)));
  const xp=w.meta.xp,definitions=discoveries.map(t=>({id:t.id,hash:t.definitionHash,access:t.accessHash}));w=restore(w);g=w.massRuntime!.geography!;seat(w,p);w.time+=30;g.update(w,30);assert.equal(w.meta.xp,xp);assert.equal(state(w,p.owner.id).receipts.length,2);assert.deepEqual(g.intel.knownTargets().filter(t=>definitions.some(d=>d.id===t.id)).map(t=>({id:t.id,hash:t.definitionHash,access:t.accessHash})),definitions);
  const checkpoint=g.hierarchy.snapshot(),bad=structuredClone(checkpoint);for(const row of bad.owners)for(const c of row.controllers)if(row.owner.id===p.owner.id&&c.id==='objective:beacon')c.receipts=c.receipts.filter(r=>r.id!=='native-beacon-reveal');
  assert.throws(()=>new MassObjectives(new MassHierarchy(g.hierarchy.run,g.hierarchy.seed,960,g.hierarchy.policy,[],bad)),/checkpoint/);
  console.log('PASS natural '+alias+' checked manifest, exact partial CharacterSave clock/lure, due batch once, native wounds, once survey/payout and coherent missing-receipt refusal');
 }
 // Exact browser failure: the frozen destination's reward chest lies beyond
 // the render-page circle at the first mound. Complete cold physics still
 // passes, so reaching the actual surveyed first fixture must publish it.
 {const replayUndo=seedGlobalRandom(901743);const sourceWorld=historicalWorld();const sourceGeo=sourceWorld.massRuntime!.geography!,planned=sourceGeo.plannedAt(point(-1,0))!,beacon=sourceGeo.plannedAt(point(-2,1))!;
 const {owner,...definition}=beacon;sourceGeo.hierarchy.enroll(owner,'objective-access','worldmass/geographic-access-v1',definition,null,sourceWorld.time);const discovered=sourceGeo.intel.reserve(planned as GeographicPlan,sourceWorld.time);sourceGeo.intel.finish(owner,sourceGeo.intel.policy(owner,beacon.context.zone),[discovered],sourceWorld.time);sourceGeo.intel.reveal(owner.id,sourceWorld.time);
 const arrived=restore(sourceWorld),arrivalGeo=arrived.massRuntime!.geography!,target=arrivalGeo.plannedAt(point(-1,0))!;
 assert.ok(arrivalGeo.intel.known(target.owner.id));assert.equal(arrivalGeo.intel.visited(target.owner.id),false);
 const arrivalStand=local(arrived,target.positions[0]);arrived.landPartyAt({x:arrivalStand.x+70,y:arrivalStand.y});
 assert.ok(Math.max(...[...target.positions,...(target.chestPosition?[target.chestPosition]:[])].map(a=>{const p=local(arrived,a);return Math.hypot(p.x-arrived.player.pos.x,p.y-arrived.player.pos.y);}))>1760);
 arrived.massRuntime!.update(arrived,true);arrivalGeo.sync(arrived);arrivalGeo.update(arrived,0);
 assert.ok(arrivalGeo.objectives.has(target.owner.id),'actual first surveyed mound must activate its complete cold-validated operation');assert.ok(arrivalGeo.intel.visited(target.owner.id));
 assert.equal(canonical((arrivalGeo.hierarchy.controller(target.owner.id,'objective:unearth')!.definition as {positions:unknown}).positions),canonical(target.positions));
 replayUndo();console.log('PASS exact surveyed first-mound arrival activates every original fixture beyond the renderer circle without moving its frozen source');}
 // An ordinary visit predates all survey enrollment. It must become durable
 // immediately, not wait for a later beacon to misclassify it as unknown.
 let w=makeSimWorld('warrior',901743);w.startWorldMass(901743);let g=w.massRuntime!.geography!;let visitedPlan:Readonly<GeographicPlan>|undefined;
 for(let y=-3;y<=3&&!visitedPlan;y++)for(let x=-3;x<=3&&!visitedPlan;x++){const p=g.plannedAt(point(x,y));if(!p?.access||p.context.zone.objective.kind==='beacon')continue;const q=local(w,p.positions[0]);w.landPartyAt({x:q.x+70,y:q.y});w.massRuntime!.update(w,true);g.sync(w);g.update(w,0);if(g.intel.visited(p.owner.id))visitedPlan=p as GeographicPlan;}
 assert.ok(visitedPlan,'ordinary mounted same-story LOS target must persist a visit before survey');const id=visitedPlan.owner.id;w.player.pos={x:-50000,y:50000};w=restore(w);g=w.massRuntime!.geography!;assert.ok(g.intel.known(id)&&g.intel.visited(id));
 const survey=naturalBeacon(w,'beacon',p=>g.intel.candidates(p.owner,g.intel.policy(p.owner,p.context.zone)).some(o=>o.id===visitedPlan!.owner.id));assert.equal(survey.context.zone.objective.kind,'beacon');const {owner:surveyOwner,...definition}=survey;g.hierarchy.enroll(surveyOwner,'objective-access','worldmass/geographic-access-v1',definition,null,w.time);
 const target=g.intel.reserve(visitedPlan,w.time),policy=g.intel.policy(surveyOwner,survey.context.zone);g.intel.finish(surveyOwner,policy,[target],w.time);assert.deepEqual(g.intel.reveal(surveyOwner.id,w.time),[]);assert.ok(g.intel.visited(id));
 console.log('PASS ordinary physical visit before any beacon survives departure/CharacterSave and cannot become new survey intel');
 // A non-solid native transit seat must veto both present admission and future
 // survey validation. This is a controlled placement-conflict fixture; it never
 // changes the natural objective's frozen source, access path or charge.
 w=makeSimWorld('warrior',901743);w.startWorldMass(901743);g=w.massRuntime!.geography!;
 const guarded=naturalBeacon(w),mass=w.massRuntime!,at=guarded.positions[0],pos=local(w,at);
 w.landPartyAt(local(w,guarded.owner.center));
 const future=()=>{const it=(g as unknown as {checkIntelAccess(p:Readonly<GeographicPlan>,world:World):Generator<void,boolean>}).checkIntelAccess(guarded,w);let next=it.next();while(!next.done)next=it.next();return next.value;};
 const transit=w as unknown as {waypointPos:{x:number;y:number}|null},oldWaypoint=transit.waypointPos;
 assert.equal(w.pointInSolid(pos.x,pos.y,28),null);transit.waypointPos={...pos};assert.equal(w.pointInSolid(pos.x,pos.y,28),null);
 assert.equal(w.massObjectiveStandClear(pos,'beacon'),false);g.sync(w);assert.equal(g.objectives.has(guarded.owner.id),false);assert.equal(g.intel.manifest(guarded.owner.id),undefined);assert.equal(future(),false);
 transit.waypointPos=oldWaypoint;assert.ok(future());
 // A real compiled native monastery stays cold. Its open walkable interior is
 // not a collision, but the accepted owner footprint still reserves the seat.
 const request={id:'beacon-cold-footprint',seed:42,source:{kind:'structure' as const,id:'marble_monastery',tileset:'downs'}};
 const descriptor=resolveNativeFeature(request),blueprint=compileNativeFeature(descriptor);let cold:MassNativeResidency|undefined;
 for(let y=120;y<1680&&!cold;y+=90)for(let x=120;x<1680&&!cold;x+=90){if(!blueprint.grid!.isWalkable(x,y))continue;const placement={id:request.id,request,origin:moveAddress(at,{x:-x,y:-y},960)};
  const candidate=new MassNativeResidency({run:mass.generator.run.runId,addressSpan:960,maxBlueprints:2,maxResidents:1,maxCandidates:1},()=>[placement],nativeWorldCapabilities(),()=>({...mass.origin,x:0,y:0}));
  if(candidate.intersects(at,130)&&!candidate.obstacleAt(at,28))cold=candidate;
 }
 assert.ok(cold,'actual native open interior fixture must exist');assert.equal(cold.stats.resident,0);const originalFeatures=mass.nativeFeatures;mass.nativeFeatures=cold;
 assert.equal(w.pointInSolid(pos.x,pos.y,28),null);assert.equal(w.massObjectiveStandClear(pos,'beacon'),true);assert.equal(future(),false);g.sync(w);assert.equal(g.objectives.has(guarded.owner.id),false);assert.equal(g.intel.manifest(guarded.owner.id),undefined);assert.equal(cold.stats.resident,0);
 mass.nativeFeatures=originalFeatures;assert.ok(future());seat(w,guarded);assert.ok(g.intel.manifest(guarded.owner.id));
 console.log('PASS real non-solid native transit and cold accepted footprint refuse admission/survey; clear natural owner still mounts afterward');
}finally{undo();}
