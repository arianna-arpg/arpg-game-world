import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {nativeExactAnchorArchive as archive,nativeExactAnchorArchiveHash} from './nativeExactAnchorArchive';
import {writeCombatProof} from './probe_nativecombatcycle';
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');assert.equal(hash(JSON.stringify(archive)),nativeExactAnchorArchiveHash);
const lf=(v:string)=>v.replace(/\r\n/g,'\n');let mutations=0,duplicates=0,portable=0,originalBodies=0;
for(const row of archive.rows){
 const current=readFileSync(new URL('../'+row.file,import.meta.url),'utf8');assert.equal(current,row.after);assert.equal(hash(row.before),row.beforeHash);
 const reverse=(value:string)=>{assert.equal(lf(value),lf(row.after),'exact current whole source '+row.file);return row.before;};
 for(const value of [current,lf(current),lf(current).replace(/\n/g,'\r\n')]){assert.equal(reverse(value),row.before);portable++;}
 assert.throws(()=>reverse(current+'\n// unknown\n'));mutations++;assert.throws(()=>reverse(current+current));duplicates++;
 if(row.file.endsWith('nativeGeography.ts')){
  const before=ts.createSourceFile('before.ts',row.before,ts.ScriptTarget.Latest,true),after=ts.createSourceFile('after.ts',current,ts.ScriptTarget.Latest,true);
  for(const node of before.statements){if(ts.isFunctionDeclaration(node)&&node.name){const next=after.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===node.name!.text);assert.ok(next);assert.equal(lf(next.getText(after)),lf(node.getText(before)));originalBodies++;}if(ts.isClassDeclaration(node)){const next=after.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===node.name?.text) as ts.ClassDeclaration;for(const member of node.members){const found=next.members.find(n=>n.name?.getText(after)===member.name?.getText(before)&&n.kind===member.kind);assert.ok(found);assert.equal(lf(found.getText(after)),lf(member.getText(before)));originalBodies++;}}}
 }
 if(row.file.endsWith('probe_nativeareasourcesession.ts'))assert.equal(row.after.replace('mapping.nativeSourcePoint(row.physical)','mapping.nativePoint(row.physical)'),row.before,'only the explicit source-address inverse changes; every old assertion remains');
}
const report={rows:archive.rows.length,originalBodies,mutations,duplicates,portable,archive:nativeExactAnchorArchiveHash};writeCombatProof('native-exact-anchor-source.json',report);console.log(JSON.stringify(report));
