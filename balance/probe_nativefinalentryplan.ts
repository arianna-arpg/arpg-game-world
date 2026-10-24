import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cold=process.argv.find(x=>x.startsWith('--cold='))?.slice(7);
if(cold){
 if(cold==='preempt'){const p=await import('../src/worldmass/nativeAreaFinalEntryPlan');assert.deepEqual(Object.keys(p),[]);}
 await import(cold==='birth'?'../src/worldmass/nativeAreaSceneBirthAdmission':'../src/worldmass/nativeAreaCombatOperation');const p=await import('../src/worldmass/nativeAreaCombatOperation');assert.throws(()=>p.consumeNativeFinalEntryPlan({},{}),/Foreign, nested or expired/);assert.equal(Object.hasOwn(p,'installNativeFinalEntryResolver'),false);
 console.log('PASS cold '+cold);
}else{
 for(const mode of ['birth','operation','preempt']){const r=spawnSync(process.execPath,['--import','tsx',fileURLToPath(import.meta.url),'--cold='+mode],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stdout+r.stderr);assert(r.stdout.includes('PASS cold '+mode));}
 await import('../src/engine/world');
 const {nativeCampaignFixture,birthActualNativeArea}=await import('./nativeCombatRetainedFixture');
 const {NativeAreaCombatOperation}=await import('../src/worldmass/nativeAreaCombatOperation');
 const {NativeAreaSceneBirthAdmission}=await import('../src/worldmass/nativeAreaSceneBirthAdmission');
 const {consumeNativeFinalEntryPlan}=await import('../src/worldmass/nativeAreaCombatOperation');
 const {refuseWorldCombat,writeCombatProof}=await import('./probe_nativecombatcycle');
 const setup=nativeCampaignFixture(81773),rows:unknown[]=[];
 refuseWorldCombat([setup.writer],world=>{
  const all=birthActualNativeArea(setup),a=all.ongoing,{scene,population}=a.assembly.input,hero=scene.player,authority=all.authority,birth=new NativeAreaSceneBirthAdmission({authority,scene,population});
  let operation:InstanceType<typeof NativeAreaCombatOperation>|undefined;
  const proto=NativeAreaCombatOperation.prototype,original=proto.enter;proto.enter=function(this:InstanceType<typeof NativeAreaCombatOperation>,subjects,action){operation=this;return Reflect.apply(original,this,[subjects,action]);} as typeof original;
  try{a.combat.actorTurnRate(hero);}finally{proto.enter=original;}
  assert(operation);const entry=operation!;let actions=0;const run=(subjects:Parameters<typeof entry.enter>[0],action=()=>{actions++;})=>entry.enter(subjects,action);
  run({permission:'proc',physical:[hero]});assert.equal(actions,1);rows.push({mode:'ordinary',actions});
  const tag=hero.tag;
  for(const kind of ['source','physical'] as const){let iter=0;const input=[hero];Object.defineProperty(input,Symbol.iterator,{value:function(){iter++;hero.tag=kind;return Array.prototype[Symbol.iterator].call(this);}});run({permission:'proc',[kind==='source'?'sources':'physical']:input});assert.equal(iter,1);assert.equal(hero.tag,kind);hero.tag=tag;rows.push({mode:kind+'-iterator',iter});}
  {let gets=0;const marker=Error('actual carried getter'),subjects={permission:'proc' as const,physical:[hero],get carried():readonly typeof hero[]{gets++;hero.tag='carried getter';throw marker;}};const before:number=actions;assert.throws(()=>run(subjects),e=>e===marker);assert.equal(gets,1);assert.equal(actions,before);assert.equal(hero.tag,'carried getter');hero.tag=tag;rows.push({mode:'carried-getter',gets});}
  {let iter=0;const carried:typeof hero[]=[];Object.defineProperty(carried,Symbol.iterator,{value:function(){iter++;return Array.prototype[Symbol.iterator].call(this);}});run({permission:'proc',physical:[hero],carried});assert.equal(iter,1);rows.push({mode:'empty-carried-iterator',iter});}
  {let iter=0;const carried:typeof hero[]=[];Object.defineProperty(carried,Symbol.iterator,{value:function(){iter++;scene.actors.splice(scene.actors.indexOf(hero),1);return Array.prototype[Symbol.iterator].call(this);}});const before:number=actions;try{assert.throws(()=>run({permission:'proc',physical:[hero],carried}),/physical|authority|selection/i);assert.equal(iter,1);assert.equal(actions,before);assert(!scene.actors.includes(hero));}finally{scene.actors.push(hero);}rows.push({mode:'carried-iterator-removal',iter});}
  for(const phase of ['getter','body','restore'] as const){let gets=0,calls=0;const marker=Error('actual assertion '+phase),fn=authority.assertFinalSelections;Object.defineProperty(authority,'assertFinalSelections',{configurable:true,get(){gets++;if(phase==='getter'){hero.tag=phase;throw marker;}return function(this:typeof authority,...args:Parameters<typeof fn>){assert.equal(this,authority);calls++;hero.tag=phase;if(phase==='body')throw marker;Reflect.deleteProperty(authority,'assertFinalSelections');return Reflect.apply(fn,this,args);};}});const before:number=actions;try{if(phase==='restore'){run({permission:'proc',physical:[hero]});assert.equal(actions,before+1);}else{assert.throws(()=>run({permission:'proc',physical:[hero]}),e=>e===marker);assert.equal(actions,before);}assert.equal(gets,1);assert.equal(calls,phase==='getter'?0:1);assert.equal(hero.tag,phase);}finally{Reflect.deleteProperty(authority,'assertFinalSelections');hero.tag=tag;}rows.push({mode:'assertion-'+phase,gets,calls});}
  {const slot=Object.getOwnPropertyDescriptor(setup.writer,'seats')!,marker=Error('second seats callback');let reads=0;Object.defineProperty(setup.writer,'seats',{configurable:true,get(){reads++;if(reads===2){hero.tag='second';throw marker;}return slot.value;}});const before:number=actions;try{assert.throws(()=>run({permission:'proc',physical:[hero]}),e=>e===marker);assert.equal(reads,2);assert.equal(actions,before);assert.equal(hero.tag,'second');}finally{Object.defineProperty(setup.writer,'seats',slot);hero.tag=tag;}rows.push({mode:'second-seats-throw',reads});}
  {const body=population.createMonster('goblin_skirmisher',1,'enemy');let carriedGets=0;const before:number=actions;assert.throws(()=>run({permission:'proc',physical:[body],get carried(){carriedGets++;return [];}}),/authority/);assert.equal(carriedGets,0);assert.equal(actions,before);rows.push({mode:'first-physical-refusal',carriedGets});}
  {const marker=Error('actual completed insertion');let body:typeof hero|undefined;assert.throws(()=>run({permission:'proc',physical:[hero]},()=>{body=birth.createMonster('goblin_skirmisher',1,'enemy');scene.actors.push(body);throw marker;}),e=>e===marker);assert(body);assert.equal(authority.require(body).scene,scene);assert(scene.actors.includes(body));rows.push({mode:'completed-insertion',admitted:true});}
  {let nested=0;run({permission:'proc',physical:[hero]},()=>{nested++;run({permission:'proc',physical:[hero]},()=>{nested++;});});assert.equal(nested,2);rows.push({mode:'nested',nested});}
  {const fake=Object.freeze({});for(let i=0;i<2;i++){assert.throws(()=>birth.runFinalEntryPlan(fake),/Foreign, nested or expired/);assert.throws(()=>consumeNativeFinalEntryPlan(fake,birth),/Foreign, nested or expired/);}rows.push({mode:'forged-repeated-plans',refusals:4});}
  assert.deepEqual(world,[]);
 });
 writeCombatProof('native-final-entry-plan.json',{scope:'Actual born area, genuine operation captured at existing public selected entry, ordinary branch and exact callback fallback/partial effects; no synthetic authority or census.',cold:3,rows});console.log(JSON.stringify({cold:3,rows}));
}
