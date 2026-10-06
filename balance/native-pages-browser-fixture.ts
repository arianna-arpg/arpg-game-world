import { makeSimWorld } from '../src/sim/arena';
import { MassDormancy } from '../src/worldmass/dormancy';
import { stageNativeCohort,commitNativeCohort,hydrateNativeCohort } from '../src/worldmass/nativePaging';
import { BrowserNativePages,type NativePageRef } from '../src/meta/browserNativePages';
import type { Actor } from '../src/engine/actor';
const ok=(v:unknown,s:string)=>{if(!v)throw Error(s);};
const policy={source:'browser-page-probe',wakeRadius:1000,sleepRadius:2200,quietSeconds:8};
const frame={dimension:'surface',cx:'0',cy:'0'},run='browser-native-pages',slot='standalone-foundation';
const world=makeSimWorld('warrior',72921),store=new BrowserNativePages('native-pages-proof');
const refs:NativePageRef[]=[],weak:WeakRef<Actor>[]=[],expected=new Map<string,{life:number;mana:number;entropy:number}>();
let revision=0,trips=0,peakOwned=0,factories=0;
function cohort(page:string){
 const owned=new Map<string,Actor>(),dormancy=new MassDormancy(policy);world.time+=20;world.player.pos={x:trips*3200+10000,y:0};
 for(let i=0;i<6;i++){const a=world.createMonster('gnoll_prowler',3,'enemy'),id=page+'/'+i;a.fromZoneGen=true;a.pos={x:trips*3200+i*25,y:30};a.aiAnchor={...a.pos};a.fillResources();a.life*=.4+i*.06;a.mana*=.3;a.evadeEntropy=.39;
  owned.set(id,a);world.actors.push(a);weak.push(new WeakRef(a));expected.set(id,{life:a.life,mana:a.mana,entropy:a.evadeEntropy});}
 dormancy.update(world,owned);ok([...owned.values()].every(a=>dormancy.isSleeping(a)),'actual natives must first settle under native dormancy');peakOwned=Math.max(peakOwned,owned.size);
 const lease=stageNativeCohort(run,page,frame,960,world,owned,[...owned.keys()],dormancy,(id,a)=>({id,monster:a.defId!,level:a.level,provenance:{birth:{seed:trips*100+iHash(id)},claim:'native-guardian',frame}}));
 return {owned,dormancy,lease};
}
const iHash=(s:string)=>s.length;
export async function travel(count:number){for(let i=0;i<count;i++){
 const page='country/'+trips,{owned,lease}=cohort(page);
 const result=await commitNativeCohort(store,lease,{slot,run,body:JSON.stringify({trip:trips,claims:expected.size}),pages:refs,expectedRevision:revision},ids=>{for(const id of ids)owned.delete(id);});
 ok(result.released&&owned.size===0,'only committed exact cohort may release');revision=result.root.revision;refs.push(result.page);trips++;
 }await store.flush();return stats();}
export function stats(){return {trips,peakOwned,weakAlive:weak.filter(w=>w.deref()).length,pages:refs.length,worldActors:world.actors.length,
  cachedBodyBytes:store.stats.cachedBodyBytes,pending:store.stats.pending,heap:(performance as Performance&{memory?:{usedJSHeapSize:number}}).memory?.usedJSHeapSize??0};}
export async function revisit(){let restored=0;
 for(const ref of refs){const result=await hydrateNativeCohort(store,ref,frame,960,world.player,{create:d=>{factories++;return world.createMonster(d.monster,d.level,'enemy');},groups:()=>{}});
  for(const [id,a]of result.actors){const e=expected.get(id)!;ok(a.life===e.life&&a.mana===e.mana&&a.evadeEntropy===e.entropy,'exact native resources/wounds changed');ok(typeof a.statusRelay==='function'&&a.since instanceof Float64Array,'native behavior or typed clocks lost');restored++;}
  result.actors.clear();
 }return {restored,factories,root:await store.readRoot(slot)};}
async function raw(){return new Promise<IDBDatabase>((resolve,reject)=>{const q=indexedDB.open('native-pages-proof',1);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});}
export async function faults(){
 const rootBefore=await store.readRoot(slot);ok(rootBefore.status==='value','root exists');const pageCount=refs.length;
 let release=0;const bad=cohort('failed-write');
 const add=IDBObjectStore.prototype.add;IDBObjectStore.prototype.add=function(...args:Parameters<IDBObjectStore['add']>){if(this.name==='pages')throw new DOMException('test quota','QuotaExceededError');return add.apply(this,args);};
 let failed=false;try{await commitNativeCohort(store,bad.lease,{slot,run,body:'failed',pages:refs,expectedRevision:revision},()=>{release++;});}catch{failed=true;}finally{IDBObjectStore.prototype.add=add;}
 ok(failed&&release===0&&bad.owned.size===6,'failed page write must retain complete live natives');
 const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args:Parameters<IDBObjectStore['put']>){if(this.name==='roots')throw new DOMException('test root abort','QuotaExceededError');return put.apply(this,args);};
 failed=false;try{await commitNativeCohort(store,bad.lease,{slot,run,body:'failed-root',pages:refs,expectedRevision:revision},()=>{release++;});}catch{failed=true;}finally{IDBObjectStore.prototype.put=put;}
 ok(failed&&release===0&&bad.owned.size===6,'root abort retains actors after page staged');
 const rootAfter=await store.readRoot(slot);ok(rootAfter.status==='value'&&rootAfter.headRevision===revision,'failed roots leave prior commit authoritative');
 const db=await raw();const alter=(name:string,key:string,fn:(value:any,s:IDBObjectStore)=>void)=>new Promise<void>((resolve,reject)=>{const tx=db.transaction(name,'readwrite'),s=tx.objectStore(name),q=s.get(key);q.onsuccess=()=>fn(q.result,s);tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);});
 await alter('roots',slot,(row,s)=>{row.current.body='torn newest root';s.put(row);});
 const recovered=await store.readRoot(slot);ok(recovered.status==='value'&&recovered.recovered,'previous complete root recovered');
 if(recovered.status==='value')for(const ref of recovered.root.pages)await store.readPage(ref);
 const missing=refs[0];await alter('pages',missing.key,(_row,s)=>s.delete(missing.key));const beforeFactory=factories;
 failed=false;try{await hydrateNativeCohort(store,missing,frame,960,world.player,{create:d=>{factories++;return world.createMonster(d.monster,d.level,'enemy');},groups:()=>{}});}catch{failed=true;}
 ok(failed&&factories===beforeFactory,'missing page must refuse before factory replay');
 failed=false;try{await store.publish(slot,run,'absent revision',refs,revision);}catch{failed=true;}ok(failed,'root cannot publish absent page');
 await store.publish(slot,run,null,[],revision);const deleted=await store.readRoot(slot);ok(deleted.status==='deleted','tombstone authoritative');
 await alter('roots',slot,(row,s)=>{row.current.digest='damaged';s.put(row);});ok((await store.readRoot(slot)).status==='corrupt','damaged tombstone cannot resurrect prior root');db.close();
 return {failedWritesRetained:bad.owned.size,releaseCalls:release,missingFactories:factories-beforeFactory,pageCount};
}
