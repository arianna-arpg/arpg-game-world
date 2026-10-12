/** Per-area authored seat bookkeeping. A row records a real insertion; it does not grant combat authority. */
import type {Actor} from '../engine/actor';
import type {GeneratedLayout} from '../engine/levelgen';
import type {NativeTownBodyKind,NativeTownBodyRecorder} from '../engine/nativeTownBody';
import {START_ZONE} from '../data/zones';
import type {NativeSceneCensus} from './nativeAreaScenePopulation';
export interface NativeTownSeat {key:string;kind:NativeTownBodyKind;row:object|string;pos:{x:number;y:number};tier:number}
export class NativeTownBodyLedger {
 readonly bodies=new Map<string,Actor>();
 readonly seats=new Map<string,NativeTownSeat>();
 layout:GeneratedLayout|undefined;
 /** Retain the safe-entry obligation across a failed terrain/body reconciliation. */
 pendingSafeEntry=false;
 trainingHost:import('../engine/trainingYard').NativeTrainingYardHost|undefined;
 representative:Actor|undefined;
 #keys=new WeakMap<object,string>();
 constructor(readonly scene:NativeSceneCensus){}
 readonly record:NativeTownBodyRecorder=(kind,row,body)=>{if(this.scene.zone.id!==START_ZONE)return;const key=typeof row==='string'?kind+':'+row:this.#keys.get(row);if(!key)throw Error('Native town insertion has no selected authored seat');const prior=this.bodies.get(key);if(prior&&prior!==body&&!prior.dead&&this.scene.actors.includes(prior))throw Error('Native town seat already owns another body');this.bodies.set(key,body);};
 adopt(layout:GeneratedLayout):void{
  this.layout=layout;this.seats.clear();this.#keys=new WeakMap();const ordinal=new Map<string,number>(),structures=new Map<string,string>();
  for(const row of layout.structures??[]){const n=ordinal.get(row.defId)??0;ordinal.set(row.defId,n+1);structures.set(row.id,row.defId+':'+n);}
  const owner=(pos:{x:number;y:number})=>(layout.structures??[]).find(s=>pos.x>=s.rect.x&&pos.x<=s.rect.x+s.rect.w&&pos.y>=s.rect.y&&pos.y<=s.rect.y+s.rect.h);
  const counts=new Map<string,number>();
  const add=(kind:NativeTownBodyKind,row:object,pos:{x:number;y:number},base:string,tier=0)=>{const n=counts.get(base)??0;counts.set(base,n+1);const key=kind+':'+base+':'+n;this.#keys.set(row,key);this.seats.set(key,{key,kind,row,pos:{...pos},tier});};
  for(const n of layout.npcs)add('plan',n,n.pos,(structures.get(n.sid??'')??'outside')+':'+n.id,n.tier??0);
  for(const f of layout.folk??[])add('folk',f,f.pos,(structures.get(f.sid??'')??'outside')+':'+f.key.replace(/^.*:folk/,''),f.tier??0);
  for(const b of layout.breakables){const st=owner(b.pos);add('furniture',b,b.pos,(st?structures.get(st.id):'outside')+':'+b.id);}
  for(const d of layout.doodads)if(d.door){const sid=d.door.id.split('/d')[0];add('door',d,d.pos,(structures.get(sid)??sid)+':'+d.door.id.split('/d')[1]);}
 }
 missing<T extends object>(rows:readonly T[]):T[]{return rows.filter(row=>{const key=this.#keys.get(row);return key!==undefined&&!this.bodies.has(key);});}
}
