import {Actor} from '../src/engine/actor';
import {beforeNativeArrivalActorSlots,nativeArrivalUnusedActorSlots,assertNativeArrivalActorSlots} from './nativeCaravanArrivalReceiptFixture';
import {beforeNativeTitanActorSlots} from './nativeTitanReceiptFixture';
import {readFileSync as readCurrentSource} from 'node:fs';
/** Strict comparison reversals; full native receipts remain pinned in their three probes. */
import assert from 'node:assert/strict';
import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';
import ts from 'typescript';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {SKILLS} from '../src/data/skills';
import {isDoodadGround, regionIds} from '../src/world/regions';
import {historicalCleaveArchive} from './nativeHistoricalCleaveArchive';
import {assertHistoricalCleaveSource, beforeHistoricalCleaveReceipt as reverse} from './nativeHistoricalCleaveReceipt';
import {assertHistoricalArrivalPolicy} from './nativeHistoricalArrivalPolicy';
import {historicalConcealmentArchive} from './nativeHistoricalConcealmentArchive';
import {assertHistoricalConcealmentSource, beforeHistoricalArrivalGrounds} from './nativeHistoricalArrivalGrounds';

const read=(p:string)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const canon=(s:string)=>s.replaceAll('\r\n','\n');
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const refusals:string[]=[];
function refuses(label:string, fn:()=>unknown){assert.throws(fn,label);refusals.push(label);}
const skills=read('src/data/skills.ts'), regions=read('src/world/regions.ts');
assertHistoricalCleaveSource(skills);
assertHistoricalConcealmentSource(regions);
for(const [label,replacement] of Object.entries({old:historicalCleaveArchive.before,body:historicalCleaveArchive.after.replace('manaCost: 2','manaCost: 3'),duplicate:historicalCleaveArchive.after+',\n'+historicalCleaveArchive.after})){
 refuses('Cleave source '+label,()=>assertHistoricalCleaveSource(skills.replace(historicalCleaveArchive.after,replacement)));
}
for(const [label,replacement] of Object.entries({old:historicalConcealmentArchive.before.brush,body:historicalConcealmentArchive.after.brush.replace("'concealed'","'mired'"),duplicate:historicalConcealmentArchive.after.brush+'\n'+historicalConcealmentArchive.after.brush})){
 refuses('concealment source '+label,()=>assertHistoricalConcealmentSource(regions.replace(historicalConcealmentArchive.after.brush,replacement)));
}
refuses('ground classifier body',()=>assertHistoricalConcealmentSource(regions.replace('return !!(r?.walkable','return !!(false && r?.walkable')));

// Use the exact receipt serializer already employed by the native arrival probe.
const arrival=read('balance/probe_nativescenearrival.ts');
const source=ts.createSourceFile('arrival.ts',arrival,99,true);
const serializers=source.statements.filter((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&n.name?.text==='snap');
assert.equal(serializers.length,1);
const serializer=ts.transpileModule(serializers[0].getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const snap=Function(serializer+';return snap;')() as (value:any)=>any;
const originalCleave=Function('STARTER_SKILL_TREES','return ({'+historicalCleaveArchive.before+'}).cleave;')({cleave:SKILLS.cleave.tree});
const sample=snap(SKILLS.cleave), expected=snap(originalCleave), expectedHash=hash(expected);
assert.deepEqual(reverse(sample),expected,'exact original ordered Cleave receipt');
assert.equal(JSON.stringify(reverse(sample)),JSON.stringify(expected),'exact original property order');
for(const [label,mutant] of Object.entries({description:{...sample,description:'unknown'},castMove:{...sample,castMove:0},castAim:{...sample,castAim:'locked'},addition:{...sample,unreviewed:1},manaCost:{...sample,manaCost:3},damage:{...sample,baseDamage:{physical:[9,14]}},tree:{...sample,tree:{...sample.tree,unreviewed:999}}})){
 refuses('ordinary receipt '+label,()=>assert.equal(hash(reverse(mutant)),expectedHash));
}
// A controlled native-codec-shaped container isolates helper rejection behavior.
// Complete real actor-codec receipts are compared by probe_nativescenehistory.
const packed={kind:'object',entries:Object.entries(sample)}, packedExpected={kind:'object',entries:Object.entries(expected)};
assert.deepEqual(reverse(packed),packedExpected);
for(const [label,entry] of Object.entries({override:['castAim','locked'],addition:['unknownField',1],duplicateId:['id','cleave'],duplicateDescription:['description',sample.description],duplicateDamage:['baseDamage',sample.baseDamage]})){
 refuses('packed receipt '+label,()=>assert.equal(hash(reverse({...packed,entries:[...packed.entries,entry]})),hash(packedExpected)));
}

const bytes=arrival.match(/const archiveBytes\s*=\s*gunzipSync\(Buffer.from\('([^']+)'/);assert.ok(bytes);
const cfg=JSON.parse(gunzipSync(Buffer.from(bytes[1],'base64')).toString()).cfg as string;
const world=read('src/engine/world.ts'), rules=read('src/engine/nativePopulationRules.ts');
assertHistoricalArrivalPolicy(world,rules,cfg);
assertHistoricalArrivalPolicy(cfg,rules,cfg);
refuses('arrival policy duplicate',()=>assertHistoricalArrivalPolicy(world,rules.replace(cfg,cfg+'\n'+cfg),cfg));
refuses('arrival policy body',()=>assertHistoricalArrivalPolicy(world,rules.replace('export '+cfg,'export '+cfg.replace('300','301')),cfg));
refuses('arrival policy import',()=>assertHistoricalArrivalPolicy(world.replace("'./nativePopulationRules'","'./unreviewedPolicy'"),rules,cfg));

const changed=new Set(['brush','reeds','berry_bush']), ground=regionIds().find(id=>isDoodadGround(id)&&!changed.has(id)), scenery=regionIds().find(id=>!isDoodadGround(id));assert.ok(ground&&scenery);
// Controlled complete index with all three changed kinds and retained ordinary ground.
// Prefix references exercise map/set/function/undefined/nonfinite reference accounting.
const doodads=[...changed,ground,scenery].map((kind,index)=>({kind,pos:{x:index*13,y:7},radius:9}));
const live={prefix:new Map([[{key:1},new Set([undefined,Infinity,()=>0])]]),doodads,grounds:doodads.filter(d=>isDoodadGround(d.kind)),actors:[{life:19,pos:{x:3,y:4}}]};
const state=snap(live), originalState={...state,grounds:state.grounds.slice(3)};
const rows=[{before:state,after:structuredClone(state)}], expectedRows=[{before:originalState,after:structuredClone(originalState)}];
assert.deepEqual(beforeHistoricalArrivalGrounds(rows),expectedRows);
const expectedRowsHash=hash(expectedRows);
const mutations:Record<string,(v:any)=>void>={missing:v=>v[0].before.grounds.shift(),duplicate:v=>v[0].before.grounds.push(v[0].before.grounds[0]),reference:v=>v[0].before.grounds[0].$ref++,doodad:v=>v[0].before.doodads[0].radius++,actor:v=>v[0].before.actors[0].life++,addition:v=>v[0].before.unknownTerrainField=1};
for(const [label,mutate] of Object.entries(mutations)){const copy=structuredClone(rows);mutate(copy);refuses('arrival receipt '+label,()=>assert.equal(hash(beforeHistoricalArrivalGrounds(copy)),expectedRowsHash));}
assert.deepEqual(rows,[{before:state,after:structuredClone(state)}],'comparison helpers never mutate raw receipts');

const actor=new Actor('inline receipt witness','enemy',{x:0,y:0});
assertNativeArrivalActorSlots(readCurrentSource(new URL('../src/engine/actor.ts',import.meta.url),'utf8'));
const omitted=new Set<string>(nativeArrivalUnusedActorSlots.map(s=>s.name));
const prior=Object.fromEntries(Object.entries(actor).filter(([key])=>!omitted.has(key)));
const arrivalState=(body:unknown)=>({actors:[body],doodads:[],grounds:[],sameActor:body,tail:new Set([1,2])});
const currentArrival=[{before:snap(arrivalState(actor)),after:snap(arrivalState(actor))}];
const expectedArrival=[{before:snap(arrivalState(prior)),after:snap(arrivalState(prior))}];
assert.deepEqual(beforeNativeArrivalActorSlots(currentArrival),expectedArrival,'arrival removes only four exact unused slots and remaps later references');
const titanState=(body:unknown)=>({runtime:{sources:new Map([['source',body]]),heads:new Map([['head',body]]),pieces:new Map()},actors:[body],doodads:[{contactSource:body}],bridges:[],grounds:[],regrowing:[],flashes:[],shake:0,hazards:[],field:{},ledger:{},messages:[]});
const currentTitan={stages:[{state:snap(titanState(actor))}]},expectedTitan={stages:[{state:snap(titanState(prior))}]};
assert.deepEqual(beforeNativeTitanActorSlots(currentTitan),expectedTitan,'Titan census/controller/contact references retain the same actor');
for(const slot of nativeArrivalUnusedActorSlots){const bad=structuredClone(currentArrival);bad[0].before.actors[0][slot.name]=true;refuses('active inline actor '+slot.name,()=>beforeNativeArrivalActorSlots(bad));}
const alias=snap({...arrivalState(actor),borrowed:actor.resourceFlows});refuses('aliased removed inline array',()=>beforeNativeArrivalActorSlots([{before:alias,after:alias}]));
const changedActor=structuredClone(currentArrival);changedActor[0].before.actors[0].life++;assert.notEqual(hash(beforeNativeArrivalActorSlots(changedActor)),hash(expectedArrival),'unexplained gameplay change survives projection');

const provenance=process.argv.includes('--provenance');
if(provenance){
 const git=(ref:string,p:string)=>canon(execFileSync('git',['show',ref+':'+p],{encoding:'utf8',maxBuffer:32e6}));
 function cleave(text:string){const sf=ts.createSourceFile('skills.ts',text,99,true),found:string[]=[];const walk=(n:ts.Node):void=>{if(ts.isVariableDeclaration(n)&&n.name.getText(sf)==='SKILLS'&&n.initializer&&ts.isObjectLiteralExpression(n.initializer))for(const row of n.initializer.properties)if(row.name?.getText(sf)==='cleave')found.push(row.getText(sf));ts.forEachChild(n,walk);};walk(sf);assert.equal(found.length,1);return found[0];}
 assert.equal(cleave(git(historicalCleaveArchive.commit+'^','src/data/skills.ts')),historicalCleaveArchive.before);
 assert.equal(cleave(git(historicalCleaveArchive.commit,'src/data/skills.ts')),historicalCleaveArchive.after);
 for(const [version,ref] of [['before',historicalConcealmentArchive.commit+'^'],['after',historicalConcealmentArchive.commit]] as const){const text=git(ref,'src/world/regions.ts');for(const row of Object.values(historicalConcealmentArchive[version]))assert.ok(text.includes(row),'immutable concealment '+version);}
 assertHistoricalArrivalPolicy(git('80d896af','src/engine/world.ts'),rules,cfg);
}
const report={provenance,refused:refusals.length,refusals,cleaveCommit:historicalCleaveArchive.commit,concealmentCommit:historicalConcealmentArchive.commit};
fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./reports/native-historical-receipts.json',import.meta.url),JSON.stringify(report,null,2));
console.log('PASS historical receipt maintenance: '+refusals.length+' mutation refusals; exact source, ordered payload and native ground-index checks'+(provenance?'; immutable Git provenance.':'.'));
