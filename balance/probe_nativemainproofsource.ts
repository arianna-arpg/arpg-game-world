import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {readNativeArrivalMainproof as readFileSync} from './nativeArrivalCompositionFixture';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {nativeMainProofSourceArchive as archive,nativeMainProofSourceArchiveHash} from './nativeMainProofSourceArchive';
import {beforeNativeMainProofSource as project} from './nativeMainProofSourceFixture';
const lf=(s:string)=>s.replace(/\r\n?/g,'\n'),hash=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
const git=(ref:string,file:string)=>execFileSync('git',['show',ref+':'+file],{encoding:'utf8',maxBuffer:30e6,windowsHide:true});
const read=(file:string)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
assert.equal(hash(JSON.stringify(archive)),nativeMainProofSourceArchiveHash);
assert.equal(archive.rows.length,21);assert.equal(new Set(archive.rows.map(r=>r.lane+'\0'+r.file)).size,21);
assert.deepEqual([...new Set(archive.rows.map(r=>r.lane))],['content','visual-source','visual-parity','summon']);
let variants=0,mutations=0,duplicates=0,outside=0,idempotence=0;
for(const row of archive.rows){
 const before=archive.blobs[row.beforeHash],after=archive.blobs[row.afterHash],run=(source:string)=>project(row.lane,row.file,source);
 assert.equal(before,lf(git(row.beforeCommit,row.file)),'exact committed predecessor');assert.equal(after,lf(git(archive.baseCommit,row.file)),'exact committed current source');assert.equal(lf(read(row.file)),after);
 assert.equal(hash(before),row.beforeHash);assert.equal(hash(after),row.afterHash);assert.equal(run(after),before);assert.equal(run(before),before);assert.equal(run(run(after)),before);idempotence++;
 for(const source of [before,after]){
  let line=0;for(const formatted of [source,source.replaceAll('\n','\r\n'),source.replace(/\n/g,()=>++line%2?'\r\n':'\n'),source.replaceAll('\n','\r')]){assert.equal(run(formatted),before);variants++;}
  // Exact admission covers each 4 KiB region, including start/middle/end; this
  // also tests identity rows and already-reconstructed historical input.
  const offsets=new Set([0,Math.floor(source.length/2),source.length-1]);for(let i=4096;i<source.length;i+=4096)offsets.add(i);
  for(const index of offsets){const changed=source.slice(0,index)+(source[index]==='!'?'?':'!')+source.slice(index+1);assert.notEqual(changed,source);assert.throws(()=>run(changed),/Exact native main proof predecessor refused/);mutations++;}
  for(const doubled of [source+source,source.slice(0,source.length/2)+source+source.slice(source.length/2)]){assert.throws(()=>run(doubled),/Exact native main proof predecessor refused/);duplicates++;}
  for(const alien of [source+'\n// unknown change\n','// unknown change\n'+source]){assert.throws(()=>run(alien),/Exact native main proof predecessor refused/);outside++;}
 }
 assert.throws(()=>project('unknown',row.file,after),/Unknown native main proof predecessor/);
 assert.throws(()=>project(row.lane,'src/not-reviewed.ts',after),/Unknown native main proof predecessor/);
}
const assertionTexts=(text:string)=>{const source=ts.createSourceFile('reader.ts',text,ts.ScriptTarget.Latest,true),found:string[]=[];function walk(n:ts.Node){if(ts.isCallExpression(n)&&(n.expression.getText(source)==='assert'||n.expression.getText(source).startsWith('assert.')))found.push(n.getText(source));n.forEachChild(walk);}walk(source);return found;};
const helperText=read(archive.historicalHelperFile.file),helperAst=ts.createSourceFile('helpers.ts',helperText,ts.ScriptTarget.Latest,true);assert.equal(hash(helperText),archive.historicalHelperFile.sha256);
const helperRows=[];for(const row of archive.historicalHelpers){
 assert.equal(lf(git(row.beforeCommit,row.file)),row.source);assert.equal(hash(row.source),row.sourceHash);
 const old=ts.createSourceFile(row.file,row.source,ts.ScriptTarget.Latest,true),oldFn=old.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===row.name) as ts.FunctionDeclaration;assert(oldFn);assert.equal(oldFn.getText(old),row.functionSource);
 const found:ts.FunctionDeclaration[]=[];function find(n:ts.Node){if(ts.isFunctionDeclaration(n)&&n.name?.text===row.name)found.push(n);n.forEachChild(find);}find(helperAst);assert.equal(found.length,1);assert.equal(found[0].getText(helperAst),row.functionSource.replace(/^export /,''),'exact complete original pure helper function');
 assert.equal(hash(lf(read(row.archiveFile))),row.archiveHash);assert.equal(lf(read(row.archiveFile)),lf(git(row.beforeCommit,row.archiveFile)));
 assert.equal(read(row.file),git(archive.baseCommit,row.file),'shared current helper unchanged');
 helperRows.push({file:row.file,name:row.name,commit:row.beforeCommit,sourceHash:row.sourceHash,functionHash:hash(row.functionSource)});
}
assert.equal(helperRows.length,3);
const readers=[];for(const row of archive.readers){const current=read(row.file),before=git(archive.baseCommit,row.file);assert.equal(hash(current),row.afterHash);assert.equal(hash(before),row.beforeHash);assert(current.startsWith(row.prefix));let recovered=current.slice(row.prefix.length);for(const edit of [...row.edits].reverse()){assert.equal(recovered.split(edit.after).length,2,'one explicit new read boundary');recovered=recovered.replace(edit.after,edit.before);}assert.equal(recovered,before,'full original reader recovered byte-for-byte');assert.equal(hash(recovered),row.beforeHash);assert.deepEqual(assertionTexts(current),assertionTexts(before),'every original assertion AST text unchanged');readers.push({file:row.file,originalHash:row.beforeHash,assertions:assertionTexts(before).length,reads:row.edits.filter(edit=>!edit.before.startsWith('import ')).length,historicalHelperImports:row.edits.filter(edit=>edit.before.startsWith('import ')).length});}
for(const row of archive.archives){const actual=readFileSync(new URL('../'+row.file,import.meta.url));assert.equal(hash(actual),row.sha256,'unchanged original archive '+row.file);assert.equal(actual.toString(),git(archive.baseCommit,row.file));}
const result={base:archive.baseCommit,archiveHash:nativeMainProofSourceArchiveHash,rows:archive.rows.length,blobs:Object.keys(archive.blobs).length,variants,mutations,duplicates,outside,idempotence,readers,helperRows,unchangedArchives:archive.archives.length},report={scope:'Exact committed current/predecessor source gates at seven explicit reader boundaries only. Complete original readers and every assertion remain byte-for-byte recoverable; original gameplay executes current native runtime. Strict unknown/duplicate/EOL/idempotence/outside controls cover current and prior input.',result,receipt:hash(JSON.stringify(result))};mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});writeFileSync(new URL('./reports/native-main-proof-source.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
