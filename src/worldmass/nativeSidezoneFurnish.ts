import {Rng} from '../core/rng';
import {vec} from '../core/math';
import {STRUCTURES,legendCell,type StructureDef} from '../data/structures';
import {sidezoneOf} from '../data/sidezones';
import {raiseStructure,doodadRuleOf,type Doodad,type GenCtx,type GeneratedLayout} from '../engine/levelgen';
import {nativeLayoutMouthSeat,nativeRegisteredSidezoneMouth} from '../engine/nativeAreaLayout';
import {structurePlanOf} from '../engine/structurePlans';
import {allFurnishSpecs} from '../packages/registry';
import {GridWalkField} from '../world/gridWalk';
import {isDoodadGround} from '../world/regions';
import {copyNativeAreaData,serializeNativeAreaData} from './nativeAreaGeometry';
import {NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';

const push=Array.prototype.push,splice=Array.prototype.splice,pack=GridWalkField.prototype.pack;
const cursor=Rng.prototype.snapshot;
const fill=GridWalkField.prototype.fillRegion,mark=NativeAreaSceneGeometry.prototype.markDoodadsChanged;
type Fixture={structure:string;x:number;y:number};
const keyOf=(f:Fixture)=>serializeNativeAreaData(f);
function own<T>(o:object,k:PropertyKey):T {const d=Object.getOwnPropertyDescriptor(o,k);if(!d||!('value'in d))throw Error('Native furnishing needs own data');return d.value as T;}
function rows<T>(a:T[]):T[]{const n=own<number>(a,'length'),out:T[]=[];for(let i=0;i<n;i++)out.push(own<T>(a,String(i)));return out;}
function sameRows<T>(a:T[],captured:readonly T[]):boolean{return own<number>(a,'length')===captured.length&&captured.every((v,i)=>own(a,String(i))===v);}
function mutable<T>(a:T[]):void {if(!Array.isArray(a)||!Object.isExtensible(a)||!Object.getOwnPropertyDescriptor(a,'length')?.writable)throw Error('Native furnishing needs a mutable raw store');for(let i=0;i<a.length;i++){const d=Object.getOwnPropertyDescriptor(a,String(i));if(!d||!('value'in d)||!d.writable||!d.configurable)throw Error('Native furnishing needs writable indexed data');}}
function unchangedDoodad(d:Doodad):()=>boolean {const keys=Reflect.ownKeys(d),values=keys.map(k=>own(d,k)),pos=own<Doodad['pos']>(d,'pos'),x=own<number>(pos,'x'),y=own<number>(pos,'y');return()=>{const now=Reflect.ownKeys(d);return now.length===keys.length&&keys.every((k,i)=>now[i]===k&&own(d,k)===values[i])&&own(pos,'x')===x&&own(pos,'y')===y;};}
function supported(def:StructureDef):string {
 const allowed=new Set(['id','halfW','halfH','plan','cellSize','legend','courtyardFloorStyle','margin']);
 if(!def.plan?.length||Object.keys(def).some(k=>!allowed.has(k)))throw Error('Native retained furnishing only supports literal courtyard mouth plans');
 for(const row of def.plan)for(const char of row){const cell=legendCell(char,def.legend);if(!cell)continue;
  if(Object.keys(cell).some(k=>k!=='courtyard'&&k!=='doodad'))throw Error('Native retained furnishing cannot remodel doors, actors or topology');
  if(cell.doodad){const d=cell.doodad,r=doodadRuleOf(d.kind),sz=sidezoneOf(d.kind);
   if(Object.keys(d).some(k=>!['kind','radius','rot'].includes(k))||!sz||sz.spanMouth||d.kind==='cave_entrance'||r.blocksMove||r.effect||r.contact||r.spans||r.seedPaired||isDoodadGround(d.kind))throw Error('Native retained furnishing needs an inert registered mouth');
  }
 }
 return serializeNativeAreaData({def,cells:def.plan.map(row=>[...row].map(char=>legendCell(char,def.legend)))});
}

/** Only actor-free literal courtyard/mouth plans can join standing terrain.
 * Native compilation runs on a copied grid. Bodies and existing doors survive. */
export class NativeSidezoneFurnish {
 readonly #installed=new Set<string>();
 readonly #pending=new Map<string,{doodads:Doodad[];structures:NativeAreaSceneGeometry['structures'];mouths:NativeAreaSceneGeometry['caveEntrances'];added:Doodad[];touched:Doodad[];layout:GeneratedLayout;pois:GeneratedLayout['pois'];addedPois:GeneratedLayout['pois'];structure:NativeAreaSceneGeometry['structures'][number];entries:NativeAreaSceneGeometry['caveEntrances']}>();
 constructor(readonly geometry:NativeAreaSceneGeometry){}
 adopt(layout:GeneratedLayout):void {const fixtures=this.geometry.zone.fixtures;for(const p of layout.fixturePlacements??[]){const f=fixtures?.[p.fixtureIndex];if(f&&layout.structures?.some(s=>s.id===p.structureId))this.#installed.add(keyOf(f));}}
 refresh(rng:Rng,layout:GeneratedLayout):void {
  const g=this.geometry,state=own<NativeAreaSceneGeometry['state']>(g,'state'),zone=g.zone,fixtures=zone.fixtures;if(!fixtures)return;
  for(const fixture of rows(fixtures)){
   const spec=allFurnishSpecs().find(s=>s.fixture.structure===fixture.structure&&s.fixture.x===fixture.x&&s.fixture.y===fixture.y);if(!spec)continue;
   const key=keyOf(fixture);if(this.#installed.has(key))continue;
   const pending=this.#pending.get(key);if(pending){if(layout!==pending.layout||own(layout,'pois')!==pending.pois||!pending.addedPois.every(p=>rows(pending.pois).includes(p))||g.doodads!==pending.doodads||g.structures!==pending.structures||g.caveEntrances!==pending.mouths||!pending.added.every(d=>rows(g.doodads).includes(d))||!rows(g.structures).includes(pending.structure)||!pending.entries.every(m=>rows(g.caveEntrances).includes(m)))throw Error('Native furnishing partial installation changed');Reflect.apply(mark,g,[pending.touched]);this.#pending.delete(key);this.#installed.add(key);continue;}
   const registered=STRUCTURES[fixture.structure];if(!registered)throw Error('Native furnished structure is missing');
   const def=structurePlanOf(registered,zone.structurePlans),source=supported(def),specSource=serializeNativeAreaData(spec),fixtureSource=keyOf(fixture);
   const grid=g.walk;if(!(grid instanceof GridWalkField))throw Error('Native retained furnishing requires its existing grid');
   const doodads=g.doodads,structures=g.structures,mouths=g.caveEntrances,original=rows(doodads),oldStructures=rows(structures),oldMouths=rows(mouths),arena=g.arena;
   const pois=layout.pois,oldPois=rows(pois),doodadChecks=original.map(unchangedDoodad);
   const packed=Reflect.apply(pack,grid,[]),gridSource=serializeNativeAreaData(packed),structureSource=serializeNativeAreaData(structures),seed=Reflect.apply(cursor,rng,[]);
   const clone=GridWalkField.unpack(packed),ctx:GenCtx={rng:Rng.fromState(seed),arena:{...arena},entry:{...g.zoneEntry},exits:g.exits.map(e=>({...e.pos})),level:zone.level,seed:zone.seed,zoneId:zone.id,geo:zone.geo,structurePlans:zone.structurePlans,doodads:[...original],structures:structuredClone(copyNativeAreaData(structures)),pois:[],camps:[],breakables:[],npcs:[],garrisons:[],caveSeeds:[],reserved:[],walk:clone};
   raiseStructure(ctx,fixture.structure,vec(fixture.x,fixture.y));
   const added=ctx.doodads.filter(d=>!original.includes(d)),removed=original.filter(d=>!ctx.doodads.includes(d)),placed=ctx.structures?.[oldStructures.length];
   if(!placed||ctx.structures!.length!==oldStructures.length+1||Reflect.apply(cursor,ctx.rng,[])!==seed||ctx.breakables.length||ctx.npcs.length||ctx.garrisons.length||ctx.camps.length||ctx.caveSeeds.length||ctx.pois.length!==1||ctx.folk?.length||placed.doors.length||placed.slots.length||placed.roofs.length||ctx.spawnAt||ctx.storeyLevels||!added.length)throw Error('Native furnishing exceeded its compiled capability');
   if(serializeNativeAreaData(ctx.structures!.slice(0,oldStructures.length))!==structureSource)throw Error('Native furnishing would change a standing structure');
   const inertFields=new Set(['pos','radius','kind','tier','rot','adorn','hitbox','boundR','keep','waive','label']);
   if(removed.some(d=>Object.keys(d).some(k=>!inertFields.has(k)&&own(d,k)!==undefined)||sidezoneOf(d.kind)||isDoodadGround(d.kind)||doodadRuleOf(d.kind).spans))throw Error('Native furnishing would erase live terrain state');
   const paints:{x:number;y:number;kind:string}[]=[];
   for(let y=0;y<grid.rows;y++)for(let x=0;x<grid.cols;x++){const px=(x+.5)*grid.cell,py=(y+.5)*grid.cell,before=grid.kindAt(px,py),after=clone.kindAt(px,py);if(before!==after){if(px<placed.rect.x||px>=placed.rect.x+placed.rect.w||py<placed.rect.y||py>=placed.rect.y+placed.rect.h||after!=='ground'||!grid.isWalkable(px,py))throw Error('Native furnishing would change external or blocked topology');paints.push({x:px,y:py,kind:after});}}
   const entries=added.map(d=>{const sz=sidezoneOf(d.kind);if(!sz||d.kind==='cave_entrance')return null;const pos=nativeLayoutMouthSeat(g,d);return nativeRegisteredSidezoneMouth(g,d,zone.id,sz,pos);});if(entries.some(e=>!e))throw Error('Native furnishing produced a non-mouth doodad');
   // Compile providers and mouth positioning have returned before final checks.
   const finalSource=supported(structurePlanOf(registered,zone.structurePlans));
   const finalSpec=allFurnishSpecs().some(s=>s.fixture===spec.fixture&&serializeNativeAreaData(s)===specSource);
   const finalGrid=serializeNativeAreaData(Reflect.apply(pack,grid,[]));
   // All selected compile providers have completed. These last root/row reads
   // use ordinary own data, so none can replace a previously checked owner.
   if(own(layout,'pois')!==pois||!sameRows(pois,oldPois)||own(g,'state')!==state||own(state,'zone')!==zone||own(zone,'fixtures')!==fixtures||!rows(fixtures).includes(fixture)||keyOf(fixture)!==fixtureSource||own(STRUCTURES,fixture.structure)!==registered||finalSource!==source||!finalSpec||own(g,'walk')!==grid||own(g,'arena')!==arena||own(g,'doodads')!==doodads||own(g,'structures')!==structures||own(g,'caveEntrances')!==mouths||!sameRows(doodads,original)||!doodadChecks.every(check=>check())||!sameRows(structures,oldStructures)||!sameRows(mouths,oldMouths)||serializeNativeAreaData(structures)!==structureSource||finalGrid!==gridSource||Reflect.apply(cursor,rng,[])!==seed)throw Error('Native furnishing source or geometry changed during compilation');
   mutable(doodads);mutable(structures);mutable(mouths);mutable(pois);
   for(const paint of paints)Reflect.apply(fill,grid,[paint.x,paint.y,paint.x,paint.y,paint.kind]);
   for(let i=doodads.length-1;i>=0;i--)if(removed.includes(doodads[i]))Reflect.apply(splice,doodads,[i,1]);
   Reflect.apply(push,doodads,added);Reflect.apply(push,structures,[placed]);
   const installedEntries=entries.filter((e):e is NonNullable<typeof e>=>e!==null);Reflect.apply(push,mouths,installedEntries);Reflect.apply(push,pois,ctx.pois);
   this.#pending.set(key,{doodads,structures,mouths,added,touched:[...removed,...added],layout,pois,addedPois:ctx.pois,structure:placed,entries:installedEntries});
   Reflect.apply(mark,g,[[...removed,...added]]);
   this.#pending.delete(key);this.#installed.add(key);
  }
 }
}
