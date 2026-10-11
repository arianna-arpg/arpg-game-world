/** Narrow historical normalization must prove, never conceal, intentional main behavior ports. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {nativeMainContentArchive as archive,nativeMainContentArchiveHash} from './nativeMainContentArchive';
import {beforeNativeMainContent,beforeNativeMainContentOnly} from './nativeMainContentFixture';
import {nativeSceneProgressionArchive as progressionArchive} from './nativeSceneProgressionArchive';
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
const parse=(text:string)=>ts.createSourceFile('world.ts',text,99,true);
const classOf=(sf:ts.SourceFile)=>sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
const emit=(text:string)=>ts.transpileModule(text,{compilerOptions:{target:99,module:99,removeComments:true}}).outputText;
const source=fs.readFileSync(new URL('../src/engine/world.ts',import.meta.url),'utf8').replaceAll('\r\n','\n');
assert.equal(hash(JSON.stringify(archive)),nativeMainContentArchiveHash);
assert.deepEqual(archive.rows.map(r=>r.name),['pendingRepeats','executeSkill','layFissure','dropLingerField','updateRepeats','updateZones','expireZone','maddenBanks','maddenBankOf']);
assert.deepEqual(archive.declarations.map(r=>r.name),['Zone','MaddenBank','MADDEN_CFG']);
const normalized=beforeNativeMainContent(source),sf=parse(normalized),cl=classOf(sf);
for(const row of archive.rows){const member=cl.members.find(m=>m.name?.getText(sf)===row.name);assert.equal(member?.getText(sf)??null,row.before,'exact archived integration restoration '+row.name);}
for(const row of [...archive.rows,...archive.declarations]){
 let checked=row.after;
 if(!source.includes(checked)){
  // The original main expiry moved into the exactly checked progression core.
  // Require its exact delegate AND its original body; never skip the mutation.
  assert.equal(row.name,'expireZone','only the reviewed expiry was extracted');
  const moved=progressionArchive.rows.find(r=>r.name===row.name)!;
  assert.equal(moved.before,row.after,'same main expiry lineage');checked=moved.after;
  const original=parse('class X{'+row.after+'}'),method=(original.statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration;
  const body=method.body!,start=body.getStart(original),edits:{start:number;end:number}[]=[];
  const visit=(n:ts.Node)=>{if(n.kind===ts.SyntaxKind.ThisKeyword)edits.push({start:n.getStart(original)-start,end:n.end-start});ts.forEachChild(n,visit);};visit(body);
  let expected=body.getText(original);for(const e of edits.reverse())expected=expected.slice(0,e.start)+'nativeHost'+expected.slice(e.end);
  const core=parse(fs.readFileSync(new URL('../src/engine/nativeSceneProgression.ts',import.meta.url),'utf8').replaceAll('\r\n','\n'));
  const fn=core.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='sceneExpireZone') as ts.FunctionDeclaration;
  assert.equal(fn.body!.getText(core),expected,'exact relocated main expiry body');
 }
 assert.ok(source.includes(checked),'actual checked World member '+row.name);
 assert.throws(()=>beforeNativeMainContent(source.replace(checked,checked.slice(0,-1)+'/* altered checked member */'+checked.slice(-1))),'changed candidate refuses '+row.name);
}
// An unlisted member survives normalization. Older whole-class guards still see it.
const current=parse(source),close=classOf(current).end-1,alien=source.slice(0,close)+'\n private unlistedParityMutation=123;\n'+source.slice(close);
assert.ok(beforeNativeMainContent(alien).includes('private unlistedParityMutation=123;'));
// Reapply the exact main Git patch to the immutable integration source in memory.
function replay(text:string,patch:string):string {
 const lines=patch.split('\n');let old:string[]=[],next:string[]=[],active=false;
 const flush=()=>{if(!active)return;const from=old.join('\n')+'\n',to=next.join('\n')+'\n',at=text.indexOf(from);assert.ok(at>=0,'main hunk matches integration');assert.equal(text.indexOf(from,at+1),-1,'main hunk has one location');text=text.slice(0,at)+to+text.slice(at+from.length);old=[];next=[];};
 for(const line of lines){if(line.startsWith('@@')){flush();active=true;continue;}if(!active)continue;if(line[0]===' '){old.push(line.slice(1));next.push(line.slice(1));}else if(line[0]==='-')old.push(line.slice(1));else if(line[0]==='+')next.push(line.slice(1));}
 flush();return text;
}
if(process.argv.includes('--provenance')){
 const gitRoot=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();
 const git=(args:string[])=>execFileSync('git',args,{cwd:gitRoot,encoding:'utf8',maxBuffer:20e6}).replaceAll('\r\n','\n');
 const original=git(['show',archive.beforeRef+':src/engine/world.ts']);assert.equal(hash(original),archive.beforeSourceHash,'Git integration source');
 const patch=git(['diff','--binary',archive.mergeBase,archive.mainRef,'--','src/engine/world.ts']);assert.equal(patch,archive.worldPatch,'exact main-only Git patch');
 const rebuilt=replay(original,patch);assert.equal(hash(rebuilt),archive.candidateSourceHash,'only original main hunks produce candidate');
 const rebuiltSf=parse(rebuilt),rebuiltCl=classOf(rebuiltSf);assert.equal(hash(JSON.stringify(rebuiltCl.members.map(m=>m.getText(rebuiltSf)))),archive.candidateClassHash);
 const restored=beforeNativeMainContentOnly(rebuilt),restoredSf=parse(restored),restoredCl=classOf(restoredSf);assert.equal(hash(JSON.stringify(restoredCl.members.map(m=>m.getText(restoredSf)))),archive.beforeClassHash,'old class receipt restored');
 assert.equal(emit(restored),emit(original),'complete original executable, imports and declarations restored');
}
console.log('PASS main-content strict member/declaration normalization, refusal guards and unlisted-mutation visibility'+(process.argv.includes('--provenance')?' with exact Git provenance':''));
