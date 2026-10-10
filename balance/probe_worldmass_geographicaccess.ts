import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { applySavedCharacter,serializeCharacter } from '../src/meta/character';
import type { HoldFixture } from '../src/engine/holdObjectives';
import { seedGlobalRandom } from '../src/sim/rng';
import { address, localOffset, moveAddress } from '../src/worldmass/address';
import { canonical, massDigest } from '../src/worldmass/random';
import { MASS_ACCESS_POLICY, discTerrainClear, GeographicAccessIndex, geographicAccessPoints, planGeographicAccess, validateGeographicAccess, type MassAccessProof } from '../src/worldmass/geographicAccess';

assert.equal(discTerrainClear({x:22.5,y:0},12,30,p=>!(p.x>=30&&p.y<0)),false,'diagonal wet tile touched by body corner is rejected even when all cardinal samples are dry');
assert.equal(discTerrainClear({x:15,y:15},12,30,p=>p.x<30&&p.y<30),true,'adjacent untouching wet tiles do not invent a wider body');
const span=960,center=address('surface','-1','-1',960-300,960-300,span);
const targets=[[-300,0],[300,0],[240,-240]].map(([x,y],i)=>({at:moveAddress(center,{x,y},span),radius:i===2?24:13}));
const plan=(region:(p:{x:number;y:number})=>string,reserved?:(p:{x:number;y:number},radius:number)=>boolean)=>planGeographicAccess(center,targets,span,
 {terrainCell:30,regionAt:at=>region(localOffset(at,center,span)),reserved:reserved?(at,r)=>reserved(localOffset(at,center,span),r):undefined},600);
const reference=plan(()=> 'ground');assert.ok(reference.ok);validateGeographicAccess(reference.proof,span);
assert.ok(reference.expanded<=MASS_ACCESS_POLICY.maxExpanded);assert.ok(reference.samples<10000);
assert.equal(canonical(plan(()=> 'ground')),canonical(reference));
for(const kind of ['water','wall','lava','chasm','bog','swamp']){
 const result=plan(p=>{const d=Math.max(Math.abs(p.x),Math.abs(p.y));return d>=420&&d<510?kind:'ground';});
 assert.equal(result.ok,false,kind+' enclosure must refuse despite dry fixture stands and dry exterior');
 assert.ok(result.expanded<=MASS_ACCESS_POLICY.maxExpanded);
}
const split=plan(p=>{const d=Math.hypot(p.x-300,p.y);return d>=90&&d<180?'water':'ground';});
assert.equal(split.ok,false,'individually clear fixture cannot be disconnected from the other operation fixtures');
const detour=plan(p=>Math.abs(p.x)<60&&p.y>-330&&p.y<330?'wall':'ground');
assert.ok(detour.ok);assert.ok(geographicAccessPoints(detour.proof).some(p=>Math.abs(p.y)>=360),'real route bends around the wall');
assert.ok(plan(()=> 'ground',(p,r)=>Math.abs(p.x)<60+r&&Math.abs(p.y)<240+r).ok,'independent reserved bodies receive a genuine detour');
const index=new GeographicAccessIndex(reference.proof,span),outside=geographicAccessPoints(reference.proof).find(p=>Math.max(Math.abs(p.x),Math.abs(p.y))===600)!;
assert.ok(index.intersects(moveAddress(center,outside,span),0));assert.equal(index.intersects(moveAddress(center,{x:4000,y:4000},span),0),false);
const bad=JSON.parse(canonical(reference.proof)) as MassAccessProof;bad.paths[0][1]=bad.paths[0][0];const {hash:_hash,...body}=bad;bad.hash=massDigest(body);
assert.throws(()=>validateGeographicAccess(bad,span),/Disconnected/);
const distant=address('surface','9007199254740993000','-9007199254740993001',660,660,span);
const remote=planGeographicAccess(distant,targets.map(t=>({...t,at:moveAddress(distant,localOffset(t.at,center,span),span)})),span,{terrainCell:30,regionAt:()=> 'ground'},600);
assert.ok(remote.ok);assert.deepEqual(remote.proof.paths,reference.proof.paths);assert.deepEqual(remote.proof.anchors,reference.proof.anchors);
console.log('PASS one connected body-clear objective/chest/exterior network, dry/wall rings, disconnected fixture, real detours, bounded queries, corridor reservation, tamper and distant/negative address parity');

const restore=seedGlobalRandom(901743);
try{
 const world=makeSimWorld('warrior',901743);world.startWorldMass(901743);world.player.invulnerable=true;
 const mass=world.massRuntime!,geography=mass.geography!;
 const scans:number[]=[],scanStart=performance.now();
 for(let i=0;i<24;i++){const start=performance.now();mass.nativeCountry!.near(mass.walk.at((i-12)*10800+2700,2700),2400);scans.push(performance.now()-start);}
 const sorted=[...scans].sort((a,b)=>a-b);console.log('COLD_NATIVE_COUNTRY_SCANS',JSON.stringify({count:scans.length,totalMs:performance.now()-scanStart,medianMs:sorted[12],p95Ms:sorted[Math.floor(sorted.length*.95)],maxMs:sorted.at(-1),planning:geography.accessStats}));
 const found=new Map<string,NonNullable<ReturnType<typeof geography.plannedAt>>>();
 for(let r=0;r<=18&&found.size<4;r++)for(let y=-r;y<=r&&found.size<4;y++)for(let x=-r;x<=r&&found.size<4;x++){
  if(Math.max(Math.abs(x),Math.abs(y))!==r)continue;
  const p=geography.plannedAt(mass.walk.at(x*5400+2700,y*5400+2700));if(p&&!found.has(p.context.zone.objective.kind))found.set(p.context.zone.objective.kind,p);
 }
 assert.deepEqual([...found.keys()].sort(),['beacon','pyres','rifts','unearth']);
 for(const [kind,p]of found){
  validateGeographicAccess(p.access!,span);assert.equal(p.access!.targets.length,p.positions.length+(p.chestPosition?1:0));
  const route=geographicAccessPoints(p.access!),far=route.find(q=>p.positions.every(t=>{const d=localOffset(t,p.owner.center,span);return Math.hypot(d.x-q.x,d.y-q.y)>180;}))!;
  assert.ok(far);assert.ok(geography.reserves(moveAddress(p.owner.center,far,span),0),kind+' route reserves more than fixture discs');
 }
 const p=found.get('pyres')!,pose=localOffset(p.owner.center,{...mass.origin,x:0,y:0},span);
 world.landPartyAt(pose);
 const route=geographicAccessPoints(p.access!),blockPoint=route.find(q=>p.positions.every(t=>{const d=localOffset(t,p.owner.center,span);return Math.hypot(d.x-q.x,d.y-q.y)>200;}))!;
 const obstruction={kind:'rock',pos:{x:pose.x+blockPoint.x,y:pose.y+blockPoint.y},radius:35};
 world.doodads.push(obstruction);assert.ok(world.pointInSolid(obstruction.pos.x,obstruction.pos.y,12));
 geography.sync(world);assert.equal(geography.hierarchy.controller(p.owner.id,'objective:pyres'),undefined,'actual final scenery sweep blocks admission despite valid immutable route');
 world.doodads.splice(world.doodads.indexOf(obstruction),1);mass.update(world,true);
 const receipt=geography.hierarchy.controller(p.owner.id,'objective-access');assert.ok(receipt,'actual admission persists verified access');
 assert.equal((receipt.definition as {access:MassAccessProof}).access.hash,p.access!.hash);
 assert.ok(geography.hierarchy.controller(p.owner.id,'objective:pyres'));
 console.log('PASS default seed901743 searchable pyre/rift/dig native plans, exact corridor reservations, final live scene sweep and persisted access receipt',JSON.stringify([...found].map(([kind,p])=>({kind,owner:p.owner.id,nodes:geographicAccessPoints(p.access!).length}))));

 const rows=(world as unknown as {pyres:HoldFixture[]}).pyres.filter(s=>s.owner===p.owner.id);
 for(const row of rows){
  for(const enemy of [...world.actors])if(!enemy.dead&&enemy.team==='enemy')world.kill(enemy,false,world.player);
  const target=p.access!.targets.findIndex(t=>canonical(t.at)===canonical(p.positions[rows.indexOf(row)]));
  const i=p.access!.anchors[target],side=p.access!.halfSpan/30*2+1;
  world.landPartyAt({x:pose.x+i%side*30-p.access!.halfSpan,y:pose.y+Math.floor(i/side)*30-p.access!.halfSpan});
  world.time+=30;(world as unknown as {updateObjective(dt:number):void}).updateObjective(30);
 }
 const chest=world.chests.find(c=>c.massObjectiveOwner===p.owner.id);if(chest){world.landPartyAt(chest.pos);(world as unknown as {updateChests(dt:number):void}).updateChests(1);assert.ok(chest.opened);}
 const saved=serializeCharacter(world),receiptBefore=geography.hierarchy.controller(p.owner.id,'objective:pyres')!;
 assert.equal(saved.world!.worldmass!.schema,19); /* WildernessPathsSchema */assert.equal(receiptBefore.phase,'complete');assert.equal(receiptBefore.receipts.length,1);
 const legacy=structuredClone(saved);for(const owner of legacy.world!.worldmass!.geography!.owners)owner.controllers=owner.controllers.filter(c=>!['objective-access','physical-intel','beacon-survey'].includes(c.id));
 const continued=makeSimWorld('warrior',901745);assert.ok(applySavedCharacter(continued,legacy));assert.ok(continued.adoptWorldState(legacy.world));continued.startWorldMass(legacy.world!.worldmass!.state.run.seed,legacy.world!.worldmass);
 const geo=continued.massRuntime!.geography!,oldPlan=geo.plannedAt(p.owner.center)!;
 assert.equal(oldPlan.legacyAccess,'legacy-unverified-access');assert.equal(oldPlan.access,undefined);assert.deepEqual(oldPlan.positions,p.positions);assert.deepEqual(oldPlan.context,p.context);assert.deepEqual(oldPlan.chestPosition,p.chestPosition);
 assert.ok(geo.accessStats.legacyUnverified>0);assert.deepEqual(geo.hierarchy.controller(p.owner.id,'objective:pyres'),receiptBefore);
 if(chest){const restored=continued.chests.filter(c=>c.rewardSource===chest.rewardSource);assert.equal(restored.length,1);assert.ok(restored[0].opened);assert.equal(restored[0].openedAt,chest.openedAt);}
 const before=serializeCharacter(continued);continued.time+=30;(continued as unknown as {updateObjective(dt:number):void}).updateObjective(30);(continued as unknown as {updateChests(dt:number):void}).updateChests(1);
 const after=serializeCharacter(continued);assert.equal(after.xp,before.xp);assert.deepEqual(after.world!.worldmass!.contents.drops,before.world!.worldmass!.contents.drops);assert.equal(geo.hierarchy.controller(p.owner.id,'objective:pyres')!.receipts.length,1);
 const corrupt=structuredClone(saved),access=corrupt.world!.worldmass!.geography!.owners.find(o=>o.owner.id===p.owner.id)!.controllers.find(c=>c.id==='objective-access')!;
 (access.definition as {access:MassAccessProof}).access.paths[0][0]++;access.definitionHash=massDigest(access.definition);
 const refused=makeSimWorld('warrior',901746);assert.ok(applySavedCharacter(refused,corrupt));assert.ok(refused.adoptWorldState(corrupt.world));assert.throws(()=>refused.startWorldMass(corrupt.world!.worldmass!.state.run.seed,corrupt.world!.worldmass),/geographic access/i);
 console.log('PASS actual scenery blocker refuses admission; historical objective receipt Continue (landformCompositionSchema) retains exact stands/context/chest/receipt and no duplicate payout; malformed current proof rejects');
 console.log('GEOGRAPHIC_PLANNING_STATS',JSON.stringify(geography.accessStats));
}finally{restore();}
