/** Retained surface gates follow their current event without rebuilding an area.
 * The ordinary native updater still owns eligibility, placement and its effects. */
import type {NativeSceneCampaignFrameClosureHost} from './nativeSceneCampaignFrameClosureHost';
type Host=Pick<NativeSceneCampaignFrameClosureHost,'inCave'|'crusadeRealmContext'|'realmContext'|'crusadePortals'|'demonPortals'|'sim'|'zone'>;
export type NativeRetainedRealmKind='crusade'|'demon';
function own<T>(value:object,key:PropertyKey):T {const d=Object.getOwnPropertyDescriptor(value,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Retained realm gate needs ordinary metadata: '+String(key));return d.value as T;}
function dimensionOf(zone:object):string|undefined {if(!Object.hasOwn(zone,'dimension')){if('dimension' in zone)throw Error('Retained realm dimension must be ordinary');return undefined;}return own<string|undefined>(zone,'dimension');}
/** assertCurrent is the aggregate's existing physical operation entry. It conveys
 * no new actor or factory authority and runs after every selected callback. */
const reconciling=new WeakSet<object>();
export function sceneReconcileRetainedRealmGates(host:Host,kind:NativeRetainedRealmKind,assertCurrent:()=>void):void {
 if(reconciling.has(host))throw Error('Retained realm gate reconciliation cannot reenter');
 reconciling.add(host);try{reconcile(host,kind,assertCurrent);}finally{reconciling.delete(host);}
}
function reconcile(host:Host,kind:NativeRetainedRealmKind,assertCurrent:()=>void):void {
 if(host.inCave||(kind==='crusade'?host.crusadeRealmContext:host.realmContext))return;
 const rows=kind==='crusade'?host.crusadePortals:host.demonPortals;
 if(!Array.isArray(rows))throw Error('Retained realm gate needs its actual collection');
 const length=own<number>(rows,'length');if(!length)return;
 const zone=host.zone,zoneId=own<string>(zone,'id'),dimension=dimensionOf(zone),sim=host.sim,key=kind==='crusade'?'crusadeId':'invId';
 const expected:{row:object;id:string}[]=[];
 for(let i=0;i<length;i++){const row=own<object>(rows,i),id=own<string>(row,key);if(typeof id!=='string')throw Error('Retained realm gate needs its actual event id');expected.push({row,id});}
 const check=()=>{
  assertCurrent();
  if(host.zone!==zone||own(zone,'id')!==zoneId||dimensionOf(zone)!==dimension||host.sim!==sim||(kind==='crusade'?host.crusadePortals:host.demonPortals)!==rows||host.inCave||(kind==='crusade'?host.crusadeRealmContext:host.realmContext))throw Error('Retained realm gate owner changed during selection');
  if(own(rows,'length')!==expected.length)throw Error('Retained realm gate collection changed during selection');
  for(let i=0;i<expected.length;i++)if(own(rows,i)!==expected[i].row||own(expected[i].row,key)!==expected[i].id)throw Error('Retained realm gate identity changed during selection');
 };
 let live:string|undefined;
 if(kind==='crusade'){
  const field=sim.crusadeField,selected=field?.crusadeOn;check();
  const info=selected&&Reflect.apply(selected,field,[zoneId]);check();
  live=info?.isStronghold&&info.sanctumReady?info.crusadeId:undefined;check();
 }else{
  const resolve=sim.demonFieldFor;check();const field=Reflect.apply(resolve,sim,[dimension]);check();
  const selected=field?.invasionOn;check();const info=selected&&Reflect.apply(selected,field,[zoneId]);check();
  const epicenter=info?.isEpicenter,ready=info?.portalReady;check();
  let eligible=!!ready;
  if(epicenter&&!ready){const surge=field?.surge;check();const config=surge&&Reflect.apply(surge,field,[]);check();eligible=config?.portal.openAt==='epicenter';check();}
  live=epicenter&&eligible?info?.id:undefined;check();
 }
 // A selected splice keeps its receiver, throws and completed partial writes.
 // Same-event rows and their coordinates are never replaced or repositioned.
 for(let i=expected.length-1;i>=0;i--)if(expected[i].id!==live){const splice=rows.splice;check();Reflect.apply(splice,rows,[i,1]);expected.splice(i,1);check();}
}
