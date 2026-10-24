/** Retained-only observation of the original injected-fixture pass. No live mutation. */
import {beginNativeGridPaintReceipt,GridWalkField,type PackedWalk} from '../world/gridWalk';
import {STRUCTURES} from '../data/structures';
import {structurePlanOf} from '../engine/structurePlans';
import {serializeNativeAreaData} from './nativeAreaGeometry';
import {Rng} from '../core/rng';
import type {ZoneDef} from '../data/zones';
import type {GenCtx,GeneratedLayout,Doodad,PlacedStructure} from '../engine/levelgen';
import {nativeCrusadeLifetimeCalls,type CrusadeField,type CrusadeInfo} from '../packages/overlays/crusade';
const pack=GridWalkField.prototype.pack,snapshot=Rng.prototype.snapshot;
export function nativeCrusadePlanSignature(info:CrusadeInfo,plans:GenCtx['structurePlans']):string {const ids=[info.structure,info.cityFill?.square,...(info.cityFill?.structures??[]).map(s=>s.structure)].filter((id):id is string=>!!id);return serializeNativeAreaData({structure:info.structure,cityFill:info.cityFill,plans:ids.map(id=>STRUCTURES[id]?structurePlanOf(STRUCTURES[id],plans):null)});}
export interface NativeCrusadeTerrainState {
 readonly walk:PackedWalk|null;readonly doodads:readonly Doodad[];readonly structures:readonly PlacedStructure[];
 readonly breakables:readonly GeneratedLayout['breakables'][number][];readonly npcs:readonly GeneratedLayout['npcs'][number][];
 readonly folk:readonly NonNullable<GeneratedLayout['folk']>[number][];readonly garrisons:readonly GeneratedLayout['garrisons'][number][];readonly pois:readonly GeneratedLayout['pois'][number][];
}
export interface NativeCrusadeLayoutRecord {readonly field:CrusadeField;readonly epoch:object;readonly id:string;readonly tier:number;readonly structure:string;readonly plan:string;readonly laterPaints?:readonly number[];readonly before:NativeCrusadeTerrainState;readonly after:NativeCrusadeTerrainState}
export function captureNativeCrusadeTerrain(ctx:GenCtx):NativeCrusadeTerrainState {
 if(ctx.walk&&!(ctx.walk instanceof GridWalkField))throw Error('Crusade works need native grid terrain');
 return Object.freeze({walk:ctx.walk?Reflect.apply(pack,ctx.walk,[]):null,doodads:Object.freeze([...ctx.doodads]),structures:Object.freeze([...(ctx.structures??[])]),breakables:Object.freeze([...ctx.breakables]),npcs:Object.freeze([...ctx.npcs]),folk:Object.freeze([...(ctx.folk??[])]),garrisons:Object.freeze([...ctx.garrisons]),pois:Object.freeze([...ctx.pois])});
}
export class NativeCrusadeLayoutCapture {
 constructor(){Object.defineProperty(this,'pass',{writable:false,configurable:false});}
 #selected:{field:CrusadeField;epoch:object;id:string;tier:number;structure:string|null|undefined;plan:string}|undefined;
 #selection:{field:CrusadeField|null|undefined;zone:ZoneDef}|undefined;
 #record:NativeCrusadeLayoutRecord|undefined;#seed:number|undefined;#receipt:ReturnType<typeof beginNativeGridPaintReceipt>|undefined;
 reset():void {this.#receipt?.finish();this.#receipt=undefined;this.#selected=undefined;this.#selection=undefined;this.#record=undefined;this.#seed=undefined;}
 select(field:CrusadeField|null|undefined,info:CrusadeInfo|null|undefined,zone:ZoneDef):void {this.#selection={field,zone};if(info){if(!field)throw Error('Crusade layout lost its selected field');const epoch=Reflect.apply(nativeCrusadeLifetimeCalls.epoch,field,[info.crusadeId]);if(!epoch)throw Error('Crusade layout lost its actual event');this.#selected={field,epoch,id:info.crusadeId,tier:info.tier,structure:info.structure,plan:nativeCrusadePlanSignature(info,zone.structurePlans)};}this.#assertSelection(field);}
 #assertSelection(field:CrusadeField|null|undefined):void {const e=this.#selection;if(!e)return;if(field!==e.field)throw Error('Crusade layout field changed');const live=field?Reflect.apply(nativeCrusadeLifetimeCalls.query,field,[e.zone.id]):undefined,s=this.#selected;if(!s){if(live)throw Error('Crusade event appeared during native layout');return;}if(!live||Reflect.apply(nativeCrusadeLifetimeCalls.epoch,s.field,[s.id])!==s.epoch||live.crusadeId!==s.id||live.tier!==s.tier||live.structure!==s.structure||nativeCrusadePlanSignature(live,e.zone.structurePlans)!==s.plan)throw Error('Crusade selected plan changed during native layout');}
 readonly pass=(ctx:GenCtx,run:()=>void):void=>{this.#seed=Reflect.apply(snapshot,ctx.rng,[]);const selected=this.#selected;this.#assertSelection(this.#selection?.field);if(!selected?.structure){run();this.#assertSelection(this.#selection?.field);return;}const before=captureNativeCrusadeTerrain(ctx);run();this.#assertSelection(this.#selection?.field);const after=captureNativeCrusadeTerrain(ctx);this.#record=Object.freeze({...selected,structure:selected.structure,plan:selected.plan,before,after});this.#receipt=beginNativeGridPaintReceipt();};
 complete(field:CrusadeField|null|undefined,layout?:GeneratedLayout):void {const finalGrid=layout?.walk instanceof GridWalkField?layout.walk:null;const paints=this.#receipt?.finish();this.#receipt=undefined;if(this.#record&&finalGrid)this.#record=Object.freeze({...this.#record,laterPaints:Object.freeze([...([...(paints?.get(finalGrid)??[])].filter(i=>i%finalGrid.cols<(this.#record!.after.walk?.cols??finalGrid.cols)&&Math.floor(i/finalGrid.cols)<(this.#record!.after.walk?.rows??finalGrid.rows)).map(i=>Math.floor(i/finalGrid.cols)*(this.#record!.after.walk?.cols??finalGrid.cols)+i%finalGrid.cols))])});this.#assertSelection(field);}
 read():{record:NativeCrusadeLayoutRecord|undefined;seed:number|undefined}{return Object.freeze({record:this.#record,seed:this.#seed});}
}

export const nativeCrusadeCaptureCalls=Object.freeze({reset:NativeCrusadeLayoutCapture.prototype.reset,select:NativeCrusadeLayoutCapture.prototype.select,complete:NativeCrusadeLayoutCapture.prototype.complete,read:NativeCrusadeLayoutCapture.prototype.read});
