import assert from 'node:assert/strict';
import * as fs from './nativeHostClosureFS';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import * as fixture from './nativeMainHostCompositionFixture';
import {nativeMainHostCompositionArchive as archive,type NativeMainHostSourceLane} from './nativeMainHostCompositionArchive';
const hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex'),normal=(text:string)=>text.replace(/\r\n?/g,'\n'),read=(file:string)=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
let rows=0,mutations=0,duplicates=0,eol=0,wrongFiles=0,rawReads=0,assertions=0;
for(const [name,entries]of Object.entries(archive.lanes)){
 const lane=name as NativeMainHostSourceLane,project=(file:string,text:string)=>fixture.beforeNativeMainHostComposition(lane,file,text),symbol=name.split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join(''),rawReader=(fixture as unknown as Record<string,typeof fs.readFileSync>)['readNativeMainHost'+symbol];
 for(const row of entries){const source=read(row.file),before=project(row.file,source);assert.equal(hash(source),row.rawAfterHash);assert.equal(hash(before),row.rawBeforeHash);assert.equal(project(row.file,before),before);rows++;
  for(const variant of [normal(source),normal(source).replace(/\n/g,'\r\n'),normal(before),normal(before).replace(/\n/g,'\r\n')]){assert.equal(project(row.file,variant),before);eol++;}
  for(const version of [source,before])for(const at of [0,Math.floor(version.length/2),version.length]){assert.throws(()=>project(row.file,version.slice(0,at)+' unauthorized '+version.slice(at)),/exact reviewed predecessor/);mutations++;}
  assert.throws(()=>project(row.file,source+source),/exact reviewed predecessor/);duplicates++;assert.equal(project('outside/'+row.file,source),source);
  const other=entries.find(r=>r.file!==row.file&&r.afterHash!==row.afterHash&&r.beforeHash!==row.afterHash);if(other){assert.throws(()=>project(other.file,source),/exact reviewed predecessor/);wrongFiles++;}
  const file=new URL('../'+row.file,import.meta.url);assert.equal(rawReader(file,'utf8'),before);assert.equal(rawReader(file,'utf-8'),before);assert.deepEqual(rawReader(file),Buffer.from(before));rawReads+=3;
 }
}
for(const row of archive.readers){const source=read(row.file);assert.equal(hash(source),row.afterHash);let before=source;for(const edit of [...row.edits].reverse()){assert.equal(before.split(edit.after).length,2);before=before.replace(edit.after,edit.before);}assert.equal(hash(before),row.beforeHash,'Complete original reader '+row.file);
 const tree=ts.createSourceFile(row.file,source,ts.ScriptTarget.Latest,true),nonImports=tree.statements.filter(n=>!ts.isImportDeclaration(n)).map(n=>n.getText(tree)),calls:string[]=[];assert.equal(hash(JSON.stringify(nonImports)),row.nonImportHash);function visit(n:ts.Node):void{if(ts.isCallExpression(n)&&/^(assert(?:\.|$)|must$|check$)/.test(n.expression.getText(tree)))calls.push(n.getText(tree));n.forEachChild(visit);}visit(tree);assert.equal(calls.length,row.assertions);assert.equal(hash(JSON.stringify(calls)),row.assertionHash);assertions+=calls.length;
}
for(const row of archive.archives)assert.equal(hash(fs.readFileSync(new URL('../'+row.file,import.meta.url))),row.sha256,'Original historical archive '+row.file);
for(const row of archive.runtime)assert.equal(hash(fs.readFileSync(new URL('../'+row.file,import.meta.url))),row.sha256,'Actual combined runtime is untouched '+row.file);
assert.throws(()=>fixture.beforeNativeMainHostComposition('unknown' as NativeMainHostSourceLane,'outside','text'),/Unknown/);
const binary=new URL('./reports/native-main-host-composition.bin',import.meta.url),bytes=Buffer.from([0,255,13,10,128,254]);fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(binary,bytes);for(const name of Object.keys(archive.lanes)){const symbol=name.split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join(''),reader=(fixture as unknown as Record<string,typeof fs.readFileSync>)['readNativeMainHost'+symbol];assert.deepEqual(reader(binary),bytes);assert.equal(reader(binary,'utf8'),bytes.toString('utf8'));}
const result={lanes:Object.keys(archive.lanes).length,rows,mutations,duplicates,wrongFiles,eol,rawReads,readers:archive.readers.length,assertions,archives:archive.archives.length,actualRuntime:archive.runtime.length,unknownLaneRefused:true,unrelatedBinaryPreserved:true};fs.writeFileSync(new URL('./reports/native-main-host-composition-source.json',import.meta.url),JSON.stringify({result,receipt:hash(JSON.stringify(result))},null,2)+'\n');console.log(JSON.stringify(result));
