import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {readNativeShardsSeats as readFileSync} from './nativeShardsCompositionFixture';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {nativeShardSeatCompositionArchive as archive} from './nativeShardSeatCompositionArchive';
import {nativeShardSeatsArchive as seats} from './nativeShardSeatsArchive';
import {beforeNativeSeatComposition as project,readNativeSeatsRaw,readNativeKeeperRaw,readNativeArrivalMainCast,readNativeArrivalMainproof} from './nativeShardSeatCompositionFixture';
import {beforeNativeKeeperComposition} from './nativeShardKeeperCompositionFixture';
import {beforeNativeArrivalRaw} from './nativeArrivalCompositionFixture';
import {beforeNativeMainCastSource} from './nativeMainCastSourceFixture';
const hash=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex'),read=(f:string)=>readFileSync(new URL('../'+f,import.meta.url),'utf8'),norm=(s:string)=>s.replace(/\r\n/g,'\n');
function statements(file:string,source:string){const tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);return tree.statements.filter(n=>!ts.isImportDeclaration(n)).map(n=>n.getText(tree));}
let assertions=0,mutations=0,EOL=0;for(const row of [...archive.rows,...seats.rows]){const raw=read(row.file);assert.equal(hash(raw),row.afterHash);assert.equal(project(row.file,raw),row.before);assert.equal(hash(row.before),row.beforeHash);assert.equal(project(row.file,row.before),row.before);for(const text of [norm(raw),norm(raw).replace(/\n/g,'\r\n'),norm(row.before),norm(row.before).replace(/\n/g,'\r\n')]){assert.equal(project(row.file,text),row.before);EOL++;}for(const text of [raw,row.before])for(const at of [0,Math.floor(text.length/2),text.length]){assert.throws(()=>project(row.file,text.slice(0,at)+' unauthorized '+text.slice(at)),/unreviewed|differs/);mutations++;}assert.throws(()=>project(row.file,raw+raw),/unreviewed|differs/);mutations++;assert.equal(project('outside/'+row.file,raw),raw);if(row.file.startsWith('balance/')){assert.deepEqual(statements(row.file,raw),statements(row.file,row.before));const tree=ts.createSourceFile(row.file,raw,ts.ScriptTarget.Latest,true);function visit(n:ts.Node):void{if(ts.isCallExpression(n)&&/^(assert(?:\.|$)|must$|check$)/.test(n.expression.getText(tree)))assertions++;ts.forEachChild(n,visit);}visit(tree);}const url=new URL('../'+row.file,import.meta.url);assert.equal(readNativeSeatsRaw(url,'utf8'),row.before);assert.deepEqual(readNativeSeatsRaw(url),Buffer.from(row.before));assert.equal(readNativeKeeperRaw(url,'utf8'),beforeNativeKeeperComposition(row.file,row.before));}
for(const row of archive.unchanged)assert.equal(hash(readFileSync(new URL('../'+row.file,import.meta.url))),row.sha256);
for(const file of ['src/engine/world.ts','src/worldmass/nativeAreaSceneCombat.ts','src/worldmass/nativeAreaCharacterCreation.ts']){const url=new URL('../'+file,import.meta.url),keeper=beforeNativeKeeperComposition(file,project(file,read(file)));assert.equal(readNativeArrivalMainCast(url,'utf8'),beforeNativeMainCastSource(file,beforeNativeArrivalRaw('production',file,keeper)));assert.deepEqual(readNativeArrivalMainproof(url),Buffer.from(beforeNativeArrivalRaw('mainproof',file,keeper)));}
const binary=new URL('./reports/seats-binary.bin',import.meta.url),bytes=Buffer.from([0,255,13,10,128,254,0]);mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});writeFileSync(binary,bytes);assert.deepEqual(readNativeSeatsRaw(binary),bytes);assert.deepEqual(readNativeKeeperRaw(binary),bytes);assert.deepEqual(readNativeArrivalMainproof(binary),bytes);
console.log(JSON.stringify({readers:archive.rows.length,runtimeParents:seats.rows.length,assertions,mutations,EOL,untouched:archive.unchanged.length,exactInnerKeeperAndArrival:true}));

// The prior current-source helper is retained byte-for-byte; only its read binding is composed.
const oldHosted=ts.createSourceFile('old.ts',read('balance/nativeHostedPublicationFixture.ts'),ts.ScriptTarget.Latest,true),newHosted=ts.createSourceFile('new.ts',read('balance/nativeShardSeatCompositionFixture.ts'),ts.ScriptTarget.Latest,true);
const body=(tree:ts.SourceFile)=>tree.statements.find((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&n.name?.text==='currentNativeHostedSource')!.body!.getText(tree);
assert.equal(body(newHosted).replace('readNativeArrivalMainCast','readFileSync'),body(oldHosted),'unchanged exact current-source body with finite outer read binding');
