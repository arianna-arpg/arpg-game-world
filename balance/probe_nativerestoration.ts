import {beforeNativeSceneGroundFollowUps,groundFollowUpsHistoricalHunk} from './nativeSceneGroundFollowUpsIntegrationFixture';
import {beforeNativeMainVisualSource as historicalMainVisualSource} from './nativeMainVisualSourceFixture';
import {beforeNativeCombatLeafVisual} from './nativeCombatLeafVisualFixture';
import {nativeCombatLeafVisualArchive as currentLeafArchive} from './nativeCombatLeafVisualArchive';
import {createHash as currentLeafHash} from 'node:crypto';
function beforeNativeMainVisualSource(file:string,source:string):string {
 let prior=beforeNativeCombatLeafVisual(file,source);
 return historicalMainVisualSource(file,prior);
}
{
 const file='src/engine/nativeSceneRestoration.ts',raw=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8').replaceAll('\r\n','\n'),row=currentLeafArchive.files.find(row=>row.file===file)!;
 const hash=(text:string)=>currentLeafHash('sha256').update(text).digest('hex');
 assert.equal(hash(raw),row.afterHash,'exact current reviewed leaf source');assert.equal(hash(beforeNativeCombatLeafVisual(file,raw)),row.beforeHash,'complete exact leaf predecessor');
 for(const edit of row.edits){assert.equal(raw.split(edit.after).length,2,'unique current leaf hunk');const changed=raw.replace(edit.after,edit.after.replace(/[A-Za-z]/,'!'));assert.notEqual(changed,raw,'nontrivial current leaf mutation');assert.throws(()=>beforeNativeCombatLeafVisual(file,changed));assert.throws(()=>beforeNativeCombatLeafVisual(file,raw+'\n'+edit.after));}
 const outside=raw+'\n/* unknown outside leaf change */';assert.ok(beforeNativeCombatLeafVisual(file,outside).endsWith('/* unknown outside leaf change */'));assert.notEqual(hash(beforeNativeCombatLeafVisual(file,outside)),row.beforeHash);
 console.log('PASS current leaf source controls: '+row.edits.length+' mutations/duplicates; unrelated source remains visible');
}
import {nativeMainVisualSourceArchive as visualArchive} from './nativeMainVisualSourceArchive';
import {noteRestoreGain} from '../src/engine/feedingCues';
import {skillTargetVoice} from '../src/data/skillTargetVisuals';
import {sceneShowSkillArrival} from '../src/engine/nativeSceneSkillArrival';
/** Four-lane native restoration proof. No stream ticking or complete combat. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {World} from '../src/engine/world';
import {Actor} from '../src/engine/actor';
import {makeSimWorld} from '../src/sim/arena';
import {withSeededRandom} from '../src/core/rng';
import {chance,dist,vec} from '../src/core/math';
import {STATUS_DEFS} from '../src/engine/status';
import {normalizeBrain} from '../src/engine/brain';
import {effectiveSkillLevel,grantedTags,instanceMods,socketSpec,skillContextTags,makeSkillInstance,supportFitsInst} from '../src/engine/skills';
import {sameStory} from '../src/engine/tiers';
import {combatCueFlash} from '../src/engine/combatCues';
import {mod} from '../src/engine/stats';
import {SKILLS} from '../src/data/skills';
import {SUPPORTS} from '../src/data/supports';
import {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';
import {massDormancyPins} from '../src/worldmass/dormancy';
import {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';
import {NativeAreaSceneTethers,freshSceneTetherState} from '../src/worldmass/nativeAreaSceneTethers';
import {NativeAreaSceneRestoration,type NativeSceneRestorationRuntime} from '../src/worldmass/nativeAreaSceneRestoration';
import {sceneAddTether,sceneAttachObjectTethers} from '../src/engine/nativeSceneTethers';
import * as core from '../src/engine/nativeSceneRestoration';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
import {nativeSceneRestorationArchive as archive,nativeSceneRestorationArchiveHash} from './nativeSceneRestorationArchive';
import {beforeNativeSceneSummonPreparation} from './nativeSceneSummonPreparationIntegrationFixture';
import {beforeNativeSceneRestoration} from './nativeSceneRestorationIntegrationFixture';
import {beforeNativeSceneCombatState} from './nativeSceneCombatStateIntegrationFixture';
import {nativeSceneRestorationIntegrationArchive as integrationArchive,nativeSceneRestorationIntegrationArchiveHash} from './nativeSceneRestorationIntegrationArchive';
assert.equal(hash(JSON.stringify(archive)),nativeSceneRestorationArchiveHash);
const source=execFileSync('git',['show',archive.commit+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:20e6});assert.equal(hash(source),archive.worldHash);
const current=fs.readFileSync(new URL('../src/engine/world.ts',import.meta.url),'utf8');assert.equal(beforeNativeSceneSummonPreparation(current),source,'exact newer-layer reversal reaches immutable native World');
const sf=ts.createSourceFile('world.ts',source,99,true),world=sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
const text=fs.readFileSync(new URL('../src/engine/nativeSceneRestoration.ts',import.meta.url),'utf8'),cf=ts.createSourceFile('core.ts',beforeNativeMainVisualSource('src/engine/nativeSceneRestoration.ts',text),99,true);
const emit=(s:string)=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;
for(const row of archive.rows){const m=world.members.find(n=>n.name?.getText(sf)===row.name) as ts.MethodDeclaration;assert.equal(m.getText(sf),row.source);assert.equal(hash(row.source),row.sha256);const body=m.body!,edits:{start:number;end:number}[]=[];function visit(n:ts.Node){if(n.kind===ts.SyntaxKind.ThisKeyword)edits.push({start:n.getStart(sf)-body.getStart(sf),end:n.end-body.getStart(sf)});ts.forEachChild(n,visit);}visit(body);let before=body.getText(sf);for(const e of edits.reverse())before=before.slice(0,e.start)+'host'+before.slice(e.end);const fn=cf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='scene'+row.name[0].toUpperCase()+row.name.slice(1)) as ts.FunctionDeclaration;assert.equal(fn.body!.getText(cf),before,row.name+' exact token-only body');}
const lexical={Actor,chance,dist,vec,STATUS_DEFS,normalizeBrain,effectiveSkillLevel,grantedTags,instanceMods,socketSpec,skillContextTags,sameStory,combatCueFlash};
const original=Function(...Object.keys(lexical),emit('class Original{'+archive.rows.map((r:any)=>r.source).join('\n')+'}\nreturn Original.prototype;'))(...Object.values(lexical));
// Historical source bodies remain immutable. Only these explicitly named
// methods use the separately pinned main successor in the behavior lane.
const visualMain='ea56c7ac4f5f4963dc6ad8ce3cb86bc12b66fa0b';
assert.equal(visualArchive.main,visualMain);
const visualMainText=execFileSync('git',['show',visualMain+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:30e6});
const visualMainFile=ts.createSourceFile('main-world.ts',visualMainText,99,true),visualMainWorld=visualMainFile.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
const visualReferenceEvidence:{name:string;sha256:string}[]=[];
function visualReference(historical:Record<string,Function>,names:string[],bindings:Record<string,unknown>){
 const rows=names.map(name=>{const m=visualMainWorld.members.find(n=>n.name?.getText(visualMainFile)===name);assert(m&&ts.isMethodDeclaration(m));const body=m.getText(visualMainFile);visualReferenceEvidence.push({name,sha256:createHash('sha256').update(body).digest('hex')});return body;});
 const js=ts.transpileModule('class VisualNative{'+rows.join('\n')+'}\nreturn VisualNative.prototype;',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 const overrides=Function(...Object.keys(bindings),js)(...Object.values(bindings));return Object.defineProperties(Object.create(historical),Object.fromEntries(names.map(name=>[name,Object.getOwnPropertyDescriptor(overrides,name)!]))) as Record<string,Function>;
}

const nativeReference=visualReference(original,['applyRestore','applyHealChained'],{...lexical,noteRestoreGain,skillTargetVoice});

const oldTetherSource=execFileSync('git',['show',archive.commit+':src/worldmass/nativeAreaSceneTethers.ts'],{encoding:'utf8'}),tf=ts.createSourceFile('old.ts',oldTetherSource,99,true);
const oldTetherCode=tf.statements.filter(n=>!ts.isImportDeclaration(n)).map(n=>n.getText(tf).replace(/^export /,'')).join('\n');
const OldTethers=Function('sceneAddTether','sceneAttachObjectTethers',emit(oldTetherCode)+'\nreturn NativeAreaSceneTethers;')(sceneAddTether,sceneAttachObjectTethers);
const names=archive.rows.map((r:any)=>r.name) as (keyof core.NativeSceneRestorationApi)[],checks:string[]=[],receipts:any[]=[],visualReceipts:any[]=[];
const checked=(name:string,fn:()=>void)=>{fn();checks.push(name);console.log('PASS '+name);};
withSeededRandom(33417,()=>{
 const w=makeSimWorld('warrior',33417),raw=freshAssemblyInput(w,w.zone);
 const campaign=raw.campaign as typeof raw.campaign & Pick<World,'partyRows'|'seatOfRoot'>;
 let rootReads=0,rootCalls=0;let rootMethod:World['seatOfRoot']=function(this:typeof campaign,...args){assert.equal(this,campaign);rootCalls++;return w.seatOfRoot(...args);};
 const inherited=Object.create(Object.getPrototypeOf(campaign),{partyRows:{enumerable:true,configurable:true,get(){return w.partyRows;},set(v){w.partyRows=v;}},seatOfRoot:{configurable:true,get(){rootReads++;return rootMethod;}}});
 Object.setPrototypeOf(campaign,inherited);
 const area=new NativeAreaSceneAssembly(raw),{scene,geometry}=area.input,objective=area.objectiveController;
 const authority=new NativeAreaActorAuthority<NativeSceneRestorationRuntime>(campaign),state=freshSceneTetherState();
 const tethers=new NativeAreaSceneTethers({scene,campaign,state,authority}),owner=new NativeAreaSceneRestoration({scene,geometry,objective,tethers,campaign,authority});
 const binding=authority.register(scene,{tethers,restoration:owner});authority.claim(binding,scene.actors);
 const player=scene.player,initial=[...scene.actors];let created:Actor[]=[],labels=new Map<Actor,string>();
 const label=(a:Actor)=>a===player?'player':labels.get(a)??'unknown';
 const id=(n:number)=>label(scene.actors.find(a=>a.id===n)!);
 function plain(v:any,seen=new Set<object>()):any{if(v instanceof Actor)return {$actor:label(v)};if(v===undefined)return {$undefined:1};if(typeof v==='number'&&!Number.isFinite(v))return {$number:String(v)};if(v===null||typeof v!=='object')return v;if(seen.has(v))return {$ref:true};seen.add(v);if(v instanceof Set)return [...v];if(v instanceof Map)return [...v].map(([k,x])=>[k,plain(x,seen)]);if(Array.isArray(v))return v.map(x=>plain(x,seen));return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,plain(x,seen)]));}
 function body(name:string,team:Actor['team']='player'){
  const a=area.input.population.createMonster('skeleton_warrior',5,team);a.pos=vec(500+created.length*30,500);a.owner=team==='player'?player:undefined;
  a.sheet.setSource('resource-fixture',[mod('energyShield','flat',100),mod('mana','flat',100),mod('poise','flat',80)]);a.life=a.maxLife()*.5;a.mana=10;a.es=10;a.poise=10;a.esDelay=4;
  labels.set(a,name);created.push(a);scene.actors.push(a);authority.claim(binding,[a]);return a;
 }
 const skill=makeSkillInstance(Object.values(SKILLS).find(d=>d.effects.some(f=>f.type==='heal'))!,10),tags=skill.def.tags;
 const arrival={get flashes(){return geometry.flashes;},get seats(){return campaign.seats;},get localSeat(){return campaign.localSeat;},get account(){return campaign.account;}};
 const makeHost=(lane:'native'|'core')=>{const h:any={get actors(){return scene.actors;},get flashes(){return geometry.flashes;},get texts(){return objective.input.state.texts;},get tethers(){return state.tethers;},showSkillArrival:(...args:Parameters<World['showSkillArrival']>)=>sceneShowSkillArrival(arrival,...args),get partyRows(){return campaign.partyRows;},get seats(){return campaign.seats;},text:(...a:Parameters<World['text']>)=>objective.text(...a),seatOfRoot:(...a:Parameters<World['seatOfRoot']>)=>campaign.seatOfRoot(...a)};for(const name of names)h[name]=(...args:any[])=>lane==='native'?nativeReference[name].apply(h,args):(core as any)['scene'+name[0].toUpperCase()+name.slice(1)](h,...args);return h;};
 const hosts={native:makeHost('native'),core:makeHost('core')};type Lane='native'|'core'|'world'|'owner';
 function worldScope<T>(fn:()=>T):T{const saved={actors:w.actors,texts:w.texts,tethers:w.tethers,flashes:w.flashes};try{w.actors=scene.actors;w.texts=objective.input.state.texts;w.tethers=state.tethers;w.flashes=geometry.flashes;return fn();}finally{Object.assign(w,saved);}}
 function invoke(lane:Lane,name:keyof core.NativeSceneRestorationApi,args:any[]){return lane==='owner'?(owner[name] as Function).apply(owner,args):lane==='world'?worldScope(()=>((w as any)[name] as Function).apply(w,args)):(hosts[lane][name] as Function).apply(hosts[lane],args);}
 function snapshot(){return {texts:plain(objective.input.state.texts),flashes:plain(geometry.flashes),tethers:plain(state.tethers),actors:created.map(a=>({name:label(a),life:a.life,mana:a.mana,es:a.es,poise:a.poise,esDelay:a.esDelay,absorb:a.absorb,absorbTimer:a.absorbTimer,streams:plain(a.restoreStreams),events:plain(a.gainEvents),statuses:plain(a.statuses),statusMods:a.statuses.map(s=>[s.id,plain(a.sheet.getSourceMods('status:'+s.id))]),threat:[...a.threat].map(([n,v])=>[id(n),v])}))};}
 type Course={op:keyof core.NativeSceneRestorationApi;args:any[];verify?:(v:any)=>void;observe?:()=>any;error?:RegExp;cleanup?:()=>void};
 function compare(name:string,prepare:(lane:Lane)=>Course){const outcomes=[],visuals:any[]=[];for(const lane of ['native','core','world','owner'] as const){created=[];labels=new Map();scene.actors=[...initial];state.tethers=[];objective.input.state.texts=[];geometry.flashes=[];w.partyRows=[];
   const out=withSeededRandom(45137,()=>{const c=prepare(lane);try{let value:any,error:string|undefined;try{value=invoke(lane,c.op,c.args);}catch(e){error=(e as Error).message;}if(c.error)assert.match(error??'',c.error,name+' '+lane);else assert.equal(error,undefined,name+' '+lane);c.verify?.(value);return {value:plain(value),error,state:snapshot(),observe:plain(c.observe?.()),next:Math.random()};}finally{c.cleanup?.();}});outcomes.push(out);visuals.push(created.map(a=>({name:label(a),restoreGains:plain(a.restoreGains),resourceFlows:plain(a.resourceFlows)})));authority.release(binding,created);scene.actors=[...initial];}
  for(let i=1;i<outcomes.length;i++)assert.deepEqual(outcomes[i],outcomes[0],name+' lane '+i);for(let i=1;i<visuals.length;i++)assert.deepEqual(visuals[i],visuals[0],name+' restore cues lane '+i);visualReceipts.push([name,visuals[0]]);receipts.push([name,outcomes[0]]);return outcomes[0];
 }
 const cap=(a:Actor,n:number)=>{a.gainEvents=Array.from({length:n},()=>({kind:'restore' as const,id:'mana',depth:0,n:1}));};
 checked('all native resource ceilings, negative/zero amounts, event cap and noEvent preserve references',()=>{
  for(const resource of ['life','mana','es','poise'] as const)for(const amount of [-20,0,30,1e6])for(const noEvent of [false,true])for(const full of [false,true])compare(resource+'/'+amount+'/'+noEvent+'/'+full,()=>{const a=body('target');cap(a,full?64:0);return {op:'applyRestore',args:[a,{resource,amount,resetEsDelay:true},{noEvent,tags}],observe:()=>a.gainEvents.at(-1)?.tags===tags,verify:()=>{assert.ok(a.gainEvents.length<=64);if(resource==='es')assert.equal(a.esDelay,0);}};});
 });
 checked('native restore-stream catalog, surge/settle stats, feeding cues and crit hints stay exact',()=>{
  for(const def of Object.values(SKILLS))for(const [index,fx]of def.effects.entries())if(fx.type==='restoreOverTime')for(const rich of [false,true])compare('stream '+def.id+'/'+index+'/'+rich,()=>{const target=body('target'),caster=body('caster'),inst=makeSkillInstance(def,9);if(rich)caster.sheet.setSource('stream-mods',[mod('restorePctMax','flat',.2),mod('pourPct_surge','flat',.3),mod('pourPct_settle','flat',.1),mod('restorePower','increased',.25),mod('effectDuration','more',-.9)]);return {op:'startRestoreStream',args:[target,caster,inst,fx,rich?3:0,rich?2:undefined],observe:()=>({tags:target.gainEvents.at(-1)?.tags===def.tags,cue:target.restoreStreams.at(-1)?.feedingCue===(fx.feedingCue??def.feedingCue)})};});
  for(const mult of [0,2])compare('explicit crit '+mult,()=>{const a=body('target'),c=body('caster');const read=c.sheet.get;c.sheet.get=function(stat:any,...args:any[]){if(stat==='critChance'||stat==='critMulti')throw Error('unexpected crit read');return Reflect.apply(read,this,[stat,...args]);};return {op:'startRestoreStream',args:[a,c,skill,{resource:'life',amount:10,duration:0,feedingCue:false},0,mult],observe:()=>a.restoreStreams.at(-1)?.feedingCue,cleanup:()=>{c.sheet.get=read;}};});
 });
 checked('installed native healing and actual Mending Echoes preserve crit, stream and gain behavior',()=>{
  for(const def of Object.values(SKILLS))for(const [index,fx]of def.effects.entries())if(fx.type==='heal')compare('heal '+def.id+'/'+index,()=>{const c=body('caster'),a=body('target'),inst=makeSkillInstance(def,7);return {op:'applyHeal',args:[c,inst,a,fx],observe:()=>a.gainEvents.at(-1)?.tags===def.tags};});
  const healDef=Object.values(SKILLS).find(d=>d.effects.some(f=>f.type==='heal')&&supportFitsInst(SUPPORTS.mending_echoes,makeSkillInstance(d,5)))!;
  compare('native mending conversion',()=>{const c=body('caster'),a=body('target'),inst=makeSkillInstance(healDef,5);inst.sockets[0]={def:SUPPORTS.mending_echoes,level:4};const old=a.life;return {op:'applyHeal',args:[c,inst,a,{amount:40}],verify:v=>{assert.equal(v,0);assert.equal(a.life,old);assert.equal(a.restoreStreams.length,1);assert.equal(a.gainEvents.length,0);}};});
  for(const quiet of [false,true])compare('guaranteed crit quiet '+quiet,()=>{const c=body('caster'),a=body('target');c.sheet.setSource('crit',[mod('critChance','flat',2),mod('overheal','flat',1)]);a.life=a.maxLife()-2;return {op:'applyHeal',args:[c,skill,a,{amount:999},1,quiet],verify:()=>{assert.ok(a.absorb>0);assert.equal(objective.input.state.texts.length,quiet?0:1);assert.equal(geometry.flashes.length,quiet?1:2);if(!quiet){const cue=geometry.flashes[0];assert.notEqual(cue.pos,a.pos);assert.deepEqual(cue.pos,a.pos);assert.equal(cue.combatCue?.style,'mend');}}};});
  for(const mode of ['dead','downed','exclude','zero'] as const)compare('heal refusal '+mode,()=>{const c=body('caster'),a=mode==='exclude'?c:body('target');if(mode==='dead')a.dead=true;if(mode==='downed')a.downed=true;return {op:'applyHeal',args:[c,skill,a,{amount:mode==='zero'?0:20,excludeCaster:mode==='exclude'}],verify:v=>assert.equal(v,0)};});
 });
 checked('absorb maxima and healer threat update actual local bodies',()=>{
  for(const amount of [5,80])for(const duration of [2,10])compare('ward '+amount+'/'+duration,()=>{const a=body('target');a.absorb=20;a.absorbTimer=6;return {op:'grantAbsorb',args:[a,amount,duration],verify:()=>{assert.equal(a.absorb,Math.max(20,amount));assert.equal(a.absorbTimer,Math.max(6,duration));}};});
  compare('healing threat',()=>{const c=body('caster'),a=body('target'),e=body('enemy','enemy'),other=body('elsewhere','enemy');e.aiTargetId=a.id;other.aiTargetId=c.id;return {op:'applyHeal',args:[c,skill,a,{amount:30}],verify:()=>{assert.ok((e.threat.get(c.id)??0)>0);assert.equal(other.threat.has(c.id),false);}};});
 });
 checked('native chain chooses weakest local same-story targets, raw arcs and decay without replacing queue',()=>{
  for(const excludeCaster of [false,true])compare('chain exclusions '+excludeCaster,()=>{const c=body('caster'),a=body('first'),b=body('weak'),far=body('far'),tier=body('tier'),dead=body('dead'),down=body('down'),hidden=body('hidden'),construct=body('construct'),enemy=body('enemy','enemy');
   c.life=c.maxLife()*.01;b.life=b.maxLife()*.1;for(const x of [far,tier,dead,down,hidden,construct,enemy])x.life=1;far.pos={x:2000,y:2000};tier.tier=1;dead.dead=true;down.downed=true;hidden.untargetable=true;construct.construct={} as Actor['construct'];const q=state.tethers;
   return {op:'applyHealChained',args:[c,skill,a,{amount:20,chain:2,excludeCaster}],observe:()=>({same:q===state.tethers,owner:state.tethers.every(t=>t.owner===c),rawEndpoints:state.tethers[0]?.a===a}),verify:()=>{assert.equal(state.tethers,q);assert.equal(state.tethers[0].b,excludeCaster?b:c);assert.ok(state.tethers.every(t=>!['far','tier','dead','down','hidden','construct','enemy'].includes(label(t.b))));}};
  });
  compare('primary dead still permits native later chain',()=>{const c=body('caster'),a=body('dead'),b=body('next');c.life=c.maxLife();a.dead=true;b.life=1;return {op:'applyHealChained',args:[c,skill,a,{amount:20,chain:1}],verify:()=>{assert.equal(state.tethers[0].a,a);assert.equal(state.tethers[0].b,b);assert.ok(b.life>1);}};});
 });
 checked('native cleanse and ring affliction stack/duration policy retain real sheet sources',()=>{
  for(const portion of [-1,0,.5,1,2])compare('ring '+portion,()=>{const a=body('target');a.applyStatus('sunscorched',0,1,'audit');a.applyStatus('sunscorched',0,1,'audit');a.applyStatus('sunscorched',0,1,'audit');a.applyStatus('chill',4,1,'audit');const beneficial=Object.entries(STATUS_DEFS).find(([,d])=>d.beneficial&&!d.mods)?.[0]??'unhorsed';a.applyStatus(beneficial,0,1,'audit');return {op:'ringAfflictions',args:[a,portion]};});
  for(const count of [0,1,10])compare('cleanse '+count,()=>{const a=body('target');a.applyStatus('poison',5,1,'audit');a.applyStatus('bleed',5,1,'audit');a.applyStatus('chill',4,1,'audit');return {op:'cleanseActor',args:[a,count]};});
 });
 checked('actual area-heal effect catalogs, acceptance and crossing ledgers remain native',()=>{
  const defs=Object.values(SKILLS).filter(d=>d.effects.some(f=>f.type==='heal'||f.type==='cleanse'));
  for(const def of defs)compare('area '+def.id,()=>{const c=body('caster'),a=body('target'),b=body('denied'),inst=makeSkillInstance(def,4),once=new Set<number>(),calls:string[]=[];a.applyStatus('poison',3,1,'audit');b.applyStatus('chill',3,1,'audit');return {op:'healAlliesInArea',args:[c,inst,(x:Actor)=>{calls.push(label(x));return x!==b;},1,true,once],observe:()=>({once:[...once].map(id),calls}),verify:()=>assert.equal(once.has(b.id),false)};});
  compare('acceptance fails after first mend before later ledger',()=>{const c=body('caster'),a=body('target'),b=body('later'),once=new Set<number>();c.life=c.maxLife();let calls=0;return {op:'healAlliesInArea',args:[c,skill,(x:Actor)=>{if(x===b)throw Error('later acceptance');calls++;return x===a;},1,true,once],error:/later acceptance/,observe:()=>({once:[...once].map(id),calls}),verify:()=>assert.ok(once.has(a.id))};});
 });
 checked('native text attribution preserves suppressed old-row, explicit-seat and hosted short circuits',()=>{
  for(const mode of ['solo','hosted','empty','null-explicit','absent-explicit','keeper'] as const)compare('credit '+mode,()=>{const by=body('credited'),p={pos:vec(1,2),text:'prior',color:'#abc',life:1,maxLife:1,size:12};objective.input.state.texts=mode==='empty'?[]:[p];if(mode==='solo')w.partyRows=null;const keeper=w.localSeat.keeper;if(mode==='keeper')w.localSeat.keeper={reviveSec:1};const seatId=mode==='null-explicit'?null:mode==='absent-explicit'?'not-present':undefined;return {op:'creditFloat',args:[by,seatId],cleanup:()=>{w.localSeat.keeper=keeper;}};});
  for(const suppressed of [false,true])compare('seatText '+suppressed,lane=>{const by=body('credited'),texts=objective.input.state.texts;objective.text(vec(1,2),'prior','#abc');const provider:any=lane==='world'?w:objective,prior=provider.text;if(suppressed)provider.text=function(){assert.equal(this,provider);};return {op:'seatText',args:[by,vec(20,30),'new','#def'],observe:()=>({same:texts===objective.input.state.texts}),verify:()=>{assert.equal(texts.length,suppressed?1:2);assert.equal(texts.at(-1)!.seat,w.localSeat.id);},cleanup:()=>provider.text=prior};});
  compare('text throws before attribution',lane=>{const by=body('credited');objective.text(vec(1,2),'prior','#abc');const provider:any=lane==='world'?w:objective,prior=provider.text;provider.text=()=>{throw Error('text failed');};return {op:'seatText',args:[by,vec(1,2),'new','#abc'],error:/text failed/,verify:()=>assert.equal(objective.input.state.texts[0].seat,undefined),cleanup:()=>provider.text=prior};});
 });
 checked('native frozen-array append failure retains primary heal and unchanged raw queue',()=>{
  compare('frozen chain append',()=>{const c=body('caster'),a=body('first'),b=body('next');c.life=c.maxLife();b.life=1;const before=a.life,q=Object.freeze([]) as unknown as World['tethers'];state.tethers=q;return {op:'applyHealChained',args:[c,skill,a,{amount:20,chain:1}],error:/extensible|read only|frozen/i,verify:()=>{assert.ok(a.life>before);assert.equal(state.tethers,q);assert.equal(q.length,0);assert.equal(b.life,1);}};});
 });
 checked('native later-chain failures retain arc and prior heal; gain queue failure retains resources',()=>{
  compare('second target fails',()=>{const c=body('caster'),a=body('first'),b=body('next');c.life=c.maxLife();b.life=1;b.healBy=function(){assert.equal(this,b);throw Error('later heal failure');};const before=a.life;return {op:'applyHealChained',args:[c,skill,a,{amount:20,chain:1}],error:/later heal failure/,verify:()=>{assert.ok(a.life>before);assert.equal(state.tethers.length,1);assert.equal(state.tethers[0].b,b);}};});
  compare('gain push fails after restore',()=>{const a=body('target');a.gainEvents=Object.freeze([]) as unknown as Actor['gainEvents'];const before=a.mana;return {op:'applyRestore',args:[a,{resource:'mana',amount:20}],error:/extensible|read only|frozen/i,verify:()=>assert.ok(a.mana>before)};});
 });
 function peer(){const ar=new NativeAreaSceneAssembly(freshAssemblyInput(w,w.zone,campaign));ar.input.scene.actors=[];const s=freshSceneTetherState(),q=new NativeAreaSceneTethers({scene:ar.input.scene,campaign,state:s,authority}),r=new NativeAreaSceneRestoration({scene:ar.input.scene,geometry:ar.input.geometry,objective:ar.objectiveController,tethers:q,campaign,authority}),bind=authority.register(ar.input.scene,{tethers:q,restoration:r});return {area:ar,state:s,tethers:q,owner:r,binding:bind};}
 checked('old construction-only contract negative control exposes native appended arc to peer',()=>{
  const a=new NativeAreaSceneAssembly(freshAssemblyInput(w,w.zone,campaign)),b=new NativeAreaSceneAssembly(freshAssemblyInput(w,w.zone,campaign));b.input.scene.actors=[];const shared:World['tethers']=[],sa={tethers:shared},sb={tethers:shared};
  new OldTethers({scene:a.input.scene,campaign,state:sa,authority});new OldTethers({scene:b.input.scene,campaign,state:sb,authority});assert.equal(sa.tethers,sb.tethers);
  const c=a.input.population.createMonster('skeleton_warrior',5,'player'),first=a.input.population.createMonster('skeleton_warrior',5,'player'),next=a.input.population.createMonster('skeleton_warrior',5,'player');for(const x of [c,first,next])x.pos=vec(500,500);c.life=c.maxLife();first.life=first.maxLife()*.5;next.life=1;
  const old={actors:w.actors,tethers:w.tethers};try{w.actors=[c,first,next];w.tethers=shared;(w as any).applyHealChained(c,skill,first,{amount:20,chain:1},1,true);}finally{Object.assign(w,old);}assert.equal(sb.tethers.length,1);assert.equal(sb.tethers[0].b,next);
 });
 checked('new tether ownership rejects initial and late peer aliases without copying actual arrays',()=>{
  const other=peer(),q=state.tethers,bq=other.state.tethers;assert.equal(Object.getOwnPropertyDescriptor(state,'tethers')?.enumerable,true);assert.equal(Object.getOwnPropertyDescriptor(state,'tethers')?.configurable,false);
  assert.throws(()=>new NativeAreaSceneTethers({scene,campaign,state:{tethers:q},authority}),/exclusively owned initial/);
  assert.throws(()=>{other.state.tethers=q;},/another area owner/);assert.equal(other.state.tethers,bq);assert.equal(state.tethers,q);
  const third:World['tethers']=[];state.tethers=third;assert.equal(state.tethers,third);assert.throws(()=>{other.state.tethers=third;},/another area owner/);assert.equal(other.state.tethers,bq);
  state.tethers=q;assert.equal(state.tethers,q);state.tethers=third;state.tethers=third;assert.equal(state.tethers,third);
  assert.throws(()=>Object.defineProperty(state,'tethers',{value:[]}),/redefine|configurable/i);
  const old=state.tethers;created=[];labels=new Map();const a=body('endpoint');tethers.addTether(player,a,{link:'target',dps:1},skill,player);assert.notEqual(state.tethers,old);assert.equal(old.length,0);assert.throws(()=>{other.state.tethers=old;},/another area owner/);const frozen=Object.freeze([]) as unknown as World['tethers'];state.tethers=frozen;tethers.addTether(player,a,{link:'target',dps:1},skill,player);assert.notEqual(state.tethers,frozen);assert.equal(frozen.length,0);authority.release(binding,created);created=[];scene.actors=[...initial];
 });
 checked('failed tether constructors consume neither state nor array; nonconfigurable slots refuse',()=>{
  const q:World['tethers']=[],s={tethers:q};Object.defineProperty(s,'tethers',{configurable:false});assert.throws(()=>new NativeAreaSceneTethers({scene,campaign,state:s,authority}),/configurable mutable queue slot/);
  const available={tethers:q};assert.throws(()=>new NativeAreaSceneTethers({scene,campaign:{seats:campaign.seats},state:available,authority}),/identical campaign/);assert.doesNotThrow(()=>new NativeAreaSceneTethers({scene,campaign,state:available,authority}));
  const late={tethers:[] as World['tethers']},invalid={...scene,actors:null} as unknown as typeof scene;assert.throws(()=>new NativeAreaSceneTethers({scene:invalid,campaign,state:late,authority}),/actual scene census/);assert.doesNotThrow(()=>new NativeAreaSceneTethers({scene,campaign,state:late,authority}));
  const frozen=Object.freeze([]) as unknown as World['tethers'],f={tethers:frozen};assert.doesNotThrow(()=>new NativeAreaSceneTethers({scene,campaign,state:f,authority}));assert.equal(f.tethers,frozen);
 });
 checked('two actual retained areas append and replace only their own effects and text rows',()=>{
  const other=peer();created=[];labels=new Map();state.tethers=[];objective.input.state.texts=[];const c=body('caster'),a=body('first'),b=body('next');c.life=c.maxLife();b.life=1;
  const q=state.tethers,oq=other.state.tethers;owner.applyHealChained(c,skill,a,{amount:20,chain:1});assert.equal(state.tethers,q);assert.equal(q.length,1);assert.equal(other.state.tethers,oq);assert.equal(oq.length,0);assert.equal(other.area.objectiveController.input.state.texts.length,0);assert.ok(objective.input.state.texts.length>0);
  const arc=q[0];tethers.addTether(c,b,{link:'target',dps:1},skill,c);assert.notEqual(state.tethers,q);assert.equal(q[0],arc);assert.equal(q.length,1);assert.equal(other.state.tethers.length,0);
  authority.release(binding,created);created=[];scene.actors=[...initial];
 });
 checked('inherited live campaign root methods preserve receiver and lazy native attribution branches',()=>{
  const reads=rootReads;const another=new NativeAreaSceneRestoration({scene,geometry,objective,tethers,campaign,authority});assert.ok(another);assert.equal(rootReads,reads,'constructor does not evaluate inherited capability');
  created=[];labels=new Map();const by=body('credited root'),calls=rootCalls;objective.input.state.texts=[];w.partyRows=[];owner.creditFloat(by);w.partyRows=null;objective.text(vec(1,2),'prior','#abc');owner.creditFloat(by);w.partyRows=[];owner.creditFloat(by,null);owner.creditFloat(by,'explicit');assert.equal(rootReads,reads);assert.equal(rootCalls,calls);
  const prior=rootMethod;let replacementCalls=0;rootMethod=function(this:typeof campaign,...args){assert.equal(this,campaign);replacementCalls++;return prior.apply(this,args);};owner.creditFloat(by);assert.equal(replacementCalls,1);assert.equal(rootReads,reads+1);assert.equal(rootCalls,calls+1);assert.equal(objective.input.state.texts.at(-1)!.seat,w.localSeat.id);rootMethod=prior;
  authority.release(binding,created);created=[];scene.actors=[...initial];
 });
 checked('local summoned source keeps campaign attribution to a root physically in another area',()=>{
  const other=peer();created=[];labels=new Map();const by=body('local summoned source');assert.equal(by.owner,player);scene.actors=scene.actors.filter(a=>a!==player);other.area.input.scene.actors.push(player);authority.transfer(player,binding,other.binding);
  try{assert.equal(authority.seatsFor(binding).length,0);assert.equal(authority.require(by).scene,scene);objective.input.state.texts=[];w.partyRows=[];owner.seatText(by,vec(1,2),'remote root local cue','#abc');assert.equal(objective.input.state.texts.at(-1)!.seat,w.localSeat.id);assert.equal(other.area.objectiveController.input.state.texts.length,0);}
  finally{other.area.input.scene.actors=other.area.input.scene.actors.filter(a=>a!==player);scene.actors.push(player);authority.transfer(player,other.binding,binding);authority.release(binding,created);created=[];scene.actors=[...initial];}
 });
 checked('registered service identity and physical actors prevent orphan or neighboring restoration',()=>{
  const other=peer(),orphan=new NativeAreaSceneRestoration({scene,geometry,objective,tethers,campaign,authority});created=[];labels=new Map();const c=body('caster'),a=body('target'),before=a.life;
  assert.throws(()=>orphan.applyHeal(c,skill,a,{amount:20}),/exact registered owners/);assert.equal(a.life,before);
  const foreign=other.area.input.population.createMonster('skeleton_warrior',5,'player');foreign.pos={...a.pos};other.area.input.scene.actors.push(foreign);authority.claim(other.binding,[foreign]);assert.throws(()=>owner.applyHeal(c,skill,foreign,{amount:20}),/actual physical/);assert.throws(()=>owner.applyHeal(foreign,skill,a,{amount:20}),/actual physical/);
  objective.input.state.texts=[];w.partyRows=null;assert.doesNotThrow(()=>owner.creditFloat(foreign));w.partyRows=[];assert.doesNotThrow(()=>owner.creditFloat(foreign));objective.text(vec(1,2),'prior','#abc');assert.doesNotThrow(()=>owner.creditFloat(foreign,'explicit'));assert.equal(objective.input.state.texts.at(-1)!.seat,'explicit');assert.throws(()=>owner.seatText(foreign,vec(1,2),'text first','#def'),/actual physical/);assert.equal(objective.input.state.texts.at(-1)!.text,'text first');assert.equal(objective.input.state.texts.at(-1)!.seat,undefined);
  authority.release(binding,created);created=[];scene.actors=[...initial];
 });
 checked('enumerable actual queue slot exposes only live dependencies to native dormancy scanning',()=>{
  created=[];labels=new Map();state.tethers=[];const a=body('pin first','enemy'),b=body('pin second','enemy'),sentinel=body('unlinked','enemy');
  const scan=makeSimWorld('warrior',33519),tracked=new Map([['a',a],['b',b],['sentinel',sentinel]]);scan.actors=[a,b,sentinel];scan.tethers=[];
  Object.defineProperty(scan,'restorationQueueAudit',{value:state,enumerable:true,configurable:true});
  assert.equal(massDormancyPins(scan,tracked).size,0);
  tethers.addTether(a,b,{link:'target',dps:1},skill,player);const actual=state.tethers,live=massDormancyPins(scan,tracked);assert.equal(state.tethers,actual);assert.ok(live.has(a));assert.ok(live.has(b));assert.equal(live.has(sentinel),false);
  state.tethers=[];assert.equal(massDormancyPins(scan,tracked).size,0);assert.equal(actual.length,1);Reflect.deleteProperty(scan,'restorationQueueAudit');
  authority.release(binding,created);created=[];scene.actors=[...initial];
 });
 checked('real carried form accepts restoration while hidden flesh cannot receive physical effects',()=>{
  const flesh=w.localSeat.actor;w.executeSkill(flesh,makeSkillInstance(SKILLS.form_of_the_dire_wolf,1),flesh.pos);const form=w.localSeat.actor;assert.notEqual(form,flesh);assert.equal(form.possession?.huskMode,'carried');authority.release(binding,[flesh]);scene.actors=scene.actors.filter(a=>a!==flesh);scene.actors.push(form);scene.player=form;authority.claim(binding,[form]);assert.equal(authority.require(flesh).scene,scene);
  assert.throws(()=>owner.applyRestore(flesh,{resource:'life',amount:20}),/actual physical/);assert.throws(()=>owner.startRestoreStream(form,flesh,skill,{resource:'life',amount:10,duration:2},0),/actual physical/);form.life=form.maxLife()*.5;const before=form.life;owner.applyRestore(form,{resource:'life',amount:20});assert.ok(form.life>before);
 });
 const report={visualReceipt:hash(JSON.stringify(visualReceipts)),visualMain,visualReferenceEvidence,commit:archive.commit,methods:names.length,checks,cases:receipts.length,receipt:hash(JSON.stringify(receipts)),worldLane:'integrated actual World delegates with actors/texts/tethers/flashes temporarily bound to matched area stores for algorithm comparison; separate ordinary World courses prove adapter wiring',boundaries:'restoration application, stream construction, local arcs and attribution only; no stream ticking, sympathy replay, aura/buff application, full combat, detached caster lifetime or publication'};
 fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./reports/nativerestoration.json',import.meta.url),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(new URL('./reports/nativerestoration-visuals.json',import.meta.url),JSON.stringify({visualMain,visualReferenceEvidence,cases:visualReceipts.length,receipt:report.visualReceipt,rows:visualReceipts},null,2)+'\n');console.log('PASS native restoration',report);
});

// Separate ordinary-World integration courses never mirror retained-area stores.

// Map an older integration mutation through only the declared visual source
// changes. Overlapping exact hunks now belong to the stricter visual guard;
// every untouched hunk must still reach its original historical guard.
function visualWorldHunk(raw:string,historical:string,legacy:RegExp){
 let text=beforeNativeMainVisualSource('src/engine/world.ts',raw),start=text.indexOf(historical),end=start+historical.length,overlap=false;
 assert.equal(text.split(historical).length,2,'unique historical mutation hunk');
 for(const edit of [...visualArchive.files.find(r=>r.file==='src/engine/world.ts')!.edits].reverse()){
  const at=text.indexOf(edit.before),stop=at+edit.before.length,delta=edit.after.length-edit.before.length;assert.equal(text.split(edit.before).length,2,'exact visual forward context');
  if(stop<=start){start+=delta;end+=delta;}else if(at<end){start=Math.min(start,at);end=Math.max(end,stop)+delta;overlap=true;}
  text=text.slice(0,at)+edit.after+text.slice(stop);
 }
 assert.equal(text,beforeNativeSceneGroundFollowUps(raw),'whole visual source after exact forward mapping');
 const mapped=text.slice(start,end);
 // An expanded overlap may begin in an unchanged older delegate. Mutate a
 // byte inside an exact visual after-hunk, not merely the expanded prefix.
 const visualEdit=overlap?visualArchive.files.find(r=>r.file==='src/engine/world.ts')!.edits.find(edit=>mapped.includes(edit.after)):undefined;
 if(overlap)assert.ok(visualEdit,'overlap includes a complete declared visual after-hunk');
 const target=visualEdit?.after??mapped,at=mapped.indexOf(target),letter=target.search(/[A-Za-z]/);
 assert.ok(letter>=0,'mutation has a source letter');
 const changed=at+letter,mutated=mapped.slice(0,changed)+'!'+mapped.slice(changed+1);
 return groundFollowUpsHistoricalHunk(raw,mapped,mutated,overlap?/unique exact native main visual source/:legacy);
}

const integrationChecks:string[]=[];
const integrationCheck=(name:string,fn:()=>void)=>{withSeededRandom(33701+integrationChecks.length,fn);integrationChecks.push(name);console.log('PASS '+name);};
const nativeCall=(w:World,name:keyof core.NativeSceneRestorationApi,...args:any[])=>(Reflect.get(w,name) as Function).apply(w,args);
integrationCheck('exact restoration source reverses the complete reviewed displacement preimage',()=>{
 assert.equal(hash(JSON.stringify(integrationArchive)),nativeSceneRestorationIntegrationArchiveHash);assert.equal(integrationArchive.originalArchiveHash,nativeSceneRestorationArchiveHash);assert.equal(hash(beforeNativeSceneCombatState(current)),integrationArchive.afterHash);assert.equal(hash(beforeNativeSceneRestoration(current)),integrationArchive.sourceHash);assert.equal(beforeNativeSceneRestoration(current),execFileSync('git',['show',integrationArchive.integrationCommit+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:20e6}),'complete immutable displacement World preimage');
 assert.equal(ts.createSourceFile('current.ts',current,99,true).statements[0].getText(),"import './nativeSceneBootstrap';");
 const parsed=ts.createSourceFile('current.ts',beforeNativeMainVisualSource('src/engine/world.ts',current),99,true),cl=parsed.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
 for(const row of archive.rows){const old=world.members.find(n=>n.name?.getText(sf)===row.name) as ts.MethodDeclaration,m=cl.members.find(n=>n.name?.getText(parsed)===row.name) as ts.MethodDeclaration;assert.deepEqual(m.parameters.map(p=>p.getText(parsed)),old.parameters.map(p=>p.getText(sf)));assert.equal(m.type?.getText(parsed),old.type?.getText(sf));assert.deepEqual(m.modifiers?.map(n=>n.getText(parsed)),old.modifiers?.map(n=>n.getText(sf)));}
 for(const row of integrationArchive.integration){const h=visualWorldHunk(current,row.after,/unique exact native restoration integration/);assert.equal(current.split(h.text).length,2);assert.throws(()=>beforeNativeSceneRestoration(current.replace(h.text,h.mutated)),h.guard);assert.throws(()=>beforeNativeSceneRestoration(current+'\n'+h.text),h.guard);}
 const unrelated=current+'\n// unrelated restoration source drift\n';assert.ok(beforeNativeSceneRestoration(unrelated).endsWith('// unrelated restoration source drift\n'));assert.notEqual(hash(beforeNativeSceneRestoration(unrelated)),integrationArchive.sourceHash);
});
integrationCheck('actual World cached restoration host preserves live arrays and selected method receivers',()=>{
 const w=makeSimWorld('warrior',33711),getHost=Reflect.get(w,'nativeSceneRestorationHost') as ()=>core.NativeSceneRestorationHost,host=getHost.call(w);assert.equal(getHost.call(w),host);assert.equal(Object.getOwnPropertyDescriptor(w,'nativeSceneRestorationView')?.enumerable,false);
 assert.equal(host.actors,w.actors);assert.equal(host.texts,w.texts);assert.equal(host.tethers,w.tethers);assert.equal(host.flashes,w.flashes);assert.equal(host.seats,w.seats);
 const nativeText=w.text,events:string[]=[];w.text=function(...args:Parameters<World['text']>){assert.equal(this,w);events.push('selected');return nativeText.apply(this,args);};const selected=host.text;w.text=function(...args:Parameters<World['text']>){assert.equal(this,w);events.push('live');return nativeText.apply(this,args);};selected(vec(10,10),'selected','#abc');host.text(vec(20,20),'live','#abc');assert.deepEqual(events,['selected','live']);w.text=nativeText;
 const old=w.flashes,newFlashes:World['flashes']=[];w.flashes=newFlashes;nativeCall(w,'grantAbsorb',w.player,20,3);assert.equal(host.flashes,newFlashes);assert.equal(newFlashes.length,1);assert.equal(old.length,0);assert.notEqual(newFlashes[0].pos,w.player.pos);assert.deepEqual(newFlashes[0].pos,w.player.pos);
 const newTexts:World['texts']=[];w.texts=newTexts;nativeCall(w,'seatText',w.player,vec(30,30),'new store','#abc');assert.equal(host.texts,newTexts);assert.equal(newTexts[0].text,'new store');
});
integrationCheck('actual World chained heal appends raw arcs to live queues and preserves partial failures',()=>{
 const w=makeSimWorld('warrior',33713),c=w.player,a=new Actor('first heal target','player',vec(500,500)),b=new Actor('second heal target','player',vec(530,500));a.owner=c;b.owner=c;w.actors.push(a,b);c.life=c.maxLife();a.life=a.maxLife()*.5;b.life=1;const def=Object.values(SKILLS).find(d=>d.effects.some(f=>f.type==='heal'))!,inst=makeSkillInstance(def,6),initial=w.tethers,heal=Reflect.get(w,'applyHeal') as Function;
 let first=true;const replacement:World['tethers']=[];Reflect.set(w,'applyHeal',function(this:World,...args:any[]){assert.equal(this,w);const value=heal.apply(this,args);if(first){first=false;this.tethers=replacement;}return value;});nativeCall(w,'applyHealChained',c,inst,a,{amount:10,chain:1},1,true);assert.equal(initial.length,0);assert.equal(w.tethers,replacement);assert.equal(replacement.length,1);assert.equal(replacement[0].a,a);assert.equal(replacement[0].b,b);assert.equal(replacement[0].owner,c);Reflect.set(w,'applyHeal',heal);
 const frozen=Object.freeze([]) as unknown as World['tethers'];w.tethers=frozen;a.life=a.maxLife()*.5;b.life=1;const prior=a.life;assert.throws(()=>nativeCall(w,'applyHealChained',c,inst,a,{amount:10,chain:1},1,true),/extensible|read only|frozen/i);assert.ok(a.life>prior);assert.equal(b.life,1);assert.equal(w.tethers,frozen);assert.equal(frozen.length,0);
 w.tethers=[];a.life=a.maxLife()*.5;b.life=1;const healBy=b.healBy;b.healBy=function(){assert.equal(this,b);throw Error('actual later mend');};assert.throws(()=>nativeCall(w,'applyHealChained',c,inst,a,{amount:10,chain:1},1,true),/actual later mend/);assert.equal(w.tethers.length,1);assert.equal(w.tethers[0].b,b);b.healBy=healBy;
});
integrationCheck('actual World attribution keeps lazy getters suppressed rows and text-first failure order',()=>{
 const w=makeSimWorld('warrior',33717),root=w.seatOfRoot,text=w.text;let reads=0,calls=0;Object.defineProperty(w,'seatOfRoot',{configurable:true,get(){reads++;return function(this:World,...args:Parameters<World['seatOfRoot']>){assert.equal(this,w);calls++;return root.apply(this,args);};}});
 w.partyRows=null;nativeCall(w,'creditFloat',w.player);w.partyRows=[];nativeCall(w,'creditFloat',w.player);w.text(vec(1,2),'prior','#abc');nativeCall(w,'creditFloat',w.player,null);nativeCall(w,'creditFloat',w.player,'explicit');assert.equal(reads,0);assert.equal(calls,0);
 w.text=function(){assert.equal(this,w);};const rows=w.texts;nativeCall(w,'seatText',w.player,vec(2,3),'suppressed','#def');assert.equal(w.texts,rows);assert.equal(rows.length,1);assert.equal(rows[0].text,'prior');assert.equal(rows[0].seat,w.localSeat.id);assert.equal(reads,1);assert.equal(calls,1);
 w.text=function(){assert.equal(this,w);throw Error('actual text failure');};assert.throws(()=>nativeCall(w,'seatText',w.player,vec(2,3),'failed','#def'),/actual text failure/);assert.equal(reads,1);w.text=text;Reflect.deleteProperty(w,'seatOfRoot');
});
integrationCheck('ordinary World cache cannot pin the census while actual healing arcs pin live endpoints',()=>{
 const w=makeSimWorld('warrior',33719),a=new Actor('first dependency','player',vec(500,500)),b=new Actor('second dependency','player',vec(530,500)),unlinked=new Actor('restoration sentinel','enemy',vec(100,100));a.owner=w.player;b.owner=w.player;w.actors.push(a,b,unlinked);const owned=new Map([['a',a],['b',b],['unlinked',unlinked]]);assert.equal(massDormancyPins(w,owned).size,0);nativeCall(w,'creditFloat',null,null);assert.equal(Object.getOwnPropertyDescriptor(w,'nativeSceneRestorationView')?.enumerable,false);assert.equal(massDormancyPins(w,owned).size,0);
 w.player.life=w.player.maxLife();a.life=a.maxLife()*.5;b.life=1;const inst=makeSkillInstance(Object.values(SKILLS).find(d=>d.effects.some(f=>f.type==='heal'))!,4);nativeCall(w,'applyHealChained',w.player,inst,a,{amount:10,chain:1},1,true);const pins=massDormancyPins(w,owned);assert.ok(pins.has(a));assert.ok(pins.has(b));assert.equal(pins.has(unlinked),false);w.tethers=[];assert.equal(massDormancyPins(w,owned).size,0);
});
const integrationReport={commit:integrationArchive.integrationCommit,status:integrationArchive.integrationStatus,sourceHash:integrationArchive.sourceHash,afterHash:hash(current),checks:integrationChecks,receipt:hash(JSON.stringify(integrationChecks)),boundary:'ordinary actual World state/cache integration evidence; no retained ticking, full combat or publication'};fs.writeFileSync(new URL('./reports/nativerestoration-integration.json',import.meta.url),JSON.stringify(integrationReport,null,2)+'\n');console.log('PASS native restoration integration',integrationReport);
