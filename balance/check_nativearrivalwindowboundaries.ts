/** Additive selected-arrival boundaries. All effects use real retained travel.
 * This is separate from the unchanged matched normal diagnostic and historical probes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type {Actor} from '../src/engine/actor';
import {bootSimEngine} from '../src/sim/arena';
import {Rng,withRngRandom} from '../src/core/rng';
import {VendettaField} from '../src/packages/overlays/vendetta';
import {claimNativeWarlordArrival,claimNativeVendettaArrival,selectedNativeVendettaArrival} from '../src/worldmass/nativeAreaSceneTransitionCoordinator';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat} from './probe_nativecombatcycle';

const PARENT='37fbfb25edb8013470457fb2d0278bfce92d5db4',SEED=19931,FIXED_NOW=1792123200000;
const LEAVES=['warlord','crusade','verminfall','vendetta'] as const;
type Leaf=typeof LEAVES[number];
type Native=ReturnType<typeof birthActualNativeArea>;
type Owner={arrive():void};
const output=process.argv[2]??path.join(fs.mkdtempSync(path.join(os.tmpdir(),'native-arrival-boundaries-')),'result.json');
assert(path.isAbsolute(output),'Receipt must have an absent absolute path');
const outputFd=fs.openSync(output,'wx');
const copy=(value:unknown):any=>JSON.parse(JSON.stringify(value));
function errorInfo(error:unknown){return error instanceof Error?{name:error.name,message:error.message,stack:error.stack??null}:{name:typeof error,message:String(error),stack:null};}
function own<T>(object:object,key:PropertyKey):T {const d=Object.getOwnPropertyDescriptor(object,key);assert(d&&Object.hasOwn(d,'value'),'Expected own data '+String(key));return d.value as T;}
const report:any={kind:'NATIVE-FOUR-LEAF-ARRIVAL-BOUNDARIES',sourceParent:PARENT,reportPath:output,complete:false,seed:SEED,fixedDateNow:FIXED_NOW,courses:[],cleanupErrors:[],
 scope:'18 additive adversarial callback courses using genuine retained transfers. No full gameplay frames, fake private receipts, forced ambush specs, restored RNG, or production implementation in this entry. The unchanged three-case diagnostic supplies the separate matched normal comparison.'};

function sessionFor(n:Native,other:ReturnType<typeof mintAdditionalNativeArea>,rng:Rng,row:any){
 const w=n.writer,c=n.coordinator,a=n.definition.id,b=other.id;
 const travel=(id:string)=>{const from=c.published;c.runFrom(from,()=>c.loadZone(id,w.zone.id));};
 travel(b);travel(a);const area=c.published,combat=area.combat,scene=combat.scene,registry=area.assembly.input.registry,birth=registry.input.birth,state=birth.input.state,marker=state.materializedWrits;
 const vf=w.sim.vendettaField;assert(vf,'Actual native Vendetta field');
 const live=()=>combat.crusadeLifetime.materializeLiveZoneEvents();
 const ids=new Set(vf.writsView().map(v=>v.id));assert(vf.devIgnite(w.devOverlayView(),a));const fresh=vf.writsView().filter(v=>!ids.has(v.id));assert.equal(fresh.length,1);const writ=fresh[0];
 const cohort=()=>scene.actors.filter(body=>!body.dead&&body.eventKey===writ.id&&(body.tag==='vendetta_hunter'||body.tag==='vendetta_warrant'));
 let initialLiveCalls=0;while(!cohort().length&&initialLiveCalls<100){live();initialLiveCalls++;}assert(cohort().length>0,'At most100 actual first registry attempts');assert(marker.has(a));
 const old=[...cohort()];for(const body of old)assert.equal(n.authority.require(body).combat,combat);
 travel(b);vf.update(55,w.devOverlayView());assert(vf.writsView().some(v=>v.id===writ.id));assert.equal((vf.snapshot() as {writs:{id:string;cooldownLeft:number}[]}).writs.find(v=>v.id===writ.id)!.cooldownLeft,0);assert(marker.has(a));assert.equal(w.seats.filter(seat=>scene.actors.includes(seat.actor)).length,0);
 const owners:Record<Leaf,Owner>={warlord:combat.warlordArrival,crusade:combat.crusadeLifetime,verminfall:combat.verminfallLifetime,vendetta:combat.vendettaLifetime};
 const calls=Object.fromEntries(LEAVES.map(leaf=>[leaf,owners[leaf].arrive])) as Record<Leaf,()=>void>;
 const restores:(()=>void)[]=[],transcript:any[]=[];let registryCalls=0;
 const hook=(object:object,key:PropertyKey,descriptor:PropertyDescriptor)=>{const before=Object.getOwnPropertyDescriptor(object,key);let active=true;Object.defineProperty(object,key,descriptor);const restore=()=>{if(!active)return;active=false;if(before)Object.defineProperty(object,key,before);else assert(Reflect.deleteProperty(object,key));};restores.push(restore);return restore;};
 const registryCall=registry.materializeLiveZoneEvents;
 hook(registry,'materializeLiveZoneEvents',{configurable:true,writable:true,value:function(this:typeof registry){registryCalls++;return Reflect.apply(registryCall,this,[]);}});
 const refs=new Map<Actor,number>();let seq=0;const ref=(body:Actor)=>{let id=refs.get(body);if(id===undefined){id=++seq;refs.set(body,id);}return id;};
 const facts=()=>({globalRng:rng.snapshot(),vendetta:{snapshot:copy(Reflect.apply(VendettaField.prototype.snapshot,vf,[])),rng:own<Rng>(vf,'rng').snapshot(),acc:own<number>(vf,'acc')},crusade:copy(w.sim.crusadeField?.snapshot()??null),verminfall:copy(w.sim.verminfallField?.snapshot()??null),warlords:copy([...w.sim.warlord.lords]),faction:copy(w.sim.faction.snapshot()),markers:[[...state.materializedCrusades],[...state.materializedInfestation],[...marker]],ledger:copy(w.ledger),xp:w.localSeat.meta.xp,kills:w.kills,worldTime:w.time,texts:copy(area.assembly.objectiveController.input.state.texts),
  actors:scene.actors.map(body=>({ref:ref(body),id:body.id,tag:body.tag??null,eventKey:body.eventKey??null,life:body.life,maxLife:body.maxLife(),dead:body.dead,pos:copy(body.pos),owner:n.authority.require(body).combat.scene.zone.id})),physicalSeats:w.seats.filter(seat=>scene.actors.includes(seat.actor)).map(seat=>seat.id)});
 const entry=(leaf:Leaf)=>{transcript.push({kind:'enter',leaf});try{const result=Reflect.apply(calls[leaf],owners[leaf],[]);transcript.push({kind:'return',leaf});return result;}catch(error){transcript.push({kind:'throw',leaf,error:errorInfo(error)});throw error;}};
 const observeLeaves=()=>{for(const leaf of LEAVES)hook(owners[leaf],'arrive',{configurable:true,get(){transcript.push({kind:'select',leaf});return()=>entry(leaf);}});const bounty=combat.arriveBounties;hook(combat,'arriveBounties',{configurable:true,writable:true,value:function(this:typeof combat){transcript.push({kind:'bounty'});return Reflect.apply(bounty,this,[]);}});};
 const assertTarget=()=>{assert.equal(c.current,area);assert.equal(c.published,area);assert.equal(scene.player,w.player);assert.equal(n.authority.require(w.player).combat,combat);assert(scene.actors.includes(w.player));};
 const bareRefusal=()=>{for(const leaf of LEAVES)expectRefusal(()=>Reflect.apply(calls[leaf],owners[leaf],[]));};
 row.staging={initialLiveCalls,writ:writ.id,oldCohortSize:old.length,awayUpdate:55};row.transcript=transcript;row.setup=facts();
 return{n,w,c,a,b,area,combat,scene,registry,birth,state,marker,vf,writ,cohort,old,travel,live,owners,calls,hook,restores,transcript,entry,observeLeaves,facts,assertTarget,bareRefusal,registryCount:()=>registryCalls,row};
}
type Session=ReturnType<typeof sessionFor>;
function expectRefusal(run:()=>unknown):string {let caught:unknown;try{run();}catch(error){caught=error;}assert(caught instanceof Error&&caught.name==='Error','A synchronous native refusal is required, not assertion/type/stack failure');assert.match(caught.message,/(selected (?:unclaimed arrival invocation|genuine revisit)|arrival (?:cannot reenter|leaf is selected for)|live registry cannot reenter)/);return caught.message;}
function refuseAll(s:Session,window:string){const actors=s.scene.actors,bodies=[...actors],before=s.facts(),registry=s.registryCount(),errors:Record<string,string>={};
 for(const leaf of LEAVES){errors[leaf]=expectRefusal(()=>Reflect.apply(s.calls[leaf],s.owners[leaf],[]));assert.equal(s.scene.actors,actors);assert.deepEqual(s.scene.actors,bodies);assert.deepEqual(s.facts(),before,'No effect from '+window+' '+leaf);}
 errors.crusadeLive=expectRefusal(()=>s.combat.crusadeLifetime.materializeLiveZoneEvents());errors.verminfallLive=expectRefusal(()=>s.combat.verminfallLifetime.materializeLiveZoneEvents());assert.equal(s.registryCount(),registry,'Refuse before actual registry entry');assert.equal(s.scene.actors,actors);assert.deepEqual(s.scene.actors,bodies);assert.deepEqual(s.facts(),before);s.row.refusals??=[];s.row.refusals.push({window,errors,before,after:s.facts()});}
function assertOrdered(s:Session){assert.deepEqual(s.transcript.filter(x=>x.kind==='enter').map(x=>x.leaf),LEAVES);assert.equal(s.transcript.filter(x=>x.kind==='bounty').length,1);}
function noLater(s:Session,leaf:Leaf){const index=LEAVES.indexOf(leaf);assert.deepEqual(s.transcript.filter(x=>x.kind==='enter').map(x=>x.leaf),LEAVES.slice(0,index+1));assert.equal(s.transcript.filter(x=>x.kind==='bounty').length,0);for(const later of LEAVES.slice(index+1))assert(!s.transcript.some(x=>x.leaf===later),'No selection of later '+later);}
function retryGenuine(s:Session){s.row.initialTransition=copy(s.transcript);s.transcript.length=0;s.travel(s.b);s.row.retryDeparture=copy(s.transcript);s.transcript.length=0;s.travel(s.a);s.assertTarget();assertOrdered(s);s.c.assertIdleFrame();s.bareRefusal();s.row.retryArrival=copy(s.transcript);}
function course(name:string,run:(s:Session)=>unknown){const row:any={name,complete:false,cleanupErrors:[]};report.courses.push(row);let primary:unknown,failed=false,n:Native|undefined,s:Session|undefined;
 try{const rng=new Rng(SEED);withRngRandom(rng,()=>{localStorage.clear();const setup=nativeCampaignFixture(SEED);setup.writer.player.level=15;setup.writer.player.invulnerable=true;const other=mintAdditionalNativeArea(setup);refuseWorldCombat([setup.writer],drivers=>{row.worldDrivers=drivers;n=birthActualNativeArea(setup);s=sessionFor(n,other,rng,row);row.result=run(s);assert.deepEqual(drivers,[]);row.complete=true;});});}
 catch(error){failed=true;primary=error;row.error=errorInfo(error);}
 finally{if(s)while(s.restores.length)try{s.restores.pop()!();}catch(error){row.cleanupErrors.push(errorInfo(error));if(!failed){failed=true;primary=error;}}if(n)try{n.coordinator.retire();}catch(error){row.cleanupErrors.push(errorInfo(error));if(!failed){failed=true;primary=error;}}}
 if(failed)throw primary;console.log('PASS '+name);
}

const originalNow=Date.now;let primary:unknown,failed=false;
try{Date.now=()=>FIXED_NOW;bootSimEngine();
course('warlord first readiness refuses all entries before its getter is selected',s=>{
 s.observeLeaves();const harbor=s.combat.harborServices,harborCall=harbor.arrive,authority=s.n.authority,physical=authority.assertFinalPhysical;
 let armed=false,injected=false,inside=false,harborReturns=0,selections=0;const windows:any[]=[];s.row.validationWindows=windows;
 s.hook(harbor,'arrive',{configurable:true,writable:true,value:function(this:typeof harbor){const result=Reflect.apply(harborCall,this,[]);harborReturns++;armed=true;return result;}});
 s.hook(s.owners.warlord,'arrive',{configurable:true,get(){selections++;assert(injected,'Warlord first readiness precedes callable selection');s.transcript.push({kind:'select',leaf:'warlord'});return()=>s.entry('warlord');}});
 s.hook(authority,'assertFinalPhysical',{configurable:true,writable:true,value:function(this:typeof authority,...args:Parameters<typeof physical>){assert(!inside,'Stage inspection must refuse before recursive validation');if(armed&&!injected){inside=true;try{
  assert.equal(harborReturns,1);assert.equal(selections,0);assert.equal(s.transcript.filter(x=>x.kind==='enter').length,0);const before=s.facts();let refusal:unknown;try{selectedNativeVendettaArrival(s.c,s.combat);}catch(error){refusal=error;}
  assert(refusal instanceof Error);assert.equal(refusal.name,'Error');assert.equal(refusal.message,'Native arrival leaf is selected for Warlord');assert.deepEqual(s.facts(),before);windows.push({stage:'Warlord',beforeGetter:true,refusal:refusal.message});s.assertTarget();refuseAll(s,'Warlord first pre-getter readiness');injected=true;
 }finally{inside=false;}}return Reflect.apply(physical,this,args);}});
 s.travel(s.a);assert(injected);assert.equal(selections,1);assert.equal(harborReturns,1);assertOrdered(s);assert.equal(s.registryCount(),0);s.c.assertIdleFrame();s.bareRefusal();return{injectedBeforeGetter:true,selections,harborReturns,refusals:6,windows};
});
course('vendetta first readiness is distinguished from verminfall closing validation',s=>{
 s.observeLeaves();const authority=s.n.authority,physical=authority.assertFinalPhysical;let armed=false,injected=false,inside=false,verminfallReturns=0,priorValidations=0,selections=0;const windows:any[]=[];s.row.validationWindows=windows;
 s.hook(s.owners.verminfall,'arrive',{configurable:true,writable:true,value:function(){const result=s.entry('verminfall');verminfallReturns++;armed=true;return result;}});
 s.hook(s.owners.vendetta,'arrive',{configurable:true,get(){selections++;assert(injected,'Vendetta initial validation precedes its callable selection');s.transcript.push({kind:'select',leaf:'vendetta'});return()=>s.entry('vendetta');}});
 s.hook(authority,'assertFinalPhysical',{configurable:true,writable:true,value:function(this:typeof authority,...args:Parameters<typeof physical>){assert(!inside,'Non-granting stage inspection must refuse before recursive validation');if(armed&&!injected){inside=true;try{
  assert.equal(verminfallReturns,1);assert.equal(selections,0);assert.equal(s.transcript.filter(x=>x.kind==='enter').length,3);const before=s.facts();let refusal:unknown;try{selectedNativeVendettaArrival(s.c,s.combat);}catch(error){refusal=error;}
  assert(refusal instanceof Error);assert.equal(refusal.name,'Error');
  if(refusal.message==='Native arrival leaf is selected for Verminfall'){
   priorValidations++;assert.equal(expectRefusal(()=>claimNativeVendettaArrival(s.c,s.combat,s.combat.vendettaLifetime)),'Native arrival leaf is selected for Verminfall');windows.push({stage:'Verminfall',afterGenuineReturn:true,beforeVendettaGetter:true,refusal:refusal.message});
  }else{
   assert.equal(refusal.message,'Native Vendetta needs its entered arrival invocation');assert(priorValidations>0,'Observe previous leaf closing validation before the next first validation');assert.equal(expectRefusal(()=>claimNativeVendettaArrival(s.c,s.combat,s.combat.vendettaLifetime)),'Native Vendetta needs its selected unclaimed arrival invocation');windows.push({stage:'Vendetta',initial:true,beforeGetter:true,refusal:refusal.message});s.assertTarget();refuseAll(s,'Vendetta first pre-getter readiness');injected=true;
  }
  assert.deepEqual(s.facts(),before,'Non-granting stage inspection and all refusals preserve prior effects');
 }finally{inside=false;}}return Reflect.apply(physical,this,args);}});
 s.travel(s.a);assert(injected);assert.equal(selections,1);assert.equal(verminfallReturns,1);assert(priorValidations>0);assert.equal(windows.at(-1).stage,'Vendetta');assert(windows.slice(0,-1).every(row=>row.stage==='Verminfall'));assertOrdered(s);assert.equal(s.registryCount(),0);s.c.assertIdleFrame();s.bareRefusal();return{injectedBeforeGetter:true,selections,verminfallReturns,priorValidations,refusals:6,windows};
});

for(const leaf of ['warlord','vendetta'] as const)course(leaf+' getter refuses all arrivals and live entry before effects',s=>{
 s.observeLeaves();let selections=0;s.hook(s.owners[leaf],'arrive',{configurable:true,get(){selections++;s.transcript.push({kind:'select',leaf});s.assertTarget();refuseAll(s,leaf+' getter');return()=>s.entry(leaf);}});
 s.travel(s.a);assert.equal(selections,1);assertOrdered(s);assert.equal(s.registryCount(),0);s.bareRefusal();return{selections,refusals:6,registryCalls:0};
});
for(const leaf of ['warlord','vendetta'] as const)course(leaf+' native query callback refuses all arrivals and live entry',s=>{
 s.observeLeaves();let injected=false,queries=0,armed=false;s.hook(s.owners[leaf],'arrive',{configurable:true,writable:true,value:function(){armed=true;try{return s.entry(leaf);}finally{armed=false;}}});
 if(leaf==='warlord'){const field=s.w.sim.warlord,query=field.lordAt;s.hook(field,'lordAt',{configurable:true,writable:true,value:function(this:typeof field,...args:Parameters<typeof query>){if(armed){queries++;if(!injected){injected=true;refuseAll(s,leaf+' lordAt callback');}}return Reflect.apply(query,this,args);}});}
 else{const query=s.vf.wantsAmbush;s.hook(s.vf,'wantsAmbush',{configurable:true,writable:true,value:function(this:typeof s.vf,...args:Parameters<typeof query>){if(armed){queries++;if(!injected){injected=true;refuseAll(s,leaf+' wantsAmbush callback');}}return Reflect.apply(query,this,args);}});}
 s.travel(s.a);assert(injected);assert(queries>0);assertOrdered(s);assert.equal(s.registryCount(),0);s.bareRefusal();return{queries,refusals:6,registryCalls:0};
});
for(const leaf of ['warlord','vendetta'] as const)course(leaf+' claim reserves entry before selected physical validation',s=>{
 s.observeLeaves();const authority=s.n.authority,physical=authority.assertFinalPhysical;let armed=false,injected=false,inside=false,claimError='';
 s.hook(s.owners[leaf],'arrive',{configurable:true,writable:true,value:function(){armed=true;try{return s.entry(leaf);}finally{armed=false;}}});
 s.hook(authority,'assertFinalPhysical',{configurable:true,writable:true,value:function(this:typeof authority,...args:Parameters<typeof physical>){assert(!inside,'Refusal must precede recursive physical validation');if(armed&&!injected){injected=true;inside=true;try{claimError=expectRefusal(()=>leaf==='warlord'?claimNativeWarlordArrival(s.c,s.combat,s.combat.warlordArrival):claimNativeVendettaArrival(s.c,s.combat,s.combat.vendettaLifetime));refuseAll(s,leaf+' claim validation');}finally{inside=false;}}return Reflect.apply(physical,this,args);}});
 s.travel(s.a);assert(injected);assertOrdered(s);assert.equal(s.registryCount(),0);return{claimError,refusals:7,registryCalls:0};
});
for(const leaf of LEAVES)course(leaf+' post-return validation refuses all leaves and live until next genuine arrival',s=>{
 s.observeLeaves();const authority=s.n.authority,physical=authority.assertFinalPhysical;let returned=false,injected=false,inside=false,returnFacts:ReturnType<typeof s.facts>|undefined;
 const restoreOwner=s.hook(s.owners[leaf],'arrive',{configurable:true,writable:true,value:function(){const result=s.entry(leaf);returnFacts=s.facts();returned=true;return result;}});
 const restorePhysical=s.hook(authority,'assertFinalPhysical',{configurable:true,writable:true,value:function(this:typeof authority,...args:Parameters<typeof physical>){assert(!inside,'Post-return refusal must precede recursive physical validation');if(returned&&!injected){injected=true;inside=true;try{assert.deepEqual(s.facts(),returnFacts);assert.equal(s.transcript.filter(x=>x.kind==='enter').length,LEAVES.indexOf(leaf)+1);assert(!s.transcript.some(x=>x.kind==='bounty'));s.assertTarget();refuseAll(s,leaf+' post-return validation');}finally{inside=false;}}return Reflect.apply(physical,this,args);}});
 s.travel(s.a);assert(returned&&injected);assertOrdered(s);assert.equal(s.registryCount(),0);restorePhysical();restoreOwner();s.c.assertIdleFrame();s.bareRefusal();
 const beforeRegistry=s.registryCount();s.live();assert.equal(s.registryCount(),beforeRegistry+1,'Idle real registry resumes after stage revocation');retryGenuine(s);return{refusals:6,idleRegistryEnteredOnce:true,nextGenuineArrivalOrdered:true};
});
for(const leaf of ['warlord','vendetta'] as const)course(leaf+' native query first error preserves prefix and stops later arrivals',s=>{
 s.observeLeaves();const sentinel=new Error(leaf+' selected native query sentinel');let callbackFacts:ReturnType<typeof s.facts>|undefined,queries=0,armed=false;s.hook(s.owners[leaf],'arrive',{configurable:true,writable:true,value:function(){armed=true;try{return s.entry(leaf);}finally{armed=false;}}});
 const fail=()=>{queries++;callbackFacts=s.facts();throw sentinel;};
 let restore:()=>void;if(leaf==='warlord'){const field=s.w.sim.warlord,query=field.lordAt;restore=s.hook(field,'lordAt',{configurable:true,writable:true,value:function(this:typeof field,...args:Parameters<typeof query>){if(armed)return fail();return Reflect.apply(query,this,args);}});}else{const query=s.vf.wantsAmbush;restore=s.hook(s.vf,'wantsAmbush',{configurable:true,writable:true,value:function(this:typeof s.vf,...args:Parameters<typeof query>){if(armed)return fail();return Reflect.apply(query,this,args);}});}
 let caught:unknown;try{s.travel(s.a);}catch(error){caught=error;}restore();assert.equal(caught,sentinel);assert.equal(queries,1);s.assertTarget();noLater(s,leaf);assert.deepEqual(s.facts(),callbackFacts,'Completed native prefix preserved exactly');assert.equal(s.marker.has(s.a),leaf==='warlord','Vendetta deletes before the query; Warlord has not reached it');s.c.assertIdleFrame();s.bareRefusal();retryGenuine(s);return{exactFirstError:true,prefixPreserved:true,nextGenuineArrivalOrdered:true};
});
course('vendetta completed native marker deletion preserves exact error and transfer',s=>{
 s.observeLeaves();const sentinel=new Error('Vendetta completed delete sentinel');let calls=0,prefix:ReturnType<typeof s.facts>|undefined;
 const restore=s.hook(s.marker,'delete',{configurable:true,writable:true,value:function(this:Set<string>,id:string){assert.equal(id,s.a);calls++;const result=Reflect.apply(Set.prototype.delete,this,[id]);assert.equal(result,true);prefix=s.facts();throw sentinel;}});
 let caught:unknown;try{s.travel(s.a);}catch(error){caught=error;}restore();assert.equal(caught,sentinel);assert.equal(calls,1);assert(!s.marker.has(s.a));assert.deepEqual(s.facts(),prefix);s.assertTarget();noLater(s,'vendetta');s.c.assertIdleFrame();s.bareRefusal();retryGenuine(s);return{calls,completedDeletePreserved:true,exactFirstError:true,nextGenuineArrivalOrdered:true};
});
for(const fault of ['marker-add','third-insertion'] as const)course('vendetta '+fault+' keeps completed native work and exact first error',s=>{
 // Genuine retirement, not raw census editing, makes a new native ambush eligible.
 for(const body of s.old)s.combat.slipAway(body,'');assert.equal(s.cohort().length,0);for(const body of s.old)assert(!s.scene.actors.includes(body));
 s.observeLeaves();const sentinel=new Error('Vendetta '+fault+' sentinel');let writes=0,caught:unknown,prefix:ReturnType<typeof s.facts>|undefined,baseline:Actor[]=[],partial:Actor[]=[],attempts=0;
 const restoreOwner=s.hook(s.owners.vendetta,'arrive',{configurable:true,writable:true,value:function(){baseline=[...s.scene.actors];return s.entry('vendetta');}});
 let restoreFault:()=>void;
 if(fault==='marker-add')restoreFault=s.hook(s.marker,'add',{configurable:true,writable:true,value:function(this:Set<string>,id:string){assert.equal(id,s.a);writes++;Reflect.apply(Set.prototype.add,this,[id]);prefix=s.facts();throw sentinel;}});
 else{const theater=s.area.assembly.input.theater,spawn=theater.spawnEventActor;restoreFault=s.hook(theater,'spawnEventActor',{configurable:true,writable:true,value:function(this:typeof theater,...args:Parameters<typeof spawn>){const body=Reflect.apply(spawn,this,args);writes++;if(writes===3){partial=s.scene.actors.filter(actor=>!baseline.includes(actor));prefix=s.facts();throw sentinel;}return body;}});}
 const attemptRows:any[]=[];s.row.nativeAttempts=attemptRows;while(!caught&&attempts<20){attempts++;s.transcript.length=0;try{s.travel(s.a);}catch(error){caught=error;}attemptRows.push({attempt:attempts,error:caught?errorInfo(caught):null,facts:s.facts(),transcript:copy(s.transcript)});if(!caught){assert.equal(writes,0,'A non-failing attempt cannot already have partially spawned');s.travel(s.b);const current=(s.vf.snapshot() as {writs:{id:string;cooldownLeft:number}[]}).writs.find(row=>row.id===s.writ.id);assert(current,'Original actual writ remains active');const cooldown=current.cooldownLeft;if(cooldown>0)s.vf.update(cooldown,s.w.devOverlayView());assert(s.vf.writsView().some(row=>row.id===s.writ.id),'Bounded cooldown staging must not silently replace the writ');attemptRows[attemptRows.length-1].away={cooldownAdvance:cooldown,field:s.vf.snapshot()};}}
 restoreFault();restoreOwner();assert.equal(caught,sentinel,'At most20 real empty returns must reach the actual fault; no forced native spec');assert.equal(writes,fault==='marker-add'?1:3);assert(s.marker.has(s.a));s.assertTarget();noLater(s,'vendetta');assert.deepEqual(s.facts(),prefix,'Preserve exact completed native writes and first error');s.c.assertIdleFrame();s.bareRefusal();
 if(fault==='marker-add'){assert.deepEqual(s.scene.actors,baseline);assert.equal(s.cohort().length,0);}else{assert.equal(partial.length,3);assert.equal(s.cohort().length,2);for(const body of partial){assert(s.scene.actors.includes(body));assert.equal(s.n.authority.require(body).combat,s.combat);}}
 const before=s.facts(),beforeActors=[...s.scene.actors];s.live();assert.deepEqual(s.scene.actors,beforeActors);assert.deepEqual(s.facts(),before,'Completed marker prevents idle replay');return{attempts,writes,partialBodies:partial.length,attributedBodies:s.cohort().length,exactFirstError:true,idleNoReplay:true};
});
course('warlord completed insertion and native text error retain body and stop siblings',s=>{
 const faction=s.w.sim.faction;for(const [id,power] of [[s.a,100],[s.b,90]] as const){for(const name of Object.keys((faction.snapshot() as {field:Record<string,Record<string,number>>}).field[id]??{}))faction.bleed(id,name,100);faction.reinforce(id,'goblin',power);}
 const field=s.w.sim.warlord;field.update(0,s.w.devOverlayView());const lord=field.lords.get('goblin');assert(lord&&lord.capitalId===s.a&&lord.alive);const crown=field.crownOf(lord);assert(crown);assert(!s.scene.actors.some(body=>body.tag==='warlord'&&body.faction==='goblin'));
 s.observeLeaves();const geometry=s.area.assembly.input.geometry,text=geometry.text,sentinel=new Error('Warlord completed text sentinel');let texts=0,prefix:ReturnType<typeof s.facts>|undefined,boss:Actor|undefined;const textState=s.area.assembly.objectiveController.input.state;let textCollection:typeof textState.texts|undefined,textRow:typeof textState.texts[number]|undefined,textSnapshot:unknown;
 const restore=s.hook(geometry,'text',{configurable:true,writable:true,value:function(this:typeof geometry,...args:Parameters<typeof text>){const collection=textState.texts,beforeText=[...collection],result=Reflect.apply(text,this,args);if(String(args[1]).includes('warlord rules')){texts++;assert.equal(textState.texts,collection);assert.equal(collection.length,beforeText.length+1);assert.deepEqual(collection.slice(0,-1),beforeText);textCollection=collection;textRow=collection.at(-1)!;assert.equal(textRow.text,args[1]);textSnapshot={...textRow,pos:{...textRow.pos}};boss=s.scene.actors.find(body=>body.tag==='warlord'&&body.faction==='goblin');assert(boss);assert.equal(s.n.authority.require(boss).combat,s.combat);prefix=s.facts();throw sentinel;}return result;}});
 let caught:unknown;try{s.travel(s.a);}catch(error){caught=error;}restore();assert.equal(caught,sentinel);assert.equal(texts,1);assert(boss&&textRow&&textCollection);assert.equal(textState.texts,textCollection);assert.equal(textCollection.at(-1),textRow);assert.deepEqual(textRow,textSnapshot,'Exact native floating text row survives the sentinel');assert.equal(field.crownOf(lord),crown);assert.deepEqual(s.facts(),prefix);s.assertTarget();noLater(s,'warlord');s.c.assertIdleFrame();s.bareRefusal();retryGenuine(s);assert.deepEqual(s.scene.actors.filter(body=>body.tag==='warlord'&&body.faction==='goblin'),[boss]);assert.equal(s.n.authority.require(boss).combat,s.combat);return{exactFirstError:true,completedText:true,sameAdmittedBody:true,nextArrivalDoesNotDuplicate:true};
});

assert.equal(report.courses.length,18);report.complete=true;
}catch(error){failed=true;primary=error;report.error=errorInfo(error);}
finally{Date.now=originalNow;try{fs.writeFileSync(outputFd,JSON.stringify(report,null,2));fs.fsyncSync(outputFd);}catch(error){report.cleanupErrors.push(errorInfo(error));if(!failed){failed=true;primary=error;}}finally{try{fs.closeSync(outputFd);}catch(error){if(!failed){failed=true;primary=error;}}}}
if(failed)throw primary;console.log(JSON.stringify({kind:report.kind,complete:report.complete,courses:report.courses.length,reportPath:output}));
