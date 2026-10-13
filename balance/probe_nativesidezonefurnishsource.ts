import {beforeNativeJourney as projectJourney} from './nativeJourneyCompositionFixture';
import ts from 'typescript';
import assert from 'node:assert/strict';
import {readNativeArrivalMainCast as readFileSync} from './nativeArrivalCompositionFixture';
import {createHash} from 'node:crypto';
import {nativeSidezoneFurnishArchive as archive} from './nativeSidezoneFurnishArchive';
import {beforeNativeSidezoneFurnish as project} from './nativeSidezoneFurnishFixture';
import {writeCombatProof} from './probe_nativecombatcycle';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');let mutations=0,duplicates=0,portable=0,outside=0;
for(const row of archive.rows){const source=projectJourney('pit58',row.file,readFileSync(new URL('../'+row.file,import.meta.url),'utf8')).replaceAll('\r\n','\n'),run=(s:string)=>project(row.file,s);assert.equal(hash(source),row.afterHash,'whole current source');assert.equal(hash(run(source)),row.beforeHash,'whole frozen source');let n=0;for(const x of [source,source.replaceAll('\n','\r\n'),source.replace(/\n/g,()=>++n%2?'\r\n':'\n')]){assert.equal(hash(run(x)),row.beforeHash);portable++;}for(const h of row.hunks){const bad=source.replace(h.after,h.after.replace(/\S/,'!'));assert.notEqual(bad,source);assert.throws(()=>run(bad),/exact hunk refused/);mutations++;assert.throws(()=>run(source.replace(h.after,h.after+h.after)),/exact hunk refused/);duplicates++;}const extra='\n// unexplained source must remain visible\n';assert.equal(run(source+extra),run(source)+extra);assert.notEqual(hash(run(source+extra)),row.beforeHash);outside++;}

const layoutFile='src/engine/nativeAreaLayout.ts',layoutSource=projectJourney('pit58',layoutFile,readFileSync(new URL('../'+layoutFile,import.meta.url),'utf8')),old=project(layoutFile,layoutSource);
const parse=(s:string)=>ts.createSourceFile('layout.ts',s,ts.ScriptTarget.Latest,true),oldTree=parse(old),newTree=parse(layoutSource),printer=ts.createPrinter({removeComments:true});
function collect(tree:ts.Node,pred:(n:ts.Node)=>boolean){const found:ts.Node[]=[];function walk(n:ts.Node){if(pred(n))found.push(n);ts.forEachChild(n,walk);}walk(tree);return found;}
const oldArrow=collect(oldTree,n=>ts.isVariableDeclaration(n)&&n.name.getText(oldTree)==='mouthSeat')[0] as ts.VariableDeclaration;assert(oldArrow&&oldArrow.initializer&&ts.isArrowFunction(oldArrow.initializer));
const sharedSeat=newTree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='nativeLayoutMouthSeat') as ts.FunctionDeclaration,sharedRecord=newTree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='nativeRegisteredSidezoneMouth') as ts.FunctionDeclaration;
const ret=(n:ts.FunctionDeclaration)=>(n.body!.statements.find(ts.isReturnStatement))!.expression!;
const print=(n:ts.Node,tree:ts.SourceFile)=>printer.printNode(ts.EmitHint.Unspecified,n,tree);
assert.equal(print(oldArrow.initializer.body,oldTree),print(ret(sharedSeat),newTree),'exact original position expression');
const oldRecord=collect(oldTree,n=>ts.isObjectLiteralExpression(n)&&n.properties.some(p=>p.name?.getText(oldTree)==='mouthTier')&&n.properties.some(p=>p.name?.getText(oldTree)==='roof'))[0];assert(oldRecord);assert.equal(print(oldRecord,oldTree),print(ret(sharedRecord),newTree),'exact original mouth record');
const result={parent:archive.parent,files:archive.rows.length,mutations,duplicates,portable,outside,sharedNativeExpressions:2,rows:archive.rows.map(r=>({file:r.file,before:r.beforeHash,after:r.afterHash,hunks:r.hunks.length}))},report={scope:'Five exact runtime successors and two declared historical reader adapters; whole frozen sources, original native bodies and assertions reconstructed without accepting unrelated edits.',result,receipt:hash(JSON.stringify(result))};writeCombatProof('native-sidezone-furnish-source.json',report);console.log(JSON.stringify(report));
