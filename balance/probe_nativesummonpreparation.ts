import {beforeNativeMainProofSource} from './nativeMainProofSourceFixture';
/** Four independent native preparation lanes. This is pre-insertion evidence;
 * manual actor admission is fixture setup, and full combat/spawn is absent. */
import '../src/engine/world';
import assert from 'node:assert/strict';
import {nativeArrivalMainproofFS as fs} from './nativeArrivalCompositionFixture';
import ts from 'typescript';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {makeSimWorld} from '../src/sim/arena';
import {withSeededRandom} from '../src/core/rng';
import {rand} from '../src/core/math';
import {Actor,resetActorIdCounter} from '../src/engine/actor';
import {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';
import {NativeAreaSceneProgression,freshSceneProgressionState,type NativeSceneProgressionAuthority} from '../src/worldmass/nativeAreaSceneProgression';
import {NativeAreaSceneSummonPreparation,type NativeSummonPreparationRuntime,type NativeSummonPreparationScope} from '../src/worldmass/nativeAreaSceneSummonPreparation';
import {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';
import {SKILLS} from '../src/data/skills';
import {treeGraph} from '../src/engine/skilltree';
import {SUPPORTS} from '../src/data/supports';
import {MONSTERS} from '../src/data/monsters';
import {mod,STAT_DEFS} from '../src/engine/stats';
import {canonicalVein} from '../src/engine/supportbase';
import {crewBoardingOpen,instanceSummon,supportRidesMinions,supportFitsInst,makeSkillInstance,instanceDelivery,summonKitIds,type SkillInstance,type SummonDelivery} from '../src/engine/skills';
import {resolveMinionInheritance,applyMinionPlyBonus} from '../src/engine/minionInheritance';
import {monsterSkillLevelOf} from '../src/engine/nativePopulationRules';
import {syncAttributeBequests,ATTRIBUTE_BEQUEST_IDS,bequestStat} from '../src/engine/bequests';
import {throngEvolution,throngClusterPlies} from '../src/engine/throngEvolution';
import {reliquaryPower} from '../src/meta/reliquary';
import {RELIQUARY_CFG} from '../src/data/reliquary';
import * as core from '../src/engine/nativeSceneSummonPreparation';
import {sceneRelevelActor,sceneBakeMinionOwnerStats} from '../src/engine/nativeSceneProgression';
import {nativeSceneProgressionArchive as progressionArchive} from './nativeSceneProgressionArchive';
import {nativeSceneSummonPreparationArchive as archive,nativeSceneSummonPreparationArchiveHash} from './nativeSceneSummonPreparationArchive';
import {beforeNativeSceneTethers} from './nativeMainProofHistoricalFixture';
import {beforeNativeSceneDisplacement} from './nativeMainProofHistoricalFixture';
import {beforeNativeSceneSummonPreparation} from './nativeMainProofHistoricalFixture';
import {nativeSceneSummonPreparationIntegrationArchive as integrationArchive,nativeSceneSummonPreparationIntegrationArchiveHash} from './nativeSceneSummonPreparationIntegrationArchive';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex'),checks:string[]=[],expanded:any[]=[];
function check(name:string,fn:()=>void){fn();checks.push(name);console.log('PASS '+name);}
const read=(f:string)=>beforeNativeMainProofSource('summon',f,fs.readFileSync(new URL('../'+f,import.meta.url),'utf8')).replaceAll('\r\n','\n');
const bindings={rand,crewBoardingOpen,instanceSummon,supportRidesMinions,supportFitsInst,MONSTERS,monsterSkillLevelOf,resolveMinionInheritance,RELIQUARY_CFG,reliquaryPower,mod,syncAttributeBequests,applyMinionPlyBonus,throngEvolution,throngClusterPlies};
const nativeStats=progressionArchive.rows.filter(r=>['relevelActor','bakeMinionOwnerStats'].includes(r.name));
const original:any=Function(...Object.keys(bindings),ts.transpileModule('class Original{'+[...archive.rows,...nativeStats].map(x=>x.before).join('\n')+'}\nreturn Original.prototype;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText)(...Object.values(bindings));
check('immutable originals and exact core bodies preserve signatures and native stats',()=>{
 assert.equal(sha(JSON.stringify(archive)),nativeSceneSummonPreparationArchiveHash);
 const source=execFileSync('git',['show',archive.originalCommit+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:2e7}).replaceAll('\r\n','\n');assert.equal(sha(source),archive.originalWorldHash);
 const ws=ts.createSourceFile('world.ts',source,99,true),wc=ws.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
 const cs=ts.createSourceFile('core.ts',read('src/engine/nativeSceneSummonPreparation.ts'),99,true),ps=ts.createSourceFile('progression.ts',read('src/engine/nativeSceneProgression.ts'),99,true);
 for(const row of archive.rows){assert.equal(wc.members.find(n=>n.name?.getText(ws)===row.name)?.getText(ws),row.before);assert.equal(sha(row.before),row.hash);const old=ts.createSourceFile('old.ts','class Old{'+row.before+'}',99,true),m=(old.statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration,n=cs.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='scene'+row.name[0].toUpperCase()+row.name.slice(1)) as ts.FunctionDeclaration;assert.equal(n.body!.getText(cs),m.body!.getText(old));assert.deepEqual(n.parameters.map(p=>p.getText(cs)),m.parameters.map(p=>p.getText(old)));assert.equal(n.type?.getText(cs),m.type?.getText(old));}
 for(const row of nativeStats){const old=ts.createSourceFile('old.ts','class Old{'+row.before+'}',99,true),m=(old.statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration,n=ps.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='scene'+row.name[0].toUpperCase()+row.name.slice(1)) as ts.FunctionDeclaration;assert.equal(n.body!.getText(ps),m.body!.getText(old).replaceAll('this.','nativeHost.'));}
 let restored=read('src/engine/nativeSceneProgression.ts');for(const row of [...archive.progressionChanges].reverse()){assert.equal(restored.split(row.after).length,2);restored=restored.replace(row.after,row.before);}assert.equal(sha(restored),archive.progressionBeforeHash);assert.equal(sha(beforeNativeSceneTethers(read('src/engine/world.ts'))),archive.workingWorldHash,'exact pre-tether World restored');
});
check('historical stat source and deliberate core mutations are independently guarded',()=>{
 const statWorld=execFileSync('git',['show',progressionArchive.commit+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:2e7}).replaceAll('\r\n','\n'),ss=ts.createSourceFile('old.ts',statWorld,99,true),sc=ss.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
 for(const row of nativeStats)assert.equal(sc.members.find(n=>n.name?.getText(ss)===row.name)?.getText(ss),row.before);
 assert.equal(beforeNativeSceneTethers(read('src/engine/world.ts')),execFileSync('git',['show',archive.preimageCommit+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:2e7}).replaceAll('\r\n','\n'));
 const guard=(text:string)=>{const cs=ts.createSourceFile('candidate.ts',text,99,true);for(const row of archive.rows){const os=ts.createSourceFile('old.ts','class Old{'+row.before+'}',99,true),m=(os.statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration,n=cs.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='scene'+row.name[0].toUpperCase()+row.name.slice(1)) as ts.FunctionDeclaration;assert.equal(n.body!.getText(cs),m.body!.getText(os));assert.deepEqual(n.parameters.map(p=>p.getText(cs)),m.parameters.map(p=>p.getText(os)));}};
 const text=read('src/engine/nativeSceneSummonPreparation.ts');guard(text);for(const [before,after] of [['rand(0, total)','rand(1, total)'],['if (!summonInst) return;','if (!summonInst) throw Error();'],['scale?: number;','scale: number;']]){const mutant=text.replace(before,after);assert.notEqual(mutant,text);assert.throws(()=>guard(mutant));}
});
withSeededRandom(7835,()=>{
const w:any=makeSimWorld('warrior',7835),raw:any=freshAssemblyInput(w,w.zone),campaign=raw.campaign;campaign.seatOf=w.seatOf.bind(w);
const area=new NativeAreaSceneAssembly(raw),scene=area.input.scene,population=area.input.population;
const authority=new NativeAreaActorAuthority<NativeSummonPreparationRuntime>(campaign);
// Preparation's registry contains the actual progression owner, not a fabricated
// combat object. The existing progression constructor's broader annotation is
// a fixture-only cast; no public combat-backed progression entry is invoked.
const makeProgression=(a:NativeAreaSceneAssembly)=>new NativeAreaSceneProgression({scene:a.input.scene,population:a.input.population,ecology:a.input.ecology,geometry:a.input.geometry,runtime:a.input.registry.input.birth,loot:a.lootController,campaign,state:freshSceneProgressionState(),authority:authority as unknown as NativeSceneProgressionAuthority});
const progression=makeProgression(area),owner=new NativeAreaSceneSummonPreparation({scene,population,campaign,progression,authority}),binding=authority.register(scene,{progression});authority.claim(binding,scene.actors);
const peer=new NativeAreaSceneAssembly(freshAssemblyInput(w,w.zone,campaign)),peerScene=peer.input.scene;peerScene.actors=[];const peerProgression=makeProgression(peer),peerBinding=authority.register(peerScene,{progression:peerProgression}),peerOwner=new NativeAreaSceneSummonPreparation({scene:peerScene,population:peer.input.population,campaign,progression:peerProgression,authority});
let caster=scene.player;caster.level=24;caster.setAttributes({strength:60,dexterity:55,intelligence:50,vitality:45} as any);caster.sheet.setSource('preparation-proof',[mod('minionDamage','increased',.65),mod('minionLife','increased',.6),mod('minionSize','increased',.2),mod('minionPlies','flat',2),...ATTRIBUTE_BEQUEST_IDS.map(id=>mod(bequestStat(id),'flat',.35))]);
const statsHost={get account(){return campaign.account;},get localSeat(){return campaign.localSeat;},seatOf:(a:Actor)=>campaign.seatOf(a),relevelActor:(a:Actor,n:number)=>sceneRelevelActor({stampMonsterLevel:population.factory.stampMonsterLevel.bind(population.factory)},a,n)};
const originalHost={...statsHost,relevelActor:(a:Actor,n:number)=>original.relevelActor.call({stampMonsterLevel:population.factory.stampMonsterLevel.bind(population.factory)},a,n)};
const sourceRows=(a:Actor)=>a.sheet.sourceNames().map(id=>[id,a.sheet.getSourceMods(id)]);
const skillRows=(skills:(SkillInstance|null)[])=>skills.map(sk=>sk?{id:sk.def.id,level:sk.level,sockets:sk.sockets.map(s=>s?{id:s.def.id,level:s.level,forwarded:s.forwarded,scale:s.forwardScale,rolled:s.rolled}:null)}:null);
const summary=(a:Actor)=>({id:a.id,defId:a.defId,level:a.level,life:a.life,mana:a.mana,radius:a.radius,shape:a.shape,color:a.color,owner:a.owner?.id,kind:a.kind,plies:a.plies,maxPlies:a.pliesMax,guard:a.guardMode,bequest:a.bequestSignature,sources:sourceRows(a),skills:skillRows(a.skills),stats:Object.fromEntries(Object.keys(STAT_DEFS).map(id=>[id,a.sheet.get(id)]))});
const carriers=Object.values(SKILLS).filter(d=>d.delivery.type==='summon');
check('all installed summon pools and fixed types retain weighted choice and raw RNG',()=>{
 for(const def of carriers){const inst=makeSkillInstance(def,20),d=instanceDelivery(inst) as SummonDelivery;for(const seed of [1,9,431,9431]){const results=[()=>original.rollSummonType.call(w,d),()=>core.sceneRollSummonType(d),()=>w.rollSummonType(d),()=>owner.rollSummonType(d)].map(fn=>withSeededRandom(seed,()=>({id:fn(),next:Math.random()})));for(const r of results.slice(1))assert.deepEqual(r,results[0]);expanded.push([def.id,seed,results[0]]);}}
});
check('every authored summon tree node resolved delivery preserves pool and RNG parity',()=>{
 let count=0;for(const def of Object.values(SKILLS)){const graph=treeGraph(def);if(!graph)continue;for(const node of graph.nodes.values()){
  const inst=makeSkillInstance(def,80);const path:string[]=[],seen=new Set<string>();let cursor:typeof node|undefined=node;while(cursor&&!seen.has(cursor.id)){seen.add(cursor.id);path.unshift(cursor.id);cursor=cursor.links.map(id=>graph.nodes.get(id)).filter((n):n is typeof node=>!!n).sort((a,b)=>a.depth-b.depth)[0];}inst.treeNodes=path;
  const delivery=instanceDelivery(inst),d=delivery.type==='summon'?delivery:instanceSummon(inst);if(!d)continue;
  const all=[()=>original.rollSummonType.call(w,d),()=>core.sceneRollSummonType(d),()=>w.rollSummonType(d),()=>owner.rollSummonType(d)].map(fn=>withSeededRandom(9141,()=>({id:fn(),next:Math.random()})));for(const row of all.slice(1))assert.deepEqual(row,all[0]);expanded.push(['tree-pool',def.id,node.id,all[0]]);count++;
 }}assert(count>0);expanded.push(['tree-pools',count]);
});
check('empty zero-weight and cumulative-boundary pool semantics remain native',()=>{
 const base={type:'summon',count:0,maxActive:0} as const;for(const d of [{...base,monsterId:'skeleton'},{...base,pool:[]},{...base,pool:[{id:'a',weight:0},{id:'b',weight:0}]},{...base,pool:[{id:'a',weight:1},{id:'b',weight:3}]}])for(const raw of [0,.25,.250001,.999999]){const before=Math.random;try{let calls=0;Math.random=()=>{calls++;return raw;};const a=original.rollSummonType.call(w,d),count=calls;for(const fn of [()=>core.sceneRollSummonType(d),()=>w.rollSummonType(d),()=>owner.rollSummonType(d)]){calls=0;assert.equal(fn(),a);assert.equal(calls,count);}}finally{Math.random=before;}}
});
type Lane='original'|'core'|'world'|'owner';
function prepare(lane:Lane,inst:SkillInstance,bodyId:string,opts:{scale?:number;relic?:boolean;cluster?:boolean;partial?:boolean;forwardScale?:number}={}){
 const action=(scope?:NativeSummonPreparationScope)=>{const body=scope?scope.createMonster(bodyId,24,caster.team,caster):lane==='world'?w.createMonster(bodyId,24,caster.team,caster):population.createMonster(bodyId,24,caster.team,caster);
  // Native caller-owned crew layout is explicit fixture setup. This probe does
  // not claim the remainder of spawnMinion or its cap/effect/lifetime branches.
  const d=instanceDelivery(inst);if(d.type==='summon'){const kit=summonKitIds(d,bodyId,body.skills.flatMap((s:SkillInstance|null)=>s?[s.def.id]:[]));body.skills=body.skills.filter((s:SkillInstance|null)=>!s||kit.includes(s.def.id));for(const id of kit)if(SKILLS[id]&&!body.skills.some((s:SkillInstance|null)=>s?.def.id===id))body.skills.push(makeSkillInstance(SKILLS[id],7,0));}
  if(opts.cluster)body.throngUnits=16;body.life*=.43;body.plies=Math.max(0,body.pliesMax-1);body.sheet.setSource('relic:old',[mod('damage','more',.9)]);
  const forward=()=>scope?scope.forwardSummonSockets(inst,body,{scale:opts.forwardScale}):lane==='original'?original.forwardSummonSockets.call(w,inst,body.skills,{scale:opts.forwardScale}):lane==='core'?core.sceneForwardSummonSockets(inst,body.skills,{scale:opts.forwardScale}):w.forwardSummonSockets(inst,body.skills,{scale:opts.forwardScale});forward();
  const bake=()=>scope?scope.bakeMinionOwnerStats(body,caster,inst,opts.scale):lane==='original'?original.bakeMinionOwnerStats.call(originalHost,body,caster,inst,opts.scale):lane==='core'?sceneBakeMinionOwnerStats(statsHost,body,caster,inst,opts.scale):w.bakeMinionOwnerStats(body,caster,inst,opts.scale);
  if(opts.partial){const prior=body.sheet.setSource.bind(body.sheet);body.sheet.setSource=(name:string,mods:any[])=>{prior(name,mods);if(name==='owner')throw Error('proof-owner-partial');};assert.throws(bake,/proof-owner-partial/);}else bake();
  assert(!scene.actors.includes(body));assert(!peerScene.actors.includes(body));assert.throws(()=>authority.require(body),/Missing native actor authority/);return {body,snapshot:summary(body)};
 };
 resetActorIdCounter(900000);return withSeededRandom(81129,()=>{const result=lane==='owner'?owner.run(caster,action):action();return {...result,next:Math.random()};});
}
function compare(inst:SkillInstance,id:string,opts:Parameters<typeof prepare>[3]={}){const all=(['original','core','world','owner'] as const).map(l=>prepare(l,inst,id,opts));for(const row of all.slice(1))assert.deepEqual({snapshot:row.snapshot,next:row.next},{snapshot:all[0].snapshot,next:all[0].next},inst.def.id+' '+id);return all;}
check('all native summon crews use real factories and preserve forwarded supports and owner stats',()=>{
 let bodies=0;for(const def of carriers){const d=def.delivery as SummonDelivery;const ids=[...new Set([d.monsterId,...(d.pool??[]).map(p=>p.id)].filter((id):id is string=>!!id&&!!MONSTERS[id]))];for(const id of ids){const inst=makeSkillInstance(def,20,5);inst.sockets=[{def:SUPPORTS.resonance,level:1},{def:SUPPORTS.tectonic_echoes,level:7},{def:SUPPORTS.faultfinder,level:9},{def:SUPPORTS.poison_chance,level:6},null];compare(inst,id);bodies++;}}
 assert(bodies>0);expanded.push(['native-crew-bodies',bodies]);
});
check('full installed support catalog forwards with native seat exclusions and exact append order',()=>{
 const inst=makeSkillInstance(SKILLS.raise_dead,20,0);inst.sockets=[{def:SUPPORTS.resonance,level:1},...Object.values(SUPPORTS).map(def=>({def,level:7,...(def.rollBase?{rolled:canonicalVein(def.rollBase)}:{})}))];
 const d=instanceDelivery(inst) as SummonDelivery,id=d.monsterId??d.pool![0].id;const result=compare(inst,id,{forwardScale:.45})[3].body;for(const skill of result.skills)if(skill)for(const forwarded of skill.sockets){if(!forwarded?.forwarded)continue;assert(supportRidesMinions(forwarded.def));const carried=inst.sockets.find(s=>s?.def===forwarded.def)!;assert.equal(forwarded.def,carried.def);assert.notEqual(forwarded,carried);if(carried.rolled){assert.deepEqual(forwarded.rolled,carried.rolled);assert.notEqual(forwarded.rolled,carried.rolled);}assert.equal(forwarded.forwardScale,.45);}expanded.push(['support-catalog',Object.keys(SUPPORTS).length]);
});
check('boarding gates graft fixpoint duplicate kit gems null slots and append identities remain exact',()=>{
 const d=SKILLS.raise_dead.delivery as SummonDelivery,id=d.monsterId??d.pool![0].id;
 for(const config of ['closed','grafted','reverse','non-summon','undefined'] as const){const inst=makeSkillInstance(config==='non-summon'?SKILLS.cleave:SKILLS.raise_dead,20,3);inst.sockets=[{def:SUPPORTS.tectonic_echoes,level:6},null,{def:SUPPORTS.faultfinder,level:9}];if(config==='reverse')inst.sockets.reverse();if(config!=='closed'&&config!=='non-summon')inst.grafts=[{def:SUPPORTS.resonance,level:1}];if(config==='grafted'){inst.grafts!.push(inst.sockets[2]!);inst.sockets[2]=null;}
  const results=(['original','core','world','owner'] as const).map(lane=>owner.run(caster,scope=>{const body=scope.createMonster(id,20,caster.team,caster),skill=makeSkillInstance(SKILLS.cleave,4,2),kit={def:SUPPORTS.faultfinder,level:2};skill.sockets=[null,kit];body.skills=[null,skill];const carrier=config==='undefined'?undefined:inst;const old=skill.sockets;
   if(lane==='owner')scope.forwardSummonSockets(carrier,body);else if(lane==='core')core.sceneForwardSummonSockets(carrier,body.skills);else if(lane==='world')w.forwardSummonSockets(carrier,body.skills);else original.forwardSummonSockets.call(w,carrier,body.skills);
   assert.equal(skill.sockets,old);assert.equal(skill.sockets[0],null);assert.equal(skill.sockets[1],kit);assert.equal(skill.sockets.filter(x=>x?.def.id===kit.def.id).length,1);return skillRows(body.skills);
  }));for(const result of results.slice(1))assert.deepEqual(result,results[0]);if(config==='closed'||config==='undefined')assert.equal(results[0][1]!.sockets.length,2);else assert(results[0][1]!.sockets.some(s=>s?.id==='tectonic_echoes'));}
});
check('relic level stamps attribute bequests throng cluster hivecall and native partial writes match all lanes',()=>{
 const raise=makeSkillInstance(SKILLS.raise_dead,20),rd=instanceDelivery(raise) as SummonDelivery,id=rd.monsterId??rd.pool![0].id;raise.relicSource='prep-proof';compare(raise,id,{scale:.35});compare(raise,id,{partial:true});
 for(const def of Object.values(SKILLS).filter(d=>d.throng||d.hivecall)){const inst=makeSkillInstance(def,20);const nodes=[...(def.tree?.nodes??[]),...(def.tree?.branches??[]).flatMap(b=>b.rungs),...(def.tree?.neutral?[def.tree.neutral]:[])];inst.treeNodes=nodes.filter(n=>n.throngEvolution?.cluster).map(n=>n.id);const d=instanceDelivery(inst);const bodyId=d.type==='summon'?(d.monsterId??d.pool?.[0]?.id??id):id;compare(inst,bodyId,{scale:.25,cluster:true});}
 assert(ATTRIBUTE_BEQUEST_IDS.length>0);
});
check('scopes reject arbitrary foreign reused expired nested and forged body identities',()=>{
 const inst=makeSkillInstance(SKILLS.raise_dead,20),d=instanceDelivery(inst) as SummonDelivery,id=d.monsterId??d.pool![0].id,old=population.createMonster(id,20,caster.team,caster),foreign=peer.input.population.createMonster(id,20,caster.team,caster);let held!:NativeSummonPreparationScope,body!:Actor,inner!:Actor;
 owner.run(caster,scope=>{held=scope;body=scope.createMonster(id,20,caster.team,caster);const before=summary(body);for(const bad of [old,foreign,Object.assign(Object.create(Object.getPrototypeOf(body)),body)])assert.throws(()=>scope.bakeMinionOwnerStats(bad,caster,inst),/Foreign or reused/);assert.deepEqual(summary(body),before);
  owner.run(caster,nested=>{inner=nested.createMonster(id,20,caster.team,caster);assert.throws(()=>scope.relevelActor(body,4),/nested/);assert.throws(()=>nested.relevelActor(body,4),/Foreign or reused/);nested.bakeMinionOwnerStats(inner,caster,inst);});assert.throws(()=>scope.relevelActor(inner,4),/Foreign or reused/);scope.bakeMinionOwnerStats(body,caster,inst);
 });assert.throws(()=>held.relevelActor(body,4),/Expired/);owner.run(caster,next=>assert.throws(()=>next.relevelActor(body,4),/Foreign or reused/));
});
check('own insertion and foreign physical claim refuse before preparation mutation',()=>{
 const inst=makeSkillInstance(SKILLS.raise_dead,20),d=instanceDelivery(inst) as SummonDelivery,id=d.monsterId??d.pool![0].id;
 owner.run(caster,scope=>{const body=scope.createMonster(id,20,caster.team,caster),before=summary(body);scene.actors.push(body);assert.throws(()=>scope.bakeMinionOwnerStats(body,caster,inst),/admission|uninserted/);assert.deepEqual(summary(body),before);scene.actors.splice(scene.actors.indexOf(body),1);peerScene.actors.push(body);authority.claim(peerBinding,[body]);assert.throws(()=>scope.bakeMinionOwnerStats(body,caster,inst),/physical authority/);assert.deepEqual(summary(body),before);authority.release(peerBinding,[body]);peerScene.actors.splice(peerScene.actors.indexOf(body),1);});
});
check('physical caster and registered progression guard same-coordinate foreign areas and detached bodies',()=>{
 assert.throws(()=>peerOwner.run(caster,()=>{}),/physical caster/);const rival=makeProgression(area),wrong=new NativeAreaSceneSummonPreparation({scene,population,campaign,progression:rival,authority});assert.throws(()=>wrong.run(caster,()=>{}),/registered progression/);const where=scene.actors.indexOf(caster);scene.actors.splice(where,1);try{assert.throws(()=>owner.run(caster,()=>{}),/physical caster/);}finally{scene.actors.splice(where,0,caster);}assert.throws(()=>new NativeAreaSceneSummonPreparation({...owner.input,population:peer.input.population}),/identical/);
});
check('factory replacement wrong caster and asynchronous or throwing scopes grant no authority',()=>{
 const inst=makeSkillInstance(SKILLS.raise_dead,20),d=instanceDelivery(inst) as SummonDelivery,id=d.monsterId??d.pool![0].id;let escaped!:NativeSummonPreparationScope,born!:Actor;assert.throws(()=>owner.run(caster,scope=>{escaped=scope;born=scope.createMonster(id,20,caster.team,caster);scope.bakeMinionOwnerStats(born,caster,inst);throw Error('scope-fault');}),/scope-fault/);assert.throws(()=>escaped.relevelActor(born,4),/Expired/);assert(!scene.actors.includes(born));authority.assertUnclaimed(born);
 const originalFactory=population.createMonster;try{population.createMonster=()=>born;owner.run(caster,scope=>assert.throws(()=>scope.createMonster(id,20,caster.team,caster),/actual population factory/));}finally{population.createMonster=originalFactory;}
 owner.run(caster,scope=>assert.throws(()=>scope.createMonster(id,20,caster.team,undefined),/scoped caster/));assert.throws(()=>owner.run(caster,scope=>{escaped=scope;return Promise.resolve(1);}),/synchronous/);assert.throws(()=>escaped.relevelActor(born,4),/Expired/);
});
check('direct relevel preserves life and ply fractions no-op identity and native skill levels',()=>{
 const def=Object.values(MONSTERS).find(d=>d.plies)!;assert(def);
 for(const variant of ['living','dead','same-level','unknown-definition'] as const){const all=(['original','core','world','owner'] as const).map(lane=>owner.run(caster,scope=>{resetActorIdCounter(960000);return withSeededRandom(6151,()=>{const body=lane==='owner'?scope.createMonster(def.id,12,caster.team,caster):lane==='world'?w.createMonster(def.id,12,caster.team,caster):population.createMonster(def.id,12,caster.team,caster);body.life=variant==='dead'?0:body.maxLife()*.37;body.plies=Math.floor(body.pliesMax*.4);if(variant==='unknown-definition')body.defId=undefined;
  const level=variant==='same-level'?12:47;if(lane==='owner')scope.relevelActor(body,level);else if(lane==='world')w.relevelActor(body,level);else if(lane==='core')sceneRelevelActor({stampMonsterLevel:population.factory.stampMonsterLevel.bind(population.factory)},body,level);else original.relevelActor.call({stampMonsterLevel:population.factory.stampMonsterLevel.bind(population.factory)},body,level);return {body:summary(body),next:Math.random()};});}));for(const row of all.slice(1))assert.deepEqual(row,all[0]);}
});
check('local relic power and unseated physical caster inheritance remain distinct in all lanes',()=>{
 const inst=makeSkillInstance(SKILLS.raise_dead,20);inst.relicSource='power-proof';const d=instanceDelivery(inst) as SummonDelivery,id=d.monsterId??d.pool![0].id,rank=w.account.reliquary.rank,local=caster;
 w.account.reliquary.rank=4;try{const own=compare(inst,id)[3].body,foreign=population.createMonster(id,24,'enemy');scene.actors.push(foreign);authority.claim(binding,[foreign]);caster=foreign;const wild=compare(inst,id)[3].body;assert.notDeepEqual(own.sheet.getSourceMods('relic:power-proof'),wild.sheet.getSourceMods('relic:power-proof'));caster=local;authority.release(binding,[foreign]);scene.actors.splice(scene.actors.indexOf(foreign),1);}finally{caster=local;w.account.reliquary.rank=rank;}
});
check('factory failure preserves native allocated UID and consumed random without granting receipt',()=>{
 const inst=makeSkillInstance(SKILLS.raise_dead,20),d=instanceDelivery(inst) as SummonDelivery,id=d.monsterId??d.pool![0].id,npcs=population.input.context.npcDialogues,appearance=npcs.appearanceFor;let scope!:NativeSummonPreparationScope;
 const run=(scoped:boolean)=>{resetActorIdCounter(970000);return withSeededRandom(3781,()=>{npcs.appearanceFor=function(){Math.random();throw Error('factory-appearance-fault');};try{assert.throws(()=>scoped?owner.run(caster,s=>{scope=s;s.createMonster(id,20,caster.team,caster);}):population.createMonster(id,20,caster.team,caster),/factory-appearance-fault/);}finally{npcs.appearanceFor=appearance;}const next=population.createMonster(id,20,caster.team,caster);return {id:next.id,next:Math.random()};});};assert.deepEqual(run(true),run(false));assert.throws(()=>scope.createMonster(id,20,caster.team,caster),/Expired/);
});
check('factory selection captures actual receiver before arguments and refuses later replacement',()=>{
 const inst=makeSkillInstance(SKILLS.raise_dead,20),d=instanceDelivery(inst) as SummonDelivery,id=d.monsterId??d.pool![0].id,prior=Object.getOwnPropertyDescriptor(population,'createMonster'),real=population.createMonster;
 try{let reads=0;let expired!:NativeSummonPreparationScope;Object.defineProperty(population,'createMonster',{configurable:true,get(){reads++;return real;}});owner.run(caster,scope=>{expired=scope;const held=scope.createMonster;assert.equal(reads,1);Object.defineProperty(population,'createMonster',{configurable:true,value:()=>{throw Error('replacement must not run');}});const body=held(id,20,caster.team,caster);assert.equal(body.owner,caster);scope.bakeMinionOwnerStats(body,caster,inst);assert.throws(()=>scope.createMonster(id,20,caster.team,caster),/actual population factory/);});Object.defineProperty(population,'createMonster',{configurable:true,get(){reads++;return real;}});const before=reads;assert.throws(()=>expired.createMonster,/Expired/);assert.equal(reads,before,'expired scope refuses before reading its provider');}finally{if(prior)Object.defineProperty(population,'createMonster',prior);else delete (population as any).createMonster;}
});
check('native UID and RNG partial effects survive a failing preparation scope',()=>{
 const inst=makeSkillInstance(SKILLS.raise_dead,20),d=instanceDelivery(inst) as SummonDelivery,id=d.monsterId??d.pool![0].id;
 const run=(scoped:boolean)=>{resetActorIdCounter(950000);return withSeededRandom(9241,()=>{let body!:Actor;try{if(scoped)owner.run(caster,scope=>{body=scope.createMonster(id,20,caster.team,caster);Math.random();throw Error('mid-scope');});else{body=population.createMonster(id,20,caster.team,caster);Math.random();throw Error('mid-scope');}}catch(e){assert.match(String(e),/mid-scope/);}const next=population.createMonster(id,20,caster.team,caster);authority.assertUnclaimed(body);return {body:summary(body),nextId:next.id,next:Math.random()};});};assert.deepEqual(run(true),run(false));
});
});
const result={count:checks.length,receipt:sha(JSON.stringify(checks)),catalogReceipt:sha(JSON.stringify(expanded)),checks,expanded,boundaries:['actual World uses its actual factory/stat receiver without field swaps','owner fixture manually admits the caster and registers actual progression; no substitute combat services','scope receipt permits only pre-insertion preparation; no kill/aura/damage/spawn/ticking/client activation','unclaimed is absence from this authority, not proof about arbitrary invalid or unregistered external censuses']};fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./reports/nativesummonpreparation.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({count:result.count,receipt:result.receipt,catalogReceipt:result.catalogReceipt}));

// Integration evidence is separate so the original eighteen-course receipt stays stable.
const integrationChecks:string[]=[];
function integrationCheck(name:string,fn:()=>void){fn();integrationChecks.push(name);console.log('PASS '+name);}
const integratedWorld=read('src/engine/world.ts');
const restoreWorld=(source:string)=>{const restored=beforeNativeSceneSummonPreparation(source);assert.equal(sha(restored),integrationArchive.sourceHash,'complete summon integration preimage');return restored;};
integrationCheck('immutable summon integration archive and complete World restore to tether checkpoint',()=>{
 assert.equal(sha(JSON.stringify(integrationArchive)),nativeSceneSummonPreparationIntegrationArchiveHash);
 assert.equal(integrationArchive.originalArchiveHash,nativeSceneSummonPreparationArchiveHash);
 assert.equal(sha(beforeNativeSceneDisplacement(integratedWorld)),integrationArchive.afterHash);
 assert.equal(restoreWorld(integratedWorld),execFileSync('git',['show',integrationArchive.integrationCommit+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:2e7}).replaceAll('\r\n','\n'));
});
integrationCheck('bootstrap stays first and World signatures defaults and exact delegates remain native',()=>{
 const sf=ts.createSourceFile('world.ts',integratedWorld,99,true),wc=sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
 assert.equal(sf.statements[0].getText(sf),"import './nativeSceneBootstrap';");
 for(const row of archive.rows){const old=ts.createSourceFile('original.ts','class Old{'+row.before+'}',99,true),m=(old.statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration,n=wc.members.find(n=>n.name?.getText(sf)===row.name) as ts.MethodDeclaration;assert.deepEqual(n.parameters.map(p=>p.getText(sf)),m.parameters.map(p=>p.getText(old)));assert.equal(n.type?.getText(sf),m.type?.getText(old));assert.equal(n.getText(sf),integrationArchive.integration.find(r=>r.name===row.name)!.after);}
});
integrationCheck('every listed summon integration hunk and duplicate is rejected independently',()=>{
 for(const row of integrationArchive.integration){assert.equal(integratedWorld.split(row.after).length,2);const changed=integratedWorld.replace(row.after,row.after.replace(/[A-Za-z]/,'!'));assert.notEqual(changed,integratedWorld);assert.throws(()=>beforeNativeSceneSummonPreparation(changed),/unique exact native summon preparation integration/);assert.throws(()=>beforeNativeSceneSummonPreparation(integratedWorld+'\n'+row.after),/unique exact native summon preparation integration/);}
});
integrationCheck('unrelated source drift survives normalization and fails complete reconstruction',()=>{
 const changed=integratedWorld+'\n// unrelated-source-mutation\n';assert(beforeNativeSceneSummonPreparation(changed).endsWith('// unrelated-source-mutation\n'));assert.throws(()=>restoreWorld(changed),/complete summon integration preimage/);
});
const integrationResult={count:integrationChecks.length,receipt:sha(JSON.stringify(integrationChecks)),checks:integrationChecks,commit:integrationArchive.integrationCommit,worldHash:sha(integratedWorld),originalReceipt:result.receipt,catalogReceipt:result.catalogReceipt};fs.writeFileSync(new URL('./reports/nativesummonpreparation-integration.json',import.meta.url),JSON.stringify(integrationResult,null,2)+'\n');console.log(JSON.stringify(integrationResult));
