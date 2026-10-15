/** Crusade works own a finite native fixture patch, never a replacement area. */
import {bindNativeCrusadeFixtureMemory,bindNativeCrusadeDoorMemory,type NativeCrusadeFixtureRegistration} from '../engine/nativeCrusadeFixtureMemory';
import {nativePopulationFactoryOwner,type NativeAreaScenePopulation} from './nativeAreaScenePopulation';
import type {Actor} from '../engine/actor';
import type {World} from '../engine/world';
import type {Vec2} from '../core/math';
import {Rng} from '../core/rng';
import {GridWalkField} from '../world/gridWalk';
import {plannedRect,finishNativeRetainedFixtures,raiseStructure,ResolvedStructureSeatError,doodadRuleOf,type GenCtx,type GeneratedLayout,type Doodad,type PlacedStructure} from '../engine/levelgen';
import {nativeCrusadeFixtureSpecs} from '../engine/nativeLayoutGeneration';
import {nativeCrusadeLifetimeCalls,type CrusadeInfo,type CrusadeField} from '../packages/overlays/crusade';
import {spawnNativeDoorGuards,spawnNativeFurniture,spawnNativePlanResidents,spawnNativeFolkResidents,type NativeInhabitantHost} from '../engine/nativeInhabitants';
import type {NativeTownBodyRecorder} from '../engine/nativeTownBody';
import {nativeCrusadeTerrainArrival} from './nativeAreaSceneTransitionCoordinator';
import type {NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import type {NativeAreaSceneAssembly} from './nativeAreaSceneAssembly';
import {nativeUnclaimedActor,nativeReadyAuthority,type NativeAreaActorAuthority} from './nativeAreaActorAuthority';
import type {NativeSceneCensus} from './nativeAreaScenePopulation';
import {nativeCrusadePlanSignature,captureNativeCrusadeTerrain,type NativeCrusadeLayoutCapture,type NativeCrusadeTerrainState} from './nativeCrusadeLayoutCapture';
import {serializeNativeAreaData} from './nativeAreaGeometry';
const pack=GridWalkField.prototype.pack,fill=GridWalkField.prototype.fillRegion;
function protectedDoodad(d:Doodad):boolean {const rule=doodadRuleOf(d.kind);return !!d.door||rule.overlap==='trigger'||!!rule.seedPaired||d.kind.endsWith('_entrance');}
const splice=Array.prototype.splice;
const terrainOwners=new WeakMap<NativeSceneCensus,NativeCrusadeTerrain>();
const fixtureTokens=new WeakMap<object,NativeCrusadeFixtureRegistration>();
function fixtureToken(row:NativeCrusadeFixtureRegistration):object {const token=Object.freeze({});fixtureTokens.set(token,row);return token;}
function renameWorks(p:Patch,zone:string):Map<string,string>{const aliases=new Map<string,string>(),ids=new Map<string,string>();p.structures.forEach((s,i)=>ids.set(s.id,zone+'#crusade:'+p.key.id+':'+p.key.tier+':'+i));for(const s of p.structures){const prev=s.id;s.id=ids.get(prev)!;for(const {door:d}of s.doors){const next=s.id+d.id.slice(prev.length);aliases.set(d.id,next);d.id=next;}for(const slot of s.slots)slot.id=s.id+slot.id.slice(prev.length);}for(const d of p.added)if(d.door&&aliases.has(d.door.id))d.door.id=aliases.get(d.door.id)!;for(const row of [...p.layout.npcs,...p.layout.folk??[]])if(row.sid&&ids.has(row.sid))row.sid=ids.get(row.sid)!;return aliases;}
type Key={field:CrusadeField;epoch:object;id:string;tier:number;structure:string;plan:string};
type Paint={x:number;y:number;before:string;after:string;door:boolean};
type Patch={key:Key;paints:Paint[];added:Doodad[];removed:Doodad[];structures:PlacedStructure[];layout:GeneratedLayout;rows:Set<object>;done:Set<object>};
export interface NativeCrusadeTerrainEffects {readonly createMonster:World['createMonster'];admit(body:Actor):void;retire(body:Actor):void;release(body:Actor):void;validate():void}
function selected(field:CrusadeField|null|undefined,info:CrusadeInfo|null|undefined,plans:GenCtx['structurePlans']):Key|undefined {if(!field||!info?.structure)return;const epoch=Reflect.apply(nativeCrusadeLifetimeCalls.epoch,field,[info.crusadeId]);if(!epoch)throw Error('Crusade works selected an expired event');return{field,epoch,id:info.crusadeId,tier:info.tier,structure:info.structure,plan:nativeCrusadePlanSignature(info,plans)};}
function same(a:Key|undefined,b:Key|undefined):boolean{return !a&&!b||!!a&&!!b&&a.field===b.field&&a.epoch===b.epoch&&a.id===b.id&&a.tier===b.tier&&a.structure===b.structure&&a.plan===b.plan;}
function gridOf(state:NativeCrusadeTerrainState,arena:{w:number;h:number}):GridWalkField {if(state.walk)return GridWalkField.unpack(state.walk);const g=new GridWalkField(arena.w,arena.h,30);g.fillRect(0,0,arena.w,arena.h,true);return g;}
function patch(key:Key,before:NativeCrusadeTerrainState,after:NativeCrusadeTerrainState,arena:{w:number;h:number},final?:GeneratedLayout,laterPaints:readonly number[]=[]):Patch {
 const added=after.doodads.filter(d=>!before.doodads.includes(d)&&(!final||final.doodads.includes(d))),removed=before.doodads.filter(d=>{if(after.doodads.includes(d))return false;if(!final)return true;const owned=after.structures.filter(s=>!before.structures.includes(s));if(final.structures?.some(s=>!owned.includes(s)&&d.pos.x+d.radius>=s.rect.x&&d.pos.x-d.radius<=s.rect.x+s.rect.w&&d.pos.y+d.radius>=s.rect.y&&d.pos.y-d.radius<=s.rect.y+s.rect.h))return false;if(final.doodads.some(n=>!after.doodads.includes(n)&&Math.hypot(d.pos.x-n.pos.x,d.pos.y-n.pos.y)<d.radius+n.radius))return false;const walk=after.walk;if(walk&&laterPaints.some(i=>Math.abs((i%walk.cols+.5)*walk.cell-d.pos.x)<=d.radius+walk.cell&&Math.abs((Math.floor(i/walk.cols)+.5)*walk.cell-d.pos.y)<=d.radius+walk.cell))return false;return true;});
 const structures=after.structures.filter(s=>!before.structures.includes(s)&&(!final||final.structures?.includes(s)));
 const delta=<T>(a:readonly T[],b:readonly T[],last?:readonly T[])=>a.filter(v=>!b.includes(v)&&(!last||last.includes(v)));
 const layout:GeneratedLayout={doodads:added,structures,pois:delta(after.pois,before.pois,final?.pois),camps:[],caveSeeds:[],breakables:delta(after.breakables,before.breakables,final?.breakables),npcs:delta(after.npcs,before.npcs,final?.npcs),folk:delta(after.folk,before.folk,final?.folk),garrisons:delta(after.garrisons,before.garrisons,final?.garrisons)};
 const overwritten=new Set(laterPaints);const prev=gridOf(before,arena),next=gridOf(after,arena),live=final?.walk,doors=structures.flatMap(s=>s.doors),paints:Paint[]=[];
 for(let y=0;y<next.rows;y++)for(let x=0;x<next.cols;x++){const px=(x+.5)*next.cell,py=(y+.5)*next.cell,a=prev.kindAt(px,py),b=next.kindAt(px,py);if(a===b||overwritten.has(y*next.cols+x))continue;
  // Later native generation passes can change an injected cell. Such later work
  // is not this event's property and must survive its retirement.
  if(live instanceof GridWalkField&&live.kindAt(px,py)!==b)continue;
  const door=doors.some(({door:d})=>!!d.cells&&px>=Math.floor(d.cells!.x/next.cell)*next.cell&&px<(Math.floor((d.cells!.x+d.cells!.w-.01)/next.cell)+1)*next.cell&&py>=Math.floor(d.cells!.y/next.cell)*next.cell&&py<(Math.floor((d.cells!.y+d.cells!.h-.01)/next.cell)+1)*next.cell);
  if(a===undefined||b===undefined)throw Error('Crusade terrain cell escaped native bounds');paints.push({x:px,y:py,before:a,after:b,door});
 }
 return{key,paints,added:[...added],removed:[...removed],structures:[...structures],layout,rows:new Set([...added.filter(d=>!!d.door),...layout.breakables,...layout.npcs,...layout.folk??[]]),done:new Set()};
}
/** Ownership comes from actual native insertions, never body position or tag. */
export class NativeCrusadeTerrain {
 #coldMemory:Readonly<Record<string,'open'|'broken'>>|undefined;#restoreDoors=new Map<string,'open'|'broken'>();#population:NativeAreaScenePopulation|undefined;#pockets:GeneratedLayout['pockets'];#seed:number|undefined;#patch:Patch|undefined;#bodies=new Map<object,Actor>();#retiring=new Map<object,Actor>();#aliases=new Map<string,string>();#busy=false;#phase:'fresh'|'birth'|'ready'='fresh';#dirty=false;#memory:ReturnType<typeof bindNativeCrusadeFixtureMemory>|undefined;
 constructor(readonly scene:NativeSceneCensus){if(terrainOwners.has(scene))throw Error('Crusade census already has a terrain owner');terrainOwners.set(scene,this);Object.defineProperty(this,'scene',{writable:false,configurable:false});Object.defineProperty(this,'record',{writable:false,configurable:false});}
 readonly record:NativeTownBodyRecorder=(_kind,row,body)=>{if(typeof row!=='object'||!this.#patch?.rows.has(row))return;if(this.#phase!=='birth'&&!this.#busy)throw Error('Crusade fixture receipt needs actual native insertion');if(!this.#population||!this.scene.actors.includes(body)||!Reflect.apply(nativePopulationFactoryOwner,this.#population,[body]))throw Error('Crusade receipt needs its actual population insertion');this.#bodies.set(row,body);this.#patch.done.add(row);const ordinal=this.#patch.layout.breakables.indexOf(row as GeneratedLayout['breakables'][number]);if(ordinal>=0){const k=this.#patch.key;this.#memory?.record(body,{zone:this.scene.zone.id,event:k.id,tier:k.tier,structure:k.structure,plan:k.plan,ordinal});}};
 bindMemory(population:NativeAreaScenePopulation):void {if(this.#memory)throw Error('Crusade fixture memory already selected');Reflect.apply(nativePopulationFactoryOwner,population,[this.scene.player]);if(population.input.scene!==this.scene)throw Error('Crusade fixture population belongs to another census');this.#population=population;this.#memory=bindNativeCrusadeFixtureMemory(fixtureToken({kind:'furniture',owner:population,restore:(body,memo)=>{const p=this.#patch;if(!p||this.#phase!=='birth'||!memo||typeof memo!=='object')return;const k=p.key;if(memo.zone!==this.scene.zone.id||memo.event!==k.id||memo.tier!==k.tier||memo.structure!==k.structure||memo.plan!==k.plan||!Number.isSafeInteger(memo.ordinal)||memo.ordinal<0)return;const row=p.layout.breakables[memo.ordinal];if(!row||body.defId!==row.id||body.team!=='enemy'||!body.fromZoneGen||(body.tier??0)!==0||!this.scene.actors.includes(body))return;const prior=this.#bodies.get(row);if(prior&&this.scene.actors.includes(prior))throw Error('Crusade restored fixture row already owns a live body');this.record('furniture',row,body);},complete:(memory,actors)=>{if(this.#phase!=='birth'||this.#patch)return;if(population!==this.#population||population.input.scene!==this.scene||actors!==this.scene.actors)throw Error('Crusade cold memory changed its actual population census');const doors:Record<string,'open'|'broken'>={};for(const [id,state]of Object.entries(memory.doorState??{}))if(state==='open'||state==='broken')doors[id]=state;this.#coldMemory=Object.freeze(doors);}}));}
 bindDoorMemory(host:object):void {bindNativeCrusadeDoorMemory(fixtureToken({kind:'door',owner:host,read:id=>Reflect.apply(nativeCrusadeTerrainCalls.memoryDoor,this,[id])}));}
 finishBirth():void {if(this.#phase!=='birth')throw Error('Crusade fixture birth is not active');this.#phase='ready';}
 memoryDoor(id:string):string {return this.#phase==='birth'?(this.#aliases.get(id)??id):id;}
 adopt(capture:ReturnType<NativeCrusadeLayoutCapture['read']>,layout:GeneratedLayout):void {
  if(this.#phase!=='fresh')throw Error('Crusade fixture layout already adopted');this.#phase='birth';this.#pockets=layout.pockets;this.#seed=capture.seed;const r=capture.record;if(!r)return;
  this.#patch=patch({field:r.field,epoch:r.epoch,id:r.id,tier:r.tier,structure:r.structure,plan:r.plan},r.before,r.after,this.scene.zone.size,layout,r.laterPaints);this.#aliases=renameWorks(this.#patch,this.scene.zone.id);
 }
 refresh(combat:NativeAreaSceneCombat,assembly:NativeAreaSceneAssembly,authority:NativeAreaActorAuthority<object>,effects:NativeCrusadeTerrainEffects,entry:Readonly<Vec2>):boolean {
  if(this.#busy||this.#phase!=='ready'||combat.input.assembly!==assembly||combat.input.authority!==authority||Reflect.apply(nativeCrusadeTerrainArrival,combat.input.coordinator,[combat])!==entry)throw Error('Crusade works require their non-reentrant genuine arrival');this.#busy=true;try{
  const {scene,geometry:g,campaign,residents,population,sources}=assembly.input;
  if(scene!==this.scene)throw Error('Crusade works belong to another census');
  if(Reflect.apply(nativeReadyAuthority.seats,authority,[scene]).length)return false;
  const field=campaign.sim.crusadeField,zone=scene.zone;const sourceRoots={walk:g.walk,doodads:g.doodads,structures:g.structures,actors:scene.actors,arena:g.arena},queryRows={doodads:[...g.doodads],structures:[...g.structures],actors:[...scene.actors]};
  const assertEntry=()=>{if(Reflect.apply(nativeCrusadeTerrainArrival,combat.input.coordinator,[combat])!==entry)throw Error('Crusade arrival changed');effects.validate();if(scene!==this.scene||scene.zone!==zone||campaign.sim.crusadeField!==field||g.walk!==sourceRoots.walk||g.doodads!==sourceRoots.doodads||g.structures!==sourceRoots.structures||scene.actors!==sourceRoots.actors||g.arena!==sourceRoots.arena||Reflect.apply(nativeReadyAuthority.seats,authority,[scene]).length)throw Error('Crusade works acquired different event roots or occupants');};
  assertEntry();
  let info:CrusadeInfo|null|undefined;
  const host=Object.create(assembly.generation.host) as typeof assembly.generation.host;
  Object.defineProperty(host,'observeCrusadeLayout',{value:(value:CrusadeInfo|null|undefined)=>{info=value;}});
  // Preserve the selected original public query, then authenticate its result
  // after every callback before changing the retained patch.
  const specs=nativeCrusadeFixtureSpecs(host,zone,{...entry});
  assertEntry();for(const k of ['doodads','structures','actors'] as const)if(queryRows[k].length!==sourceRoots[k].length||queryRows[k].some((v,i)=>sourceRoots[k][i]!==v))throw Error('Crusade query changed actual geometry or bodies');const key=selected(field,info,zone.structurePlans);
  const assertEvent=()=>{assertEntry();const current=field?Reflect.apply(nativeCrusadeLifetimeCalls.query,field,[zone.id]):undefined;if(!same(key,selected(field,current,zone.structurePlans)))throw Error('Crusade works event changed during arrival');};
  assertEvent();
  const old=this.#patch;
  let changed=false;
  if(!same(old?.key,key)){
   const grid=g.walk;if(grid&&!(grid instanceof GridWalkField))throw Error('Crusade works need native grid terrain');
   const doodads=g.doodads,structures=g.structures,arena=g.arena,actors=scene.actors;
   const oldD=[...doodads],oldS=[...structures],oldA=[...actors];
   const rawGrid=grid?Reflect.apply(pack,grid,[]):null,rawStructures=serializeNativeAreaData(structures),rawDoodads=serializeNativeAreaData(doodads);
   const clone=rawGrid?GridWalkField.unpack(rawGrid):new GridWalkField(arena.w,arena.h,30);if(!rawGrid)clone.fillRect(0,0,arena.w,arena.h,true);
   if(old)for(const p of old.paints){const now=clone.kindAt(p.x,p.y);if(now===p.after||p.door&&now==='ground')Reflect.apply(fill,clone,[p.x,p.y,p.x,p.y,p.before]);}
   const baseD=oldD.filter(d=>!old?.added.includes(d));if(old)for(const d of old.removed)if(!baseD.includes(d))baseD.push(d);
   const baseS=oldS.filter(s=>!old?.structures.includes(s));
   const ctx:GenCtx={retainedFixtureFit:true,pockets:this.#pockets,rng:Rng.fromState(this.#seed??g.currentZoneSeed),arena:{...arena},entry:{...entry},exits:g.exits.map(e=>({...e.pos})),level:zone.level,seed:zone.seed,zoneId:zone.id,geo:zone.geo,structurePlans:zone.structurePlans,doodads:[...baseD],structures:structuredClone(baseS),pois:[],camps:[],breakables:[],npcs:[],garrisons:[],caveSeeds:[],reserved:baseS.map(s=>({rect:{...s.rect},margin:30})),walk:clone};
   // Protect all already materialized mouths and unrelated structures; native
   // fitting may choose another valid seat, but never consumes a live portal.
   for(const d of baseD)if(protectedDoodad(d))ctx.reserved.push({pos:{...d.pos},radius:d.radius+45});
   const fixtures=assembly.input.physical.input.state;
   const retired=new Set(this.#bodies.values());
   const stands=[...oldA.filter(a=>!a.dead&&!retired.has(a)&&(a.tier??0)===0).map(a=>({pos:{...a.pos},radius:a.radius+30})),...[...fixtures.drops,...fixtures.chests,...fixtures.shrines,...fixtures.altars,...assembly.input.state.fonts].map(v=>({pos:{...v.pos},radius:45})),...(g.waypointPos?[{pos:{...g.waypointPos},radius:45}]:[])];
   ctx.reserved.push(...stands);ctx.mustReach=stands.map(s=>s.pos);
   // A surviving body or reward keeps the ground it stood on when the old
   // works cut into a mountain or wetland. Retirement may not bury that stand.
   if(grid)for(const stand of stands)if(grid.isWalkable(stand.pos.x,stand.pos.y)&&!clone.isWalkable(stand.pos.x,stand.pos.y))clone.fillRegion(stand.pos.x-stand.radius,stand.pos.y-stand.radius,stand.pos.x+stand.radius,stand.pos.y+stand.radius,'ground');
   const before=captureNativeCrusadeTerrain(ctx);
   // New works are optional on an already occupied backing. A spatial refusal
   // leaves the entire old patch, bodies and resources intact and retries on a
   // later arrival. Other generation or selected-callback errors still escape.
   try{if(key&&specs)for(const fixture of specs.fixtures)raiseStructure(ctx,fixture.structure,{x:fixture.x,y:fixture.y});}
   catch(error){if(!(error instanceof ResolvedStructureSeatError))throw error;assertEvent();return false;}
   if(serializeNativeAreaData(ctx.structures?.slice(0,baseS.length))!==serializeNativeAreaData(baseS))throw Error('Crusade works would change an unrelated structure');
   finishNativeRetainedFixtures(ctx);
   const open=GridWalkField.unpack(clone.pack()),priorOpen=rawGrid?GridWalkField.unpack(rawGrid):null;
   for(const s of ctx.structures??[])for(const {door}of s.doors)if(door.cells){const c=door.cells;open.fillRegion(c.x,c.y,c.x+c.w-.01,c.y+c.h-.01,'ground');}
   if(priorOpen)for(const s of oldS)for(const {door}of s.doors)if(door.cells){const c=door.cells;priorOpen.fillRegion(c.x,c.y,c.x+c.w-.01,c.y+c.h-.01,'ground');}
   const start=open.snapToWalkable({...entry}),priorStart=priorOpen?.snapToWalkable({...entry});
   for(const stand of stands)if(!priorOpen||priorOpen.isWalkable(stand.pos.x,stand.pos.y)&&priorOpen.reachable(priorStart!,stand.pos)){if(!open.isWalkable(stand.pos.x,stand.pos.y)||!open.reachable(start,stand.pos))throw Error('Crusade works would entomb a retained body or reward');}
   const after=captureNativeCrusadeTerrain(ctx);
   const removed=baseD.filter(d=>!ctx.doodads.includes(d));
   if(removed.some(d=>protectedDoodad(d)))throw Error('Crusade works would erase a retained portal or door');
   if(ctx.garrisons.length||ctx.caveSeeds.length||ctx.camps.length||ctx.storeyLevels||ctx.spawnAt)throw Error('Crusade works exceeded its native fixture scope');
   const next=key?patch(key,before,after,arena):undefined;
   if(next)renameWorks(next,zone.id);
   assertEvent();
   if(g.walk!==grid||g.doodads!==doodads||g.structures!==structures||g.arena!==arena||scene.actors!==actors||oldD.length!==doodads.length||oldD.some((v,i)=>doodads[i]!==v)||oldS.length!==structures.length||oldS.some((v,i)=>structures[i]!==v)||oldA.length!==actors.length||oldA.some((v,i)=>actors[i]!==v)||serializeNativeAreaData(structures)!==rawStructures||serializeNativeAreaData(doodads)!==rawDoodads||serializeNativeAreaData(grid?Reflect.apply(pack,grid,[]):null)!==serializeNativeAreaData(rawGrid))throw Error('Crusade works roots changed during native compilation');
   // Release only actual claims on retired slots. Ordinary garrison bodies,
   // wounds, rewards, and AI remain owned by their original lifetime owner.
   const retiredSlots=new Set(old?.structures.flatMap(s=>s.slots.map(slot=>slot.id))??[]);
   for(const body of oldA)if(body.garrison&&retiredSlots.has(body.garrison.slotId)){const expected=structuredClone(structures);for(const s of expected)for(const slot of s.slots)if(slot.id===body.garrison.slotId)slot.occupants=slot.occupants.filter(id=>id!==body.id);effects.release(body);assertEvent();if(serializeNativeAreaData(structures)!==serializeNativeAreaData(expected)||serializeNativeAreaData(doodads)!==rawDoodads||serializeNativeAreaData(grid?Reflect.apply(pack,grid,[]):null)!==serializeNativeAreaData(rawGrid)||oldA.length!==actors.length||oldA.some((v,i)=>actors[i]!==v))throw Error('Crusade slot release changed unrelated geometry or bodies');}
   for(const [row,body]of this.#bodies)this.#retiring.set(row,body);this.#bodies.clear();
   // Completed geometry is recorded before callbacks/materialization. A later
   // throw retries only unfinished native body rows and never replays the patch.
   if(grid){for(let y=0;y<grid.rows;y++)for(let x=0;x<grid.cols;x++){const px=(x+.5)*grid.cell,py=(y+.5)*grid.cell,kind=clone.kindAt(px,py);if(grid.kindAt(px,py)!==kind)Reflect.apply(fill,grid,[px,py,px,py,kind]);}}else if(next){g.walk=clone;sourceRoots.walk=clone;}
   Reflect.apply(splice,doodads,[0,doodads.length,...ctx.doodads]);Reflect.apply(splice,structures,[0,structures.length,...baseS,...next?.structures??[]]);
   this.#patch=next;if(next&&this.#coldMemory){
    // Native cold restoration replaced the complete generated enemy census,
    // even when no survivors existed. The delayed first fixture pass cannot
    // add enemy furniture that that same native memory would have removed.
    // This completion fact grants no ownership of the restored old bodies.
    for(const row of next.layout.breakables)next.done.add(row);for(const d of next.added)if(d.door){const state=this.#coldMemory[d.door.id];if(state)this.#restoreDoors.set(d.door.id,state);}this.#coldMemory=undefined;
   }const main=next?.structures[0],requested=specs?.fixtures[0];const rect=requested&&main?plannedRect(requested,main.rect.w,main.rect.h):null;const snapped=rect?{x:rect.x+rect.w/2,y:rect.y+rect.h/2}:null;const actual=main?{x:main.rect.x+main.rect.w/2,y:main.rect.y+main.rect.h/2}:null;assembly.generation.input.state.crusadeWorksAt=actual&&snapped&&Math.abs(actual.x-snapped.x)<.01&&Math.abs(actual.y-snapped.y)<.01?{...specs!.center}:actual;
   changed=true;this.#dirty=true;
  }
  if(this.#dirty){g.markDoodadsChanged();this.#dirty=false;assertEvent();}
  for(const [row,body]of this.#retiring){const i=scene.actors.indexOf(body);if(i>=0)Reflect.apply(splice,scene.actors,[i,1]);let released=true;try{Reflect.apply(nativeUnclaimedActor,authority,[body]);}catch{released=false;}if(!released)effects.retire(body);this.#retiring.delete(row);residents.speakerRows.delete(body.id);assertEvent();}
  const current=this.#patch;if(!current)return changed;
  for(const [id,state]of this.#restoreDoors){if(!current.added.some(d=>d.door?.id===id)){this.#restoreDoors.delete(id);continue;}assertEvent();const setDoorState=g.setDoorState;assertEvent();Reflect.apply(setDoorState,g,[id,state,{silent:true}]);assertEvent();this.#restoreDoors.delete(id);}
  const original=residents.inhabitants(population),inhabitants=Object.create(original) as NativeInhabitantHost;
  Object.defineProperties(inhabitants,{createMonster:{get:()=>{assertEvent();return effects.createMonster;}},townBody:{value:(kind:Parameters<NativeTownBodyRecorder>[0],row:object|string,body:Actor)=>{effects.admit(body);this.record(kind,row,body);assertEvent();}}});
  const empty:GeneratedLayout={doodads:[],pois:[],camps:[],breakables:[],npcs:[],folk:[],garrisons:[],caveSeeds:[]};
  const run=(row:object,fn:()=>void)=>{if(current.done.has(row))return;assertEvent();fn();current.done.add(row);assertEvent();};
  for(const row of current.layout.doodads)if(row.door)run(row,()=>{Object.defineProperty(inhabitants,'doodads',{configurable:true,value:[row]});spawnNativeDoorGuards(inhabitants,sources.nativeInhabitantSources,zone,empty);});
  for(const row of current.layout.breakables)run(row,()=>spawnNativeFurniture(inhabitants,sources.nativeInhabitantSources,zone,{...empty,breakables:[row]}));
  const seats=new Map(current.layout.npcs.map((row,i)=>[row,i]));
  for(const row of current.layout.npcs)run(row,()=>spawnNativePlanResidents(inhabitants,sources.nativeInhabitantSources,zone,{...empty,npcs:[row]},seats));
  for(const row of current.layout.folk??[])run(row,()=>spawnNativeFolkResidents(inhabitants,sources.nativeInhabitantSources,zone,{...empty,folk:[row]},new Set((current.layout.folk??[]).map(r=>this.#bodies.get(r)?.name).filter((n):n is string=>!!n))));
  return changed;
  }finally{this.#busy=false;}
 }
}

export function consumeNativeCrusadeFixtureToken(token:object):NativeCrusadeFixtureRegistration {const row=fixtureTokens.get(token);if(!row)throw Error('Crusade fixture binding needs its actual one-use owner receipt');fixtureTokens.delete(token);return row;}
export const nativeCrusadeTerrainCalls=Object.freeze({bindDoorMemory:NativeCrusadeTerrain.prototype.bindDoorMemory,bindMemory:NativeCrusadeTerrain.prototype.bindMemory,adopt:NativeCrusadeTerrain.prototype.adopt,finishBirth:NativeCrusadeTerrain.prototype.finishBirth,memoryDoor:NativeCrusadeTerrain.prototype.memoryDoor,refresh:NativeCrusadeTerrain.prototype.refresh});
