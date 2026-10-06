import assert from 'node:assert/strict';
import {makeSimWorld}from'../src/sim/arena';
import type{Actor}from'../src/engine/actor';
import{MassDormancy}from'../src/worldmass/dormancy';
import{stageNativeCohort,commitNativeCohort,hydrateNativeCohort}from'../src/worldmass/nativePaging';
import type{NativePageStorage,NativePageRef,NativePageRoot,NativeRootRead}from'../src/meta/browserNativePages';
const policy={source:'native-page-probe',wakeRadius:1000,sleepRadius:2200,quietSeconds:8},frame={dimension:'surface',cx:'0',cy:'0'};
class MemoryPages implements NativePageStorage{
 pages=new Map<string,string>();root:NativePageRoot|null=null;afterPublish?:()=>void;fail=false;
 async writePage(run:string,page:string,body:string){const revision=String(this.pages.size+1),key=JSON.stringify([run,page,revision]);this.pages.set(key,body);return{run,page,revision,key,digest:'0'.repeat(64),bytes:body.length};}
 async readPage(ref:NativePageRef){const body=this.pages.get(ref.key);if(!body)throw Error('Missing page');return body;}
 async publish(slot:string,run:string,body:string|null,pages:readonly NativePageRef[],expectedRevision:number){if(this.fail)throw Error('Root failed');assert.equal(this.root?.revision??0,expectedRevision);
  const root:NativePageRoot={schema:1,slot,run,body,pages:[...pages],revision:expectedRevision+1,digest:'0'.repeat(64)};this.root=root;this.afterPublish?.();return root;}
 async readRoot():Promise<NativeRootRead>{return this.root?{status:'value',headRevision:this.root.revision,root:this.root,recovered:false}:{status:'missing',headRevision:0};}
 async flush(){}
}
const w=makeSimWorld('warrior',723),owned=new Map<string,Actor>(),dormancy=new MassDormancy(policy);w.time=100;w.player.pos={x:20000,y:0};
for(let i=0;i<3;i++){const a=w.createMonster('gnoll_prowler',3,'enemy');a.pos={x:i*70,y:40};a.aiAnchor={...a.pos};a.fromZoneGen=true;a.life*=.5;a.squadId=91;owned.set('body/'+i,a);w.actors.push(a);}
dormancy.update(w,owned);assert.ok([...owned.values()].every(a=>dormancy.isSleeping(a)));
const describe=(id:string,a:Actor)=>({id,monster:a.defId!,level:a.level,provenance:{birth:{seed:123},claim:'site-guardian'}});
assert.throws(()=>stageNativeCohort('run','page',frame,960,w,owned,['body/0'],dormancy,describe),/dependency-closed/);
const ids=[...owned.keys()],lease=stageNativeCohort('run','page',frame,960,w,owned,ids,dormancy,describe);
const foreign=w.createMonster('gnoll_prowler',3,'enemy');foreign.aiTargetId=owned.get('body/0')!.id;w.actors.push(foreign);
assert.equal(lease.revalidate(),false,'outside target cannot be dropped');w.actors=w.actors.filter(a=>a!==foreign);
const store=new MemoryPages();store.fail=true;let releases=0;
await assert.rejects(commitNativeCohort(store,lease,{slot:'slot',run:'run',body:'root',pages:[],expectedRevision:0},()=>{releases++;}),/Root failed/);
assert.equal(owned.size,3);assert.equal(releases,0);
store.fail=false;store.afterPublish=()=>{owned.get('body/0')!.life-=1;};
const stale=await commitNativeCohort(store,lease,{slot:'slot',run:'run',body:'root',pages:[],expectedRevision:0},()=>{releases++;});assert.equal(stale.released,false);assert.equal(releases,0);
console.log('PASS whole-native-squad admission, foreign targeting veto, failed-root retention and post-commit native mutation refuses release');

store.afterPublish=undefined;const fresh=stageNativeCohort('run','page',frame,960,w,owned,ids,dormancy,describe);
const life=[...owned.values()].map(a=>a.life);
const committed=await commitNativeCohort(store,fresh,{slot:'slot',run:'run',body:'root2',pages:[],expectedRevision:1},released=>{for(const id of released)owned.delete(id);});assert.ok(committed.released);assert.equal(owned.size,0);
let factories=0;
const hydrated=await hydrateNativeCohort(store,committed.page,frame,960,w.player,{create:d=>{factories++;return w.createMonster(d.monster,d.level,'enemy');},groups:(_ids,actors)=>{for(const a of actors.values())a.squadId=999;}});
assert.deepEqual([...hydrated.actors.values()].map(a=>a.life),life);assert.ok([...hydrated.actors.values()].every(a=>a.squadId===999&&!w.actors.includes(a)));
assert.ok(hydrated.page.bodies.every(b=>(b.provenance as {birth:{seed:number}}).birth.seed===123));
const count=factories;await assert.rejects(hydrateNativeCohort(store,{...committed.page,key:'missing'},frame,960,w.player,{create:d=>{factories++;return w.createMonster(d.monster,d.level,'enemy');},groups:()=>{}}),/Missing/);assert.equal(factories,count);
await assert.rejects(hydrateNativeCohort(store,committed.page,{...frame,cx:'1'},960,w.player,{create:d=>{factories++;return w.createMonster(d.monster,d.level,'enemy');},groups:()=>{}}),/incompatible/);assert.equal(factories,count);
console.log('PASS exact wounds/birth metadata and collision-free squad remap hydrate off-world; missing pages and unhandled frame changes refuse before factories');
